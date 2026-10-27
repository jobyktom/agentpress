import { Router } from 'express';
import { createHash } from 'node:crypto';
import { one, all, run, now, id, token, parse, tx } from '../db.js';
import { hashPassword, verifyPassword, createSession, requireUser, requireRole } from '../auth.js';
import { CHANNEL_TYPES } from '../defaults.js';
import { TEMPLATES } from '../templates.js';
import { adapters, missingFields } from '../channels/index.js';
import { handleIncoming, publishAgent, addMessage, setStatus, deliver, convOut, msgOut, log } from '../service.js';
import { respond, runHttpTool, llmAvailable } from '../engine.js';
import { fetchWebsite } from '../knowledge.js';
import { sse } from '../bus.js';

export const api = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

const agentOut = (a) => a && ({
  id: a.id, workspaceId: a.workspace_id, name: a.name, description: a.description, color: a.color,
  config: parse(a.working), publishedVersion: a.published_version, publishedAt: a.published_at,
  hasUnpublishedChanges: a.working !== a.published, createdAt: a.created_at, updatedAt: a.updated_at,
});

export function baseUrl(req) {
  return process.env.PUBLIC_URL?.replace(/\/$/, '') || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
}

/* ---------- auth ---------- */

export function createWorkspace(userId, name) {
  const wid = id('ws');
  const t = now();
  run('INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)', wid, name, userId, t);
  run('INSERT INTO members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)', wid, userId, 'owner', t);
  return wid;
}

export function createUser({ email, name, password }) {
  const uid = id('usr');
  run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', uid, email.toLowerCase().trim(), name.trim(), hashPassword(password), now());
  return uid;
}

api.post('/auth/signup', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Enter a valid email');
  if (!name?.trim()) return bad(res, 'Enter your name');
  if (!password || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (one('SELECT 1 FROM users WHERE email = ?', email.toLowerCase().trim())) return bad(res, 'An account with this email already exists', 409);
  const uid = tx(() => { const u = createUser({ email, name, password }); createWorkspace(u, `${name.trim().split(' ')[0]}'s workspace`); return u; });
  res.json({ token: createSession(uid), user: one('SELECT id, email, name FROM users WHERE id = ?', uid) });
});

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = email && one('SELECT * FROM users WHERE email = ?', String(email).toLowerCase().trim());
  if (!u || !verifyPassword(password || '', u.password_hash)) return bad(res, 'Wrong email or password', 401);
  res.json({ token: createSession(u.id), user: { id: u.id, email: u.email, name: u.name } });
});

api.get('/auth/me', requireUser, (req, res) => res.json({ user: req.user, llm: llmAvailable() }));
api.post('/auth/logout', requireUser, (req, res) => { run('DELETE FROM sessions WHERE token = ?', req.token); res.json({ ok: true }); });

/* ---------- workspaces ---------- */

api.get('/workspaces', requireUser, (req, res) => {
  res.json(all(`SELECT w.*, m.role, (SELECT COUNT(*) FROM agents a WHERE a.workspace_id = w.id) AS agent_count
    FROM workspaces w JOIN members m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.created_at`, req.user.id));
});

api.post('/workspaces', requireUser, (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return bad(res, 'Name is required');
  const wid = createWorkspace(req.user.id, name);
  res.json(one('SELECT * FROM workspaces WHERE id = ?', wid));
});

api.get('/workspaces/:wid', requireUser, requireRole(), (req, res) => {
  const ws = one('SELECT * FROM workspaces WHERE id = ?', req.params.wid);
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const stats = one(`SELECT
      (SELECT COUNT(*) FROM agents WHERE workspace_id = ?) AS agents,
      (SELECT COUNT(*) FROM conversations c JOIN agents a ON a.id = c.agent_id WHERE a.workspace_id = ? AND c.source = 'live' AND c.created_at > ?) AS conversations,
      (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN agents a ON a.id = c.agent_id WHERE a.workspace_id = ? AND c.source = 'live' AND m.role = 'bot' AND m.created_at > ?) AS botMessages,
      (SELECT COUNT(*) FROM conversations c JOIN agents a ON a.id = c.agent_id WHERE a.workspace_id = ? AND c.status = 'human') AS waiting,
      (SELECT COUNT(*) FROM members WHERE workspace_id = ?) AS members`,
  req.params.wid, req.params.wid, since, req.params.wid, since, req.params.wid, req.params.wid);
  res.json({ ...ws, role: req.role, stats, limits: { botMessages: ws.plan === 'free' ? 2000 : 50000, agents: ws.plan === 'free' ? 5 : 50 } });
});

