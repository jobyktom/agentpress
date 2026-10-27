import Anthropic from '@anthropic-ai/sdk';
import { search, tokenize } from './knowledge.js';

const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
let client;
const anthropic = () => (client ||= new Anthropic());

export const llmAvailable = hasKey;

const NEGATIVE = ['terrible', 'awful', 'useless', 'angry', 'furious', 'worst', 'hate', 'ridiculous', 'unacceptable', 'scam', 'stupid', 'frustrated', 'disappointed'];

export function interpolate(text, vars = {}) {
  return String(text ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), vars);
    return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

const VALIDATORS = {
  any: () => true,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  number: (v) => /^-?\d+(\.\d+)?$/.test(v.trim()),
  phone: (v) => /^\+?[\d\s()-]{7,}$/.test(v),
  yesno: (v) => /^(y|yes|n|no|yeah|nope|sure)$/i.test(v.trim()),
};

function matchesPlaybook(pb, text) {
  if (pb.enabled === false) return false;
  const t = text.toLowerCase();
  return (pb.triggers || []).some((phrase) => {
    const p = phrase.toLowerCase().trim();
    if (!p) return false;
    if (t.includes(p)) return true;
    const pt = tokenize(p);
    const tt = new Set(tokenize(t));
    return pt.length > 0 && pt.filter((w) => tt.has(w)).length / pt.length >= 0.75;
  });
}

function compare(a, op, b) {
  const na = Number(a), nb = Number(b);
  switch (op) {
    case 'equals': return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
    case 'not_equals': return String(a ?? '').toLowerCase() !== String(b ?? '').toLowerCase();
    case 'contains': return String(a ?? '').toLowerCase().includes(String(b ?? '').toLowerCase());
    case 'gt': return na > nb;
    case 'lt': return na < nb;
    case 'is_set': return a != null && a !== '';
    case 'is_yes': return /^(y|yes|yeah|sure|ok)/i.test(String(a ?? ''));
    default: return false;
  }
}

export async function runHttpTool(tool, args = {}) {
  const vars = { ...args };
  const url = interpolate(tool.url, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, encodeURIComponent(v)])));
  const headers = { 'content-type': 'application/json' };
  for (const h of tool.headers || []) if (h.key) headers[h.key] = interpolate(h.value, vars);
  const init = { method: tool.method || 'GET', headers, signal: AbortSignal.timeout(15000) };
  if (init.method !== 'GET' && init.method !== 'HEAD') init.body = tool.body ? interpolate(tool.body, vars) : JSON.stringify(args);
  const res = await fetch(url, init);
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw.slice(0, 4000); }
  return { ok: res.ok, status: res.status, data };
}

// Executes a playbook from `state.at` until it needs user input or ends.
async function stepPlaybook(config, state, ctx, input) {
  const pb = config.playbooks.find((p) => p.id === state.id);
  const out = [];
  if (!pb) return { out, done: true };
  const byId = Object.fromEntries(pb.steps.map((s, i) => [s.id, i]));
  let i = state.at ?? 0;

  if (state.waiting && input != null) {
    const step = pb.steps[i];
    const ok = (VALIDATORS[step.validate || 'any'] || VALIDATORS.any)(input);
    if (!ok) {
      state.retries = (state.retries || 0) + 1;
      if (state.retries > 2) { out.push({ text: 'Let\'s try something else. Ask me anything.' }); return { out, done: true }; }
      out.push({ text: interpolate(step.retryMessage || `That doesn't look right. ${step.text}`, ctx.vars) });
      return { out, done: false };
    }
    ctx.vars[step.variable || step.id] = input.trim();
    state.waiting = false; state.retries = 0;
    i = step.next ? byId[step.next] ?? i + 1 : i + 1;
  }

  for (let guard = 0; guard < 50 && i < pb.steps.length; guard++) {
    const step = pb.steps[i];
    ctx.trace.push({ type: 'step', playbook: pb.name, step: step.type, id: step.id });
    let next = step.next ? byId[step.next] : i + 1;
    if (step.type === 'message') {
      out.push({ text: interpolate(step.text, ctx.vars), choices: step.choices?.filter(Boolean) });
    } else if (step.type === 'ask') {
      out.push({ text: interpolate(step.text, ctx.vars), choices: step.choices?.filter(Boolean) });
      state.at = i; state.waiting = true;
      return { out, done: false };
    } else if (step.type === 'set') {
      ctx.vars[step.variable] = interpolate(step.value, ctx.vars);
    } else if (step.type === 'condition') {
      const pass = compare(ctx.vars[step.variable], step.operator, interpolate(step.value, ctx.vars));
      const target = pass ? step.then : step.else;
      if (target) next = byId[target]; else if (!pass) next = i + 1;
    } else if (step.type === 'tool') {
      const tool = config.tools.find((t) => t.id === step.toolId);
      if (tool) {
        const args = Object.fromEntries(Object.entries(step.args || {}).map(([k, v]) => [k, interpolate(v, ctx.vars)]));
        try {
          const r = await runHttpTool(tool, args);
          ctx.vars[step.variable || 'result'] = r.data;
          ctx.trace.push({ type: 'tool', name: tool.name, status: r.status });
        } catch (e) {
          ctx.vars[step.variable || 'result'] = { error: e.message };
          ctx.trace.push({ type: 'tool', name: tool.name, error: e.message });
        }
      }
    } else if (step.type === 'handoff') {
      out.push({ text: interpolate(step.text || config.escalation.message, ctx.vars) });
      ctx.handoff = { reason: `Playbook "${pb.name}" handed off` };
      return { out, done: true };
    } else if (step.type === 'ai') {
      const reply = await llmReply(config, ctx, interpolate(step.text, ctx.vars));
      if (reply) out.push(reply);
    } else if (step.type === 'end') {
      if (step.text) out.push({ text: interpolate(step.text, ctx.vars) });
      return { out, done: true };
    }
    i = next ?? i + 1;
  }
  return { out, done: true };
}

