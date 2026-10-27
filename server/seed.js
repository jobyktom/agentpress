import { one, run, id, now, parse } from './db.js';
import { createUser, createWorkspace, createAgent } from './routes/api.js';
import { publishAgent } from './service.js';
import { token } from './db.js';

// Creates a demo account with two agents and two weeks of sample traffic so
// the dashboard has something to show on first run.
export function seedDemo() {
  if (one('SELECT 1 FROM users LIMIT 1')) return false;
  const uid = createUser({ email: 'demo@agentpress.dev', name: 'Demo User', password: 'demo1234' });
  const wid = createWorkspace(uid, 'Acme Inc.');
  const support = createAgent(wid, { name: 'Acme Support', template: 'support', color: '#6d5efc' });
  const sales = createAgent(wid, { name: 'Sales Concierge', template: 'leads', color: '#0ea5a4' });
  createAgent(wid, { name: 'Clinic Booking', template: 'booking', color: '#f97316' });

  const a = one('SELECT * FROM agents WHERE id = ?', support);
  const cfg = parse(a.working);
  cfg.knowledge.push({ id: 'k_about', type: 'text', title: 'About Acme', content: 'Acme sells eco-friendly home goods. Our headquarters are in Lisbon. Customer support is available Monday to Friday, 9am to 6pm CET. Gift cards never expire and can be used on any product.' });
  run('UPDATE agents SET working = ? WHERE id = ?', JSON.stringify(cfg), support);
  publishAgent(one('SELECT * FROM agents WHERE id = ?', support), uid, 'Initial launch');
  publishAgent(one('SELECT * FROM agents WHERE id = ?', sales), uid, 'Initial launch');
  for (const type of ['whatsapp', 'telegram', 'viber']) {
    run('INSERT INTO channels (id, agent_id, type, enabled, config, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id('chn'), support, type, type === 'whatsapp' ? 0 : 0, '{}', token(18), now());
  }
  run("INSERT INTO simulations (id, agent_id, name, input, expect, created_at) VALUES (?, ?, 'Return policy', 'What is your return policy?', '30 days', ?)", id('sim'), support, now());
  run("INSERT INTO simulations (id, agent_id, name, input, expect, created_at) VALUES (?, ?, 'Order tracking flow', ?, ?, ?)", id('sim'), support, 'Where is my order?\nA-1042\njane@example.com', 'order number\nA-1042', now());

  const samples = [
    ['webchat', 'What is your return policy?', 'You can return any unused item within 30 days of delivery for a full refund.'],
    ['whatsapp', 'How long does shipping take?', 'Standard shipping takes 3–5 business days. Express shipping arrives in 1–2 business days.'],
    ['telegram', 'Do you ship internationally?', 'Yes, we ship to over 40 countries.'],
    ['webchat', 'Can I pay with crypto?', "I'm not sure about that yet. Could you rephrase, or would you like me to connect you with a person?"],
    ['viber', 'Where is my order?', 'Sure, I can check that. What is your order number?'],
    ['webchat', 'I want to speak to a human', "I'm connecting you with a member of our team."],
  ];
  const names = ['Maria Lopez', 'Kenji Sato', 'Amara Okafor', 'Liam Walsh', 'Sofia Rossi', 'Noah Kim', 'Ava Martin', 'Omar Haddad'];
  for (let d = 13; d >= 0; d--) {
    const n = 2 + ((d * 7) % 5);
    for (let i = 0; i < n; i++) {
      const [channel, q, ans] = samples[(d + i) % samples.length];
      const t = new Date(Date.now() - d * 864e5 - i * 3600e3).toISOString();
      const cid = id('conv');
      const handoff = q.includes('human');
      run('INSERT INTO conversations (id, agent_id, channel, external_id, user_name, status, source, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        cid, support, channel, `seed-${d}-${i}`, names[(d + i) % names.length], handoff && d < 2 ? 'human' : d > 1 ? 'closed' : 'bot', 'live', (d + i) % 3 === 0 ? 5 : (d + i) % 7 === 0 ? 2 : null, t, t);
      run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('msg'), cid, 'user', q, '{}', t);
      run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('msg'), cid, 'bot', ans, JSON.stringify({ latencyMs: 300 + ((d * 37 + i * 91) % 900) }), t);
      if (handoff) run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('msg'), cid, 'system', 'Handed off to a human: User asked for a human', '{}', t);
      if (q.includes('crypto')) run("INSERT INTO logs (id, agent_id, level, type, message, data, created_at) VALUES (?, ?, 'warn', 'gap', ?, ?, ?)", id('log'), support, `Unanswered question: "${q}"`, JSON.stringify({ question: q, conversationId: cid }), t);
    }
  }
  // A couple of live escalations so the inbox has something waiting.
  const waiting = [
    ['whatsapp', 'Priya Nair', ['My package arrived damaged', 'This is the second time, really frustrated. I want to speak to a human']],
    ['viber', 'Daniel Costa', ['Can I change the delivery address on order A-2210?', 'talk to a human please']],
  ];
  for (const [channel, name, lines] of waiting) {
    const t0 = Date.now() - 25 * 60e3;
    const cid = id('conv');
    run("INSERT INTO conversations (id, agent_id, channel, external_id, user_name, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'human', 'live', ?, ?)", cid, support, channel, `seed-wait-${channel}`, name, new Date(t0).toISOString(), new Date(t0 + 4 * 60e3).toISOString());
    lines.forEach((text, i) => {
      run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('msg'), cid, 'user', text, '{}', new Date(t0 + i * 120e3).toISOString());
      const reply = i === lines.length - 1 ? "I'm connecting you with a member of our team. They'll reply here shortly." : "I'm sorry to hear that. Could you share your order number so I can look into it?";
      run('INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)', id('msg'), cid, 'bot', reply, JSON.stringify({ latencyMs: 640 }), new Date(t0 + i * 120e3 + 1500).toISOString());
    });
    run("INSERT INTO messages (id, conversation_id, role, text, meta, created_at) VALUES (?, ?, 'system', 'Handed off to a human: User asked for a human', '{}', ?)", id('msg'), cid, new Date(t0 + 4 * 60e3).toISOString());
  }
  return true;
}

if (process.argv[1]?.endsWith('seed.js')) {
  console.log(seedDemo() ? 'Seeded demo@agentpress.dev / demo1234' : 'Database already has users; nothing to do.');
}