api.patch('/workspaces/:wid', requireUser, requireRole('admin'), (req, res) => {
  if (req.body?.name) run('UPDATE workspaces SET name = ? WHERE id = ?', req.body.name.trim(), req.params.wid);
  res.json(one('SELECT * FROM workspaces WHERE id = ?', req.params.wid));
});

api.delete('/workspaces/:wid', requireUser, requireRole('owner'), (req, res) => {
  run('DELETE FROM workspaces WHERE id = ?', req.params.wid);
  res.json({ ok: true });
});

api.get('/workspaces/:wid/members', requireUser, requireRole(), (req, res) => {
  res.json(all('SELECT u.id, u.email, u.name, m.role, m.created_at FROM members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY m.created_at', req.params.wid));
});

api.post('/workspaces/:wid/members', requireUser, requireRole('admin'), (req, res) => {
  const { email, role = 'editor' } = req.body || {};
  if (!['viewer', 'editor', 'admin'].includes(role)) return bad(res, 'Invalid role');
  const u = one('SELECT id FROM users WHERE email = ?', String(email || '').toLowerCase().trim());
  if (!u) return bad(res, 'No AgentPress account uses that email yet. Ask them to sign up first, then invite them.', 404);
  if (one('SELECT 1 FROM members WHERE workspace_id = ? AND user_id = ?', req.params.wid, u.id)) return bad(res, 'Already a member', 409);
  run('INSERT INTO members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)', req.params.wid, u.id, role, now());
  res.json({ ok: true });
});

api.patch('/workspaces/:wid/members/:uid', requireUser, requireRole('admin'), (req, res) => {
  const target = one('SELECT role FROM members WHERE workspace_id = ? AND user_id = ?', req.params.wid, req.params.uid);
  if (!target) return bad(res, 'Not a member', 404);
  if (target.role === 'owner') return bad(res, 'The owner\'s role can\'t be changed', 403);
  if (!['viewer', 'editor', 'admin'].includes(req.body?.role)) return bad(res, 'Invalid role');
  run('UPDATE members SET role = ? WHERE workspace_id = ? AND user_id = ?', req.body.role, req.params.wid, req.params.uid);
  res.json({ ok: true });
});

api.delete('/workspaces/:wid/members/:uid', requireUser, requireRole('admin'), (req, res) => {
  const target = one('SELECT role FROM members WHERE workspace_id = ? AND user_id = ?', req.params.wid, req.params.uid);
  if (target?.role === 'owner') return bad(res, 'The owner can\'t be removed', 403);
  run('DELETE FROM members WHERE workspace_id = ? AND user_id = ?', req.params.wid, req.params.uid);
  res.json({ ok: true });
});

api.get('/workspaces/:wid/usage', requireUser, requireRole(), (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = all(`SELECT substr(m.created_at, 1, 10) AS day, a.name AS agent, COUNT(*) AS n
    FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN agents a ON a.id = c.agent_id
    WHERE a.workspace_id = ? AND m.role = 'bot' AND m.created_at > ? GROUP BY day, a.id ORDER BY day`, req.params.wid, since);
  res.json({ days, rows });
});