function systemPrompt(config, ctx, hits) {
  const ins = config.instructions || {};
  const parts = [
    `# Identity\n${ins.identity || ''}`,
    `# Communication\n${ins.communication || ''}`,
    `# Memory\n${ins.memory || ''}`,
    `# Safety\n${ins.safety || ''}`,
    `# Channel\nYou are talking on the ${ctx.channel} channel. Format replies as plain text with at most light markdown; keep them short enough for a chat bubble.`,
  ];
  const pbs = (config.playbooks || []).filter((p) => p.enabled !== false && p.description);
  if (pbs.length) parts.push(`# Procedures you know\n${pbs.map((p) => `- ${p.name}: ${p.description}`).join('\n')}`);
  if (Object.keys(ctx.vars).length) parts.push(`# Known facts about this user\n${JSON.stringify(ctx.vars)}`);
  if (hits.length) {
    parts.push(`# Knowledge\nAnswer from these excerpts when relevant. If they don't cover the question, say you're not sure rather than guessing.\n\n${hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.text}`).join('\n\n')}`);
  }
  if (config.escalation?.enabled) parts.push('# Escalation\nCall handoff_to_human when the user asks for a person, is upset, or you cannot help after a genuine attempt.');
  return parts.join('\n\n');
}

function toolDefs(config) {
  const defs = (config.tools || []).filter((t) => t.enabled !== false).map((t) => ({
    name: t.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
    description: t.description || t.name,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries((t.params || []).map((p) => [p.name, { type: p.type || 'string', description: p.description || '' }])),
      required: (t.params || []).filter((p) => p.required).map((p) => p.name),
    },
  }));
  if (config.escalation?.enabled) {
    defs.push({ name: 'handoff_to_human', description: 'Transfer the conversation to a human teammate.', input_schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } });
  }
  return defs;
}

async function llmReply(config, ctx, extraInstruction) {
  if (!hasKey()) return null;
  const hits = search(config.knowledge, ctx.text, 5);
  ctx.sources = hits.map((h) => ({ title: h.title, url: h.url, sourceId: h.sourceId }));
  const messages = [];
  for (const m of ctx.history.slice(-20)) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    if (!messages.length && role === 'assistant') continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n${m.text}`;
    else messages.push({ role, content: m.text });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') messages.push({ role: 'user', content: ctx.text });
  if (extraInstruction) messages[messages.length - 1].content += `\n\n[Instruction for this reply: ${extraInstruction}]`;

  const tools = toolDefs(config);
  const system = systemPrompt(config, ctx, hits);
  let finalText = '';
  for (let turn = 0; turn < 5; turn++) {
    const params = {
      model: config.model || 'claude-opus-5-5',
      max_tokens: 4000,
      system,
      messages,
      output_config: { effort: config.effort || 'low' },
      ...(tools.length ? { tools } : {}),
    };
    let res;
    try {
      res = await anthropic().messages.create(params);
    } catch (e) {
      ctx.trace.push({ type: 'llm_error', error: e.message });
      throw e;
    }
    ctx.usage = { input: (ctx.usage?.input || 0) + res.usage.input_tokens, output: (ctx.usage?.output || 0) + res.usage.output_tokens };
    if (res.stop_reason === 'refusal') return { text: "Sorry, I can't help with that one. Is there anything else I can do?" };
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) finalText = text;
    const uses = res.content.filter((b) => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !uses.length) break;
    messages.push({ role: 'assistant', content: res.content });
    const results = await Promise.all(uses.map(async (u) => {
      if (u.name === 'handoff_to_human') {
        ctx.handoff = { reason: u.input?.reason || 'Requested by agent' };
        return { type: 'tool_result', tool_use_id: u.id, content: 'Handoff started. Tell the user a teammate will join shortly.' };
      }
      const tool = config.tools.find((t) => t.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) === u.name);
      if (!tool) return { type: 'tool_result', tool_use_id: u.id, content: 'Unknown tool', is_error: true };
      try {
        const r = await runHttpTool(tool, u.input);
        ctx.trace.push({ type: 'tool', name: tool.name, status: r.status });
        return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r.data).slice(0, 8000), is_error: !r.ok };
      } catch (e) {
        ctx.trace.push({ type: 'tool', name: tool.name, error: e.message });
        return { type: 'tool_result', tool_use_id: u.id, content: `Tool failed: ${e.message}`, is_error: true };
      }
    }));
    messages.push({ role: 'user', content: results });
  }
  return { text: finalText || config.escalation?.message || '…', sources: ctx.sources };
}

