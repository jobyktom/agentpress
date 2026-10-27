import { one, all, run, now, id, parse, tx } from './db.js';
import { respond } from './engine.js';
import { adapters } from './channels/index.js';
import { bus } from './bus.js';

export function log(agentId, level, type, message, data = {}) {
  const row = { id: id('log'), agent_id: agentId, level, type, message, data: JSON.stringify(data), created_at: now() };
  run('INSERT INTO logs (id, agent_id, level, type, message, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', row.id, row.agent_id, level, type, message, row.data, row.created_at);
  bus.emit(`agent:${agentId}`, { type: 'log', log: { ...row, data } });
}

export const msgOut = (m) => ({ ...m, meta: parse(m.meta) });
export const convOut = (c) => c && ({ ...c, meta: parse(c.meta) });

export function getOrCreateConversation({ agentId, channel, externalId, userName, source }) {
  let conv = one('SELECT * FROM conversations WHERE agent_id = ? AND channel = ? AND external_id = ? AND source = ?', agentId, channel, externalId, source);
  if (!conv) {
    const t = now();
    const cid = id('conv');
    run('INSERT INTO conversations (id, agent_id, channel, external_id, user_name, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', cid, agentId, channel, externalId, userName || 'Visitor', source, t, t);
    conv = one('SELECT * FROM conversations WHERE id = ?', cid);
    bus.emit(`agent:${agentId}`, { type: 'conversation', conversation: convOut(conv) });
  }
  return conv;
}

export function addMessage(conv, role, text, meta = {}) {
  const m = { id: id('msg'), conversation_id: conv.id, role, text, meta: JSON.stringify(meta), created_at: now() };
  run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', m.id, m.conversation_id, role, text, m.meta, m.created_at);
  run('UPDATE conversations SET updated_at = ? WHERE id = ?', m.created_at, conv.id);
  const out = { ...m, meta };
  bus.emit(`agent:${conv.agent_id}`, { type: 'message', conversationId: conv.id, message: out });
  bus.emit(`conv:${conv.id}`, { type: 'message', conversationId: conv.id, message: out });
  return out;
}

export function setStatus(conv, status, extra = {}) {
  run('UPDATE conversations SET status = ?, assignee_id = COALESCE(?, assignee_id), updated_at = ? WHERE id = ?', status, extra.assigneeId ?? null, now(), conv.id);
  const updated = convOut(one('SELECT * FROM conversations WHERE id = ?', conv.id));
  bus.emit(`agent:${conv.agent_id}`, { type: 'conversation', conversation: updated });
  bus.emit(`conv:${conv.id}`, { type: 'status', conversationId: conv.id, status });
  return updated;
}

export async function deliver(conv, text, choices) {
  if (conv.source !== 'live') return;
  const adapter = adapters[conv.channel];
  if (!adapter?.send || ['webchat', 'api'].includes(conv.channel)) return;
  const ch = one('SELECT * FROM channels WHERE agent_id = ? AND type = ?', conv.agent_id, conv.channel);
  if (!ch) return;
  try {
    const meta = parse(one('SELECT meta FROM conversations WHERE id = ?', conv.id)?.meta);
    await adapter.send(parse(ch.config), conv.external_id, text, choices, meta.reply || {});
  } catch (e) {
    run('UPDATE channels SET last_error = ? WHERE id = ?', e.message, ch.id);
    log(conv.agent_id, 'error', 'channel', `Failed to deliver on ${conv.channel}: ${e.message}`, { conversationId: conv.id });
  }
}

/**
 * Handle one inbound user message end to end: store it, run the agent unless
 * a human has taken over, store and deliver the replies.
 */
export async function handleIncoming({ agent, channel, externalId, userName, text, source = 'live', reply }) {
  const cfg = parse(source === 'preview' ? agent.working : (agent.published || agent.working));
  const conv = getOrCreateConversation({ agentId: agent.id, channel, externalId, userName, source });
  if (reply) run('UPDATE conversations SET meta = json_set(meta, \'$.reply\', json(?)) WHERE id = ?', JSON.stringify(reply), conv.id);
  if (conv.status === 'closed') setStatus(conv, 'bot');
  const userMsg = addMessage(conv, 'user', text);

  const fresh = one('SELECT * FROM conversations WHERE id = ?', conv.id);
  if (fresh.status === 'human') {
    bus.emit(`workspace:${agent.workspace_id}`, { type: 'inbox', conversationId: conv.id });
    return { conversation: convOut(fresh), messages: [userMsg] };
  }

  const history = all('SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY created_at', conv.id);
  const started = Date.now();
  bus.emit(`conv:${conv.id}`, { type: 'typing', conversationId: conv.id });
  let result;
  try {
    result = await respond({ config: cfg, meta: parse(fresh.meta), history, text, channel });
  } catch (e) {
    log(agent.id, 'error', 'runtime', `Agent failed: ${e.message}`, { conversationId: conv.id });
    result = { replies: [{ text: 'Sorry, something went wrong on my side. Please try again.' }], meta: parse(fresh.meta), trace: [] };
  }
  run('UPDATE conversations SET meta = ? WHERE id = ?', JSON.stringify({ ...parse(fresh.meta), ...result.meta }), conv.id);

  const out = [userMsg];
  for (const r of result.replies) {
    out.push(addMessage(conv, 'bot', r.text, { choices: r.choices, sources: r.sources, trace: result.trace, latencyMs: Date.now() - started, usage: result.usage, gap: result.gap || undefined }));
    await deliver(conv, r.text, r.choices);
  }
  if (result.gap && source === 'live') log(agent.id, 'warn', 'gap', `Unanswered question: "${text.slice(0, 140)}"`, { conversationId: conv.id, question: text });
  let finalConv = convOut(one('SELECT * FROM conversations WHERE id = ?', conv.id));
  if (result.handoff) {
    finalConv = setStatus(conv, 'human');
    addMessage(conv, 'system', `Handed off to a human: ${result.handoff.reason}`);
    log(agent.id, 'info', 'handoff', result.handoff.reason, { conversationId: conv.id });
    bus.emit(`workspace:${agent.workspace_id}`, { type: 'inbox', conversationId: conv.id });
  }
  log(agent.id, 'debug', 'turn', `${channel}${source === 'preview' ? ' (preview)' : ''}: replied in ${Date.now() - started} ms`, { conversationId: conv.id, trace: result.trace });
  return { conversation: finalConv, messages: out };
}

export function publishAgent(agent, userId, note = '') {
  return tx(() => {
    const version = agent.published_version + 1;
    const t = now();
    run('INSERT INTO versions (id, agent_id, version, config, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id('ver'), agent.id, version, agent.working, note, userId, t);
    run('UPDATE agents SET published = working, published_version = ?, published_at = ?, updated_at = ? WHERE id = ?', version, t, t, agent.id);
    return version;
  });
}