api.get('/workspaces/:wid/keys', requireUser, requireRole('admin'), (req, res) => {
  res.json(all('SELECT id, name, prefix, created_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC', req.params.wid));
});
api.post('/workspaces/:wid/keys', requireUser, requireRole('admin'), (req, res) => {
  const secret = `ap_${token(24)}`;
  run('INSERT INTO api_keys (id, workspace_id, name, prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('key'), req.params.wid, req.body?.name || 'API key', secret.slice(0, 10), createHash('sha256').update(secret).digest('hex'), now());
  res.json({ key: secret });
});
api.delete('/workspaces/:wid/keys/:kid', requireUser, requireRole('admin'), (req, res) => {
  run('DELETE FROM api_keys WHERE id = ? AND workspace_id = ?', req.params.kid, req.params.wid);
  res.json({ ok: true });
});

// Unified inbox across every agent in the workspace.
api.get('/workspaces/:wid/inbox', requireUser, requireRole(), (req, res) => {
  const status = req.query.status || 'human';
  const rows = all(`SELECT c.*, a.name AS agent_name, a.color AS agent_color,
      (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_text,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
    FROM conversations c JOIN agents a ON a.id = c.agent_id
    WHERE a.workspace_id = ? AND c.source = 'live' AND (? = 'all' OR c.status = ?)
    ORDER BY c.updated_at DESC LIMIT 200`, req.params.wid, status, status);
  res.json(rows.map(convOut));
});

api.get('/workspaces/:wid/stream', requireUser, requireRole(), (req, res) => {
  const agentIds = all('SELECT id FROM agents WHERE workspace_id = ?', req.params.wid).map((a) => `agent:${a.id}`);
  sse(req, res, [`workspace:${req.params.wid}`, ...agentIds], (p) => p.type !== 'log');
});

/* ---------- agents ---------- */

api.get('/templates', (req, res) => res.json(Object.entries(TEMPLATES).map(([key, t]) => ({ key, name: t.name, description: t.description }))));

api.get('/workspaces/:wid/agents', requireUser, requireRole(), (req, res) => {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const rows = all(`SELECT a.*, (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = a.id AND c.source = 'live' AND c.created_at > ?) AS conv7,
      (SELECT GROUP_CONCAT(type) FROM channels ch WHERE ch.agent_id = a.id AND ch.enabled = 1) AS live_channels
    FROM agents a WHERE a.workspace_id = ? ORDER BY a.updated_at DESC`, since, req.params.wid);
  res.json(rows.map((a) => ({ ...agentOut(a), conversations7d: a.conv7, channels: a.live_channels ? a.live_channels.split(',') : [] })));
});

export function createAgent(workspaceId, { name, description = '', template = 'blank', color }) {
  const tpl = TEMPLATES[template] || TEMPLATES.blank;
  const cfg = tpl.build(name);
  if (description) cfg.instructions.identity = description;
  const aid = id('agt');
  const t = now();
  tx(() => {
    run('INSERT INTO agents (id, workspace_id, name, description, color, working, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      aid, workspaceId, name, description || tpl.description, color || '#6d5efc', JSON.stringify(cfg), t, t);
    run('INSERT INTO channels (id, agent_id, type, enabled, config, webhook_secret, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)', id('chn'), aid, 'webchat', '{}', token(18), t);
  });
  return aid;
}

api.post('/workspaces/:wid/agents', requireUser, requireRole('editor'), (req, res) => {
  const { name, description, template, color } = req.body || {};
  if (!name?.trim()) return bad(res, 'Give your agent a name');
  const aid = createAgent(req.params.wid, { name: name.trim(), description, template, color });
  res.json(agentOut(one('SELECT * FROM agents WHERE id = ?', aid)));
});

api.get('/agents/:aid', requireUser, requireRole(), (req, res) => res.json({ ...agentOut(req.agent), role: req.role }));

api.patch('/agents/:aid', requireUser, requireRole('editor'), (req, res) => {
  const a = req.agent;
  const { name, description, color, config } = req.body || {};
  const next = config ? JSON.stringify(config) : a.working;
  run('UPDATE agents SET name = ?, description = ?, color = ?, working = ?, updated_at = ? WHERE id = ?',
    name?.trim() || a.name, description ?? a.description, color || a.color, next, now(), a.id);
  res.json(agentOut(one('SELECT * FROM agents WHERE id = ?', a.id)));
});

api.post('/agents/:aid/duplicate', requireUser, requireRole('editor'), (req, res) => {
  const a = req.agent;
  const aid = id('agt'); const t = now();
  run('INSERT INTO agents (id, workspace_id, name, description, color, working, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', aid, a.workspace_id, `${a.name} (copy)`, a.description, a.color, a.working, t, t);
  run('INSERT INTO channels (id, agent_id, type, enabled, config, webhook_secret, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)', id('chn'), aid, 'webchat', '{}', token(18), t);
  res.json(agentOut(one('SELECT * FROM agents WHERE id = ?', aid)));
});

api.delete('/agents/:aid', requireUser, requireRole('admin'), (req, res) => {
  run('DELETE FROM agents WHERE id = ?', req.agent.id);
  res.json({ ok: true });
});

api.post('/agents/:aid/publish', requireUser, requireRole('editor'), (req, res) => {
  const version = publishAgent(req.agent, req.user.id, req.body?.note || '');
  log(req.agent.id, 'info', 'publish', `Published version ${version}${req.body?.note ? `: ${req.body.note}` : ''}`);
  res.json(agentOut(one('SELECT * FROM agents WHERE id = ?', req.agent.id)));
});

api.get('/agents/:aid/versions', requireUser, requireRole(), (req, res) => {
  res.json(all(`SELECT v.id, v.version, v.note, v.created_at, u.name AS author, v.config FROM versions v LEFT JOIN users u ON u.id = v.created_by
    WHERE v.agent_id = ? ORDER BY v.version DESC`, req.agent.id).map((v) => ({ ...v, config: parse(v.config) })));
});

api.post('/agents/:aid/versions/:version/restore', requireUser, requireRole('editor'), (req, res) => {
  const v = one('SELECT config FROM versions WHERE agent_id = ? AND version = ?', req.agent.id, Number(req.params.version));
  if (!v) return bad(res, 'Version not found', 404);
  run('UPDATE agents SET working = ?, updated_at = ? WHERE id = ?', v.config, now(), req.agent.id);
  log(req.agent.id, 'info', 'restore', `Restored version ${req.params.version} into the working copy`);
  res.json(agentOut(one('SELECT * FROM agents WHERE id = ?', req.agent.id)));
});

api.post('/agents/:aid/knowledge/fetch', requireUser, requireRole('editor'), wrap(async (req, res) => {
  const url = String(req.body?.url || '');
  if (!/^https?:\/\//.test(url)) return bad(res, 'Enter a full URL starting with http:// or https://');
  try { res.json(await fetchWebsite(url)); } catch (e) { bad(res, `Couldn't read that page: ${e.message}`, 422); }
}));

api.post('/agents/:aid/tools/test', requireUser, requireRole('editor'), wrap(async (req, res) => {
  try { res.json(await runHttpTool(req.body.tool, req.body.args || {})); } catch (e) { res.json({ ok: false, error: e.message }); }
}));

/* ---------- preview (working copy) ---------- */

api.post('/agents/:aid/preview', requireUser, requireRole(), wrap(async (req, res) => {
  const { sessionId, text } = req.body || {};
  if (!sessionId || !text?.trim()) return bad(res, 'sessionId and text are required');
  res.json(await handleIncoming({ agent: req.agent, channel: 'webchat', externalId: sessionId, userName: req.user.name, text: text.trim(), source: 'preview' }));
}));

api.delete('/agents/:aid/preview/:sessionId', requireUser, requireRole(), (req, res) => {
  run("DELETE FROM conversations WHERE agent_id = ? AND external_id = ? AND source = 'preview'", req.agent.id, req.params.sessionId);
  res.json({ ok: true });
});

/* ---------- channels ---------- */

const channelOut = (req, agentId, type, row) => {
  const def = CHANNEL_TYPES[type];
  const cfg = parse(row?.config);
  const missing = missingFields(type, cfg, def.fields);
  const status = !row || (!row.enabled && !Object.keys(cfg).length) ? 'available' : !row.enabled ? 'disabled' : missing.length ? 'needs_setup' : row.last_error ? 'error' : 'live';
  const masked = Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, /token|secret|password|key/i.test(k) && v ? `••••${String(v).slice(-4)}` : v]));
  return {
    type, name: def.name, fields: def.fields, enabled: Boolean(row?.enabled), status, missing, config: masked,
    webhookUrl: row && !['webchat', 'api'].includes(type) ? `${baseUrl(req)}/api/hooks/${row.id}` : null,
    lastEventAt: row?.last_event_at, lastError: row?.last_error,
    conversations: one("SELECT COUNT(*) AS n FROM conversations WHERE agent_id = ? AND channel = ? AND source = 'live'", agentId, type).n,
  };
};