// Offline answering: the best FAQ / knowledge match, otherwise an honest fallback.
function retrievalReply(config, ctx) {
  const hits = search(config.knowledge, ctx.text, 3);
  const best = hits[0];
  if (best && best.coverage >= 0.5) {
    ctx.trace.push({ type: 'knowledge', title: best.title, score: Number(best.score.toFixed(2)) });
    if (best.faq) return { text: best.answer, sources: [{ title: best.title, sourceId: best.sourceId }] };
    const sentences = best.text.split(/(?<=[.!?])\s+/);
    const q = new Set(tokenize(ctx.text));
    const ranked = sentences.map((s, i) => ({ s, i, n: tokenize(s).filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n).slice(0, 3).sort((a, b) => a.i - b.i);
    return { text: ranked.map((r) => r.s).join(' '), sources: [{ title: best.title, url: best.url, sourceId: best.sourceId }] };
  }
  ctx.gap = true;
  return {
    text: "I'm not sure about that yet. Could you rephrase, or would you like me to connect you with a person?",
    choices: config.escalation?.enabled ? ['Talk to a human'] : undefined,
  };
}

/**
 * Produce the agent's replies to one user message.
 * @returns {{ replies: Array<{text:string, choices?:string[], sources?:object[]}>, handoff?: {reason:string}, meta: object, trace: object[] }}
 */
export async function respond({ config, meta = {}, history = [], text, channel = 'webchat' }) {
  const ctx = { vars: { ...(meta.vars || {}) }, history, text, channel, trace: [], handoff: null };
  const state = meta.playbook ? { ...meta.playbook } : null;
  const replies = [];
  const lower = text.toLowerCase();
  const esc = config.escalation || {};

  if (esc.enabled && (esc.keywords || []).some((k) => k && new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower))) {
    ctx.handoff = { reason: 'User asked for a human' };
    replies.push({ text: esc.message });
  } else if (esc.enabled && esc.negativeSentiment && NEGATIVE.filter((w) => lower.includes(w)).length >= 2) {
    ctx.handoff = { reason: 'Negative sentiment detected' };
    replies.push({ text: esc.message });
  } else if (state) {
    const r = await stepPlaybook(config, state, ctx, text);
    replies.push(...r.out);
    meta = { ...meta, playbook: r.done ? null : state };
  } else {
    const pb = (config.playbooks || []).find((p) => matchesPlaybook(p, text));
    if (pb) {
      ctx.trace.push({ type: 'playbook', name: pb.name });
      const st = { id: pb.id, at: 0 };
      const r = await stepPlaybook(config, st, ctx, null);
      replies.push(...r.out);
      meta = { ...meta, playbook: r.done ? null : st };
    } else {
      let reply = null;
      try { reply = await llmReply(config, ctx); } catch { reply = null; }
      if (!reply) reply = retrievalReply(config, ctx);
      replies.push(reply);
    }
  }
  return {
    replies: replies.filter((r) => r && r.text),
    handoff: ctx.handoff,
    gap: ctx.gap || false,
    usage: ctx.usage,
    meta: { ...meta, vars: ctx.vars },
    trace: ctx.trace,
  };
}
