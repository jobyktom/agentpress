import { Router } from 'express';
import { createHash } from 'node:crypto';
import { one, all, run, now, parse } from '../db.js';
import { adapters } from '../channels/index.js';
import { handleIncoming, convOut, msgOut, log } from '../service.js';
import { sse } from '../bus.js';

export const pub = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Simple per-IP rate limit for unauthenticated endpoints.
const hits = new Map();
function limit(max = 30, windowMs = 60000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.route?.path}`;
    const t = Date.now();
    const arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many messages, slow down a little.' });
    arr.push(t); hits.set(key, arr);
    next();
  };
}

const liveAgent = (aid) => one('SELECT * FROM agents WHERE id = ?', aid);
const webchatEnabled = (aid) => one("SELECT enabled FROM channels WHERE agent_id = ? AND type = 'webchat'", aid)?.enabled;

/* ---------- web chat widget ---------- */

// Agent shown in the marketing site's live demo bubble.
pub.get('/demo-agent', (_req, res) => {
  const a = (process.env.DEMO_AGENT_ID && liveAgent(process.env.DEMO_AGENT_ID))
    || one('SELECT a.id FROM agents a JOIN channels c ON c.agent_id = a.id AND c.type = \'webchat\' AND c.enabled = 1 WHERE a.published IS NOT NULL ORDER BY a.created_at LIMIT 1');
  res.json({ agentId: a?.id || null });
});

pub.get('/chat/:aid/config', (req, res) => {
  const a = liveAgent(req.params.aid);
  if (!a || !webchatEnabled(a.id)) return res.status(404).json({ error: 'This assistant is not available.' });
  const cfg = parse(a.published || a.working);
  res.json({ id: a.id, name: a.name, color: a.color, greeting: cfg.greeting, suggestions: cfg.suggestions, webchat: cfg.webchat, published: Boolean(a.published) });
});

pub.get('/chat/:aid/history', (req, res) => {
  const userId = String(req.query.userId || '');
  const c = userId && one("SELECT * FROM conversations WHERE agent_id = ? AND channel = 'webchat' AND external_id = ? AND source = 'live'", req.params.aid, userId);
  if (!c) return res.json({ conversation: null, messages: [] });
  res.json({ conversation: convOut(c), messages: all("SELECT * FROM messages WHERE conversation_id = ? AND role != 'system' ORDER BY created_at", c.id).map(msgOut) });
});

pub.post('/chat/:aid/messages', limit(20), wrap(async (req, res) => {
  const a = liveAgent(req.params.aid);
  if (!a || !webchatEnabled(a.id)) return res.status(404).json({ error: 'This assistant is not available.' });
  const { userId, text, name } = req.body || {};
  if (!userId || !/^[\w-]{8,64}$/.test(userId)) return res.status(400).json({ error: 'Invalid userId' });
  if (!text?.trim() || text.length > 4000) return res.status(400).json({ error: 'Message must be 1–4000 characters' });
  run("UPDATE channels SET last_event_at = ? WHERE agent_id = ? AND type = 'webchat'", now(), a.id);
  const r = await handleIncoming({ agent: a, channel: 'webchat', externalId: userId, userName: name || 'Website visitor', text: text.trim() });
  res.json({ conversation: r.conversation, messages: r.messages.filter((m) => m.role !== 'system') });
}));

pub.get('/chat/:aid/stream', (req, res) => {
  const c = one("SELECT id FROM conversations WHERE agent_id = ? AND channel = 'webchat' AND external_id = ? AND source = 'live'", req.params.aid, String(req.query.userId || ''));
  if (!c) return res.status(404).end();
  sse(req, res, [`conv:${c.id}`], (p) => p.type !== 'message' || p.message.role === 'agent');
});

pub.post('/chat/:aid/rating', (req, res) => {
  const rating = Number(req.body?.rating);
  if (![1, 2, 3, 4, 5].includes(rating)) return res.status(400).json({ error: 'Rating must be 1–5' });
  run("UPDATE conversations SET rating = ? WHERE agent_id = ? AND channel = 'webchat' AND external_id = ? AND source = 'live'", rating, req.params.aid, String(req.body?.userId || ''));
  res.json({ ok: true });
});

/* ---------- REST API channel (workspace API keys) ---------- */

pub.post('/v1/agents/:aid/messages', limit(120), wrap(async (req, res) => {
  const key = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  const k = key && one('SELECT workspace_id FROM api_keys WHERE key_hash = ?', createHash('sha256').update(key).digest('hex'));
  const a = liveAgent(req.params.aid);
  if (!k || !a || a.workspace_id !== k.workspace_id) return res.status(401).json({ error: 'Invalid API key' });
  const { userId, text, name } = req.body || {};
  if (!userId || !text) return res.status(400).json({ error: 'userId and text are required' });
  const r = await handleIncoming({ agent: a, channel: 'api', externalId: String(userId), userName: name || String(userId), text: String(text) });
  res.json({ conversationId: r.conversation.id, status: r.conversation.status, replies: r.messages.filter((m) => m.role === 'bot').map((m) => ({ text: m.text, choices: m.meta.choices || [] })) });
}));

/* ---------- provider webhooks ---------- */

function loadChannel(req, res) {
  const ch = one('SELECT * FROM channels WHERE id = ?', req.params.chid);
  if (!ch) { res.status(404).end(); return null; }
  return ch;
}

pub.get('/hooks/:chid', (req, res) => {
  const ch = loadChannel(req, res); if (!ch) return;
  const challenge = adapters[ch.type]?.verify?.(req, parse(ch.config));
  if (challenge) return res.send(challenge);
  res.status(403).send('Verification failed');
});

pub.post('/hooks/:chid', wrap(async (req, res) => {
  const ch = loadChannel(req, res); if (!ch) return;
  const adapter = adapters[ch.type];
  const cfg = { ...parse(ch.config), _secret: ch.webhook_secret };
  const challenge = adapter?.challenge?.(req);
  if (challenge) return res.json(challenge);
  if (adapter?.authorize && !adapter.authorize(req, cfg)) {
    log(ch.agent_id, 'warn', 'channel', `Rejected an unsigned ${ch.type} webhook`);
    return res.status(401).end();
  }
  // Acknowledge fast; providers retry slow webhooks.
  if (adapter?.respondEmpty) adapter.respondEmpty(res); else res.status(200).json({ ok: true });
  if (!ch.enabled) return;
  run('UPDATE channels SET last_event_at = ? WHERE id = ?', now(), ch.id);
  const agent = liveAgent(ch.agent_id);
  for (const ev of adapter?.parse(req) || []) {
    await handleIncoming({ agent, channel: ch.type, externalId: ev.externalId, userName: ev.userName, text: ev.text, reply: ev.reply })
      .catch((e) => log(ch.agent_id, 'error', 'channel', `${ch.type} message failed: ${e.message}`));
  }
}));