api.get('/agents/:aid/channels', requireUser, requireRole(), (req, res) => {
  const rows = Object.fromEntries(all('SELECT * FROM channels WHERE agent_id = ?', req.agent.id).map((r) => [r.type, r]));
  res.json(Object.keys(CHANNEL_TYPES).map((t) => channelOut(req, req.agent.id, t, rows[t])));
});

api.put('/agents/:aid/channels/:type', requireUser, requireRole('editor'), wrap(async (req, res) => {
  const type = req.params.type;
  if (!CHANNEL_TYPES[type]) return bad(res, 'Unknown channel', 404);
  let row = one('SELECT * FROM channels WHERE agent_id = ? AND type = ?', req.agent.id, type);
  if (!row) {
    run('INSERT INTO channels (id, agent_id, type, enabled, config, webhook_secret, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)', id('chn'), req.agent.id, type, '{}', token(18), now());
    row = one('SELECT * FROM channels WHERE agent_id = ? AND type = ?', req.agent.id, type);
  }
  const prev = parse(row.config);
  const incoming = req.body?.config || {};
  // Masked values coming back from the UI mean "unchanged".
  const cfg = { ...prev };
  for (const [k, v] of Object.entries(incoming)) if (typeof v === 'string' && !v.startsWith('••••')) cfg[k] = v.trim();
  const enabled = req.body?.enabled ?? Boolean(row.enabled);
  let info = null; let error = null;
  if (enabled && !missingFields(type, cfg, CHANNEL_TYPES[type].fields).length && adapters[type]?.setup) {
    try { info = (await adapters[type].setup({ ...cfg, _secret: row.webhook_secret }, `${baseUrl(req)}/api/hooks/${row.id}`))?.info; }
    catch (e) { error = e.message; }
  }
  run('UPDATE channels SET config = ?, enabled = ?, last_error = ? WHERE id = ?', JSON.stringify(cfg), enabled ? 1 : 0, error, row.id);
  log(req.agent.id, error ? 'error' : 'info', 'channel', error ? `${CHANNEL_TYPES[type].name} setup failed: ${error}` : `${CHANNEL_TYPES[type].name} ${enabled ? 'enabled' : 'disabled'}${info ? ` (${info})` : ''}`);
  res.json({ ...channelOut(req, req.agent.id, type, one('SELECT * FROM channels WHERE id = ?', row.id)), info });
}));

api.delete('/agents/:aid/channels/:type', requireUser, requireRole('editor'), (req, res) => {
  if (req.params.type === 'webchat') return bad(res, 'Web chat can be disabled but not removed');
  run('DELETE FROM channels WHERE agent_id = ? AND type = ?', req.agent.id, req.params.type);
  res.json({ ok: true });
});

/* ---------- conversations ---------- */

api.get('/agents/:aid/conversations', requireUser, requireRole(), (req, res) => {
  const { status = 'all', channel = 'all', source = 'live', q = '' } = req.query;
  const rows = all(`SELECT c.*, (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_text,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
    FROM conversations c WHERE c.agent_id = ? AND (? = 'all' OR c.status = ?) AND (? = 'all' OR c.channel = ?) AND (? = 'all' OR c.source = ?)
      AND (? = '' OR c.user_name LIKE ? OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.text LIKE ?))
    ORDER BY c.updated_at DESC LIMIT 300`, req.agent.id, status, status, channel, channel, source, source, q, `%${q}%`, `%${q}%`);
  res.json(rows.map(convOut));
});

function convGuard(req, res, next) {
  const c = one('SELECT * FROM conversations WHERE id = ?', req.params.cid);
  if (!c) return bad(res, 'Conversation not found', 404);
  req.params.aid = c.agent_id;
  req.conv = c;
  next();
}

api.get('/conversations/:cid', requireUser, convGuard, requireRole(), (req, res) => {
  res.json({ conversation: convOut(req.conv), agent: { id: req.agent.id, name: req.agent.name, color: req.agent.color }, messages: all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at', req.conv.id).map(msgOut) });
});

api.post('/conversations/:cid/messages', requireUser, convGuard, requireRole('editor'), wrap(async (req, res) => {
  const text = req.body?.text?.trim();
  if (!text) return bad(res, 'Message is empty');
  if (req.conv.status !== 'human') setStatus(req.conv, 'human', { assigneeId: req.user.id });
  const m = addMessage(req.conv, 'agent', text, { author: req.user.name });
  await deliver(req.conv, text);
  res.json(m);
}));

api.post('/conversations/:cid/status', requireUser, convGuard, requireRole('editor'), (req, res) => {
  const status = req.body?.status;
  if (!['bot', 'human', 'closed'].includes(status)) return bad(res, 'Invalid status');
  const c = setStatus(req.conv, status, { assigneeId: status === 'human' ? req.user.id : null });
  const note = { bot: `${req.user.name} handed the conversation back to the agent`, human: `${req.user.name} took over the conversation`, closed: `${req.user.name} closed the conversation` }[status];
  addMessage(req.conv, 'system', note);
  res.json(c);
});

api.get('/agents/:aid/stream', requireUser, requireRole(), (req, res) => sse(req, res, [`agent:${req.agent.id}`]));

/* ---------- analytics, logs, simulations ---------- */

api.get('/agents/:aid/analytics', requireUser, requireRole(), (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const aid = req.agent.id;
  const daily = all(`SELECT substr(c.created_at, 1, 10) AS day, COUNT(*) AS conversations,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.role = 'system' AND m.text LIKE 'Handed off%') THEN 1 ELSE 0 END) AS handoffs
    FROM conversations c WHERE c.agent_id = ? AND c.source = 'live' AND c.created_at > ? GROUP BY day ORDER BY day`, aid, since);
  const totals = one(`SELECT COUNT(*) AS conversations,
      (SELECT COUNT(*) FROM messages m JOIN conversations c2 ON c2.id = m.conversation_id WHERE c2.agent_id = ? AND c2.source = 'live' AND m.role = 'user' AND m.created_at > ?) AS userMessages,
      (SELECT COUNT(DISTINCT external_id) FROM conversations WHERE agent_id = ? AND source = 'live' AND created_at > ?) AS users,
      (SELECT AVG(rating) FROM conversations WHERE agent_id = ? AND rating IS NOT NULL AND created_at > ?) AS rating
    FROM conversations WHERE agent_id = ? AND source = 'live' AND created_at > ?`, aid, since, aid, since, aid, since, aid, since);
  const handoffs = one(`SELECT COUNT(DISTINCT m.conversation_id) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE c.agent_id = ? AND c.source = 'live' AND m.role = 'system' AND m.text LIKE 'Handed off%' AND m.created_at > ?`, aid, since).n;
  const byChannel = all("SELECT channel, COUNT(*) AS n FROM conversations WHERE agent_id = ? AND source = 'live' AND created_at > ? GROUP BY channel ORDER BY n DESC", aid, since);
  const latency = all(`SELECT json_extract(m.meta, '$.latencyMs') AS ms FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE c.agent_id = ? AND m.role = 'bot' AND m.created_at > ? AND json_extract(m.meta, '$.latencyMs') IS NOT NULL`, aid, since).map((r) => r.ms).sort((a, b) => a - b);
  const gaps = all("SELECT json_extract(data, '$.question') AS question, COUNT(*) AS n, MAX(created_at) AS last FROM logs WHERE agent_id = ? AND type = 'gap' AND created_at > ? GROUP BY lower(question) ORDER BY n DESC LIMIT 20", aid, since);
  const topics = all(`SELECT json_extract(m.meta, '$.trace[0].name') AS playbook, COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE c.agent_id = ? AND c.source = 'live' AND m.role = 'bot' AND json_extract(m.meta, '$.trace[0].type') = 'playbook' AND m.created_at > ? GROUP BY playbook ORDER BY n DESC`, aid, since);
  res.json({
    days, daily, byChannel, gaps, topics,
    totals: { ...totals, handoffs, resolutionRate: totals.conversations ? Math.round(100 * (1 - handoffs / totals.conversations)) : null,
      p50LatencyMs: latency[Math.floor(latency.length * 0.5)] ?? null, p95LatencyMs: latency[Math.floor(latency.length * 0.95)] ?? null },
  });
});

api.get('/agents/:aid/logs', requireUser, requireRole(), (req, res) => {
  const { level = 'all', q = '' } = req.query;
  res.json(all(`SELECT * FROM logs WHERE agent_id = ? AND (? = 'all' OR level = ?) AND (? = '' OR message LIKE ?) ORDER BY created_at DESC LIMIT 300`,
    req.agent.id, level, level, q, `%${q}%`).map((l) => ({ ...l, data: parse(l.data) })));
});

api.get('/agents/:aid/simulations', requireUser, requireRole(), (req, res) => {
  res.json(all('SELECT * FROM simulations WHERE agent_id = ? ORDER BY created_at', req.agent.id));
});
api.post('/agents/:aid/simulations', requireUser, requireRole('editor'), (req, res) => {
  const { name, input, expect = '' } = req.body || {};
  if (!input?.trim()) return bad(res, 'Add at least one user message');
  const sidv = id('sim');
  run('INSERT INTO simulations (id, agent_id, name, input, expect, created_at) VALUES (?, ?, ?, ?, ?, ?)', sidv, req.agent.id, name?.trim() || input.split('\n')[0].slice(0, 60), input, expect, now());
  res.json(one('SELECT * FROM simulations WHERE id = ?', sidv));
});
api.delete('/agents/:aid/simulations/:sid', requireUser, requireRole('editor'), (req, res) => {
  run('DELETE FROM simulations WHERE id = ? AND agent_id = ?', req.params.sid, req.agent.id);
  res.json({ ok: true });
});

// Replays each line of a simulation against the working copy and checks
// that every expected phrase (one per line) appears in the agent's replies.
export async function runSimulation(agent, sim) {
  const cfg = parse(agent.working);
  let meta = {}; const history = []; const transcript = [];
  for (const line of sim.input.split('\n').map((l) => l.trim()).filter(Boolean)) {
    history.push({ role: 'user', text: line });
    const r = await respond({ config: cfg, meta, history, text: line });
    meta = r.meta;
    transcript.push({ role: 'user', text: line });
    for (const rep of r.replies) { history.push({ role: 'bot', text: rep.text }); transcript.push({ role: 'bot', text: rep.text }); }
    if (r.handoff) { transcript.push({ role: 'system', text: `Handoff: ${r.handoff.reason}` }); break; }
  }
  const all = transcript.map((t) => t.text).join('\n').toLowerCase();
  const expects = sim.expect.split('\n').map((e) => e.trim()).filter(Boolean);
  const failed = expects.filter((e) => !all.includes(e.toLowerCase()));
  const status = !expects.length ? 'ran' : failed.length ? 'failed' : 'passed';
  run('UPDATE simulations SET last_status = ?, last_output = ?, last_run_at = ? WHERE id = ?', status, JSON.stringify({ transcript, failed }), now(), sim.id);
  return one('SELECT * FROM simulations WHERE id = ?', sim.id);
}

api.post('/agents/:aid/simulations/run', requireUser, requireRole('editor'), wrap(async (req, res) => {
  const sims = all('SELECT * FROM simulations WHERE agent_id = ?' + (req.body?.id ? ' AND id = ?' : ''), req.agent.id, ...(req.body?.id ? [req.body.id] : []));
  const out = [];
  for (const s of sims) out.push(await runSimulation(req.agent, s));
  res.json(out);
}));
