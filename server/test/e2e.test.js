// End-to-end tests over the HTTP API: every feature a workspace uses, plus an
// inbound and outbound round trip on every messaging channel. Provider APIs
// (Telegram, Meta, Slack, ...) are replaced by a recording fake so the tests
// run offline.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.AGENTPRESS_DB = ':memory:';
process.env.ALLOW_PRIVATE_FETCH = '1';
delete process.env.ANTHROPIC_API_KEY;

let base, server, site, siteUrl;
const sent = [];
const realFetch = globalThis.fetch;

// Fake provider responses, keyed by host.
function fakeProvider(url, init) {
  const u = new URL(url);
  // Form bodies (Twilio) are decoded so assertions can read the text.
  const body = init?.body ? String(init.body) : '';
  sent.push({ host: u.host, path: u.pathname, body: body.startsWith('{') ? body : decodeURIComponent(body.replace(/\+/g, ' ')) });
  const reply = (obj) => new Response(JSON.stringify(obj), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.host === 'api.telegram.org' && u.pathname.endsWith('/getMe')) return reply({ ok: true, result: { username: 'acme_bot' } });
  if (u.host === 'chatapi.viber.com') return reply({ status: 0 });
  if (u.host === 'login.microsoftonline.com') return reply({ access_token: 'teams-token' });
  return reply({ ok: true });
}

before(async () => {
  globalThis.fetch = (url, init) => {
    const u = new URL(String(url));
    return ['localhost', '127.0.0.1'].includes(u.hostname) ? realFetch(url, init) : Promise.resolve(fakeProvider(String(url), init));
  };
  site = http.createServer((req, res) => {
    if (req.url.startsWith('/orders/')) {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ order: req.url.split('/').pop(), status: 'shipped' }));
    }
    res.setHeader('content-type', 'text/html');
    res.end('<html><head><title>Acme Help</title><style>p{}</style></head><body><nav>Menu</nav><p>Gift cards never expire and can be used online.</p></body></html>');
  }).listen(0);
  siteUrl = `http://127.0.0.1:${site.address().port}`;
  const app = (await import('../index.js')).default;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => { globalThis.fetch = realFetch; server.closeAllConnections(); server.close(); site.close(); });

async function call(path, { token, raw, headers = {}, ...opts } = {}) {
  const res = await realFetch(base + path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (opts.body && JSON.stringify(opts.body)),
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}
const until = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v || Date.now() > end) return v; await new Promise((r) => setTimeout(r, 40)); }
};

let owner, ws, agent;

test('accounts and sessions', async () => {
  const bad = await call('/api/auth/signup', { method: 'POST', body: { name: 'X', email: 'nope', password: 'password1' } });
  assert.equal(bad.status, 400);
  const short = await call('/api/auth/signup', { method: 'POST', body: { name: 'X', email: 'x@test.dev', password: 'short' } });
  assert.equal(short.status, 400);

  const s = await call('/api/auth/signup', { method: 'POST', body: { name: 'Olive Owner', email: 'olive@test.dev', password: 'password1' } });
  assert.equal(s.status, 200);
  const dup = await call('/api/auth/signup', { method: 'POST', body: { name: 'Olive', email: 'OLIVE@test.dev', password: 'password1' } });
  assert.equal(dup.status, 409);

  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'olive@test.dev', password: 'wrong-pass' } })).status, 401);
  const login = await call('/api/auth/login', { method: 'POST', body: { email: 'Olive@test.dev', password: 'password1' } });
  assert.equal(login.status, 200);
  owner = login.body.token;

  const me = await call('/api/auth/me', { token: owner });
  assert.equal(me.body.user.email, 'olive@test.dev');
  assert.equal(me.body.llm, false);

  const tmp = (await call('/api/auth/login', { method: 'POST', body: { email: 'olive@test.dev', password: 'password1' } })).body.token;
  await call('/api/auth/logout', { method: 'POST', token: tmp });
  assert.equal((await call('/api/auth/me', { token: tmp })).status, 401);
  assert.equal((await call('/api/workspaces')).status, 401);
});

test('workspaces, members and roles', async () => {
  [ws] = (await call('/api/workspaces', { token: owner })).body;
  assert.equal(ws.role, 'owner');
  const renamed = await call(`/api/workspaces/${ws.id}`, { method: 'PATCH', token: owner, body: { name: 'Acme' } });
  assert.equal(renamed.body.name, 'Acme');
  const extra = await call('/api/workspaces', { method: 'POST', token: owner, body: { name: 'Side project' } });
  assert.equal((await call('/api/workspaces', { token: owner })).body.length, 2);
  assert.equal((await call(`/api/workspaces/${extra.body.id}`, { method: 'DELETE', token: owner })).status, 200);

  const v = await call('/api/auth/signup', { method: 'POST', body: { name: 'Vic Viewer', email: 'vic@test.dev', password: 'password1' } });
  assert.equal((await call(`/api/workspaces/${ws.id}/members`, { method: 'POST', token: owner, body: { email: 'ghost@test.dev' } })).status, 404);
  assert.equal((await call(`/api/workspaces/${ws.id}/members`, { method: 'POST', token: owner, body: { email: 'vic@test.dev', role: 'viewer' } })).status, 200);
  const members = (await call(`/api/workspaces/${ws.id}/members`, { token: owner })).body;
  assert.equal(members.length, 2);
  const vic = members.find((m) => m.email === 'vic@test.dev');

  // Viewers can read but not change anything.
  assert.equal((await call(`/api/workspaces/${ws.id}`, { token: v.body.token })).status, 200);
  assert.equal((await call(`/api/workspaces/${ws.id}/agents`, { method: 'POST', token: v.body.token, body: { name: 'Nope' } })).status, 403);
  assert.equal((await call(`/api/workspaces/${ws.id}/keys`, { token: v.body.token })).status, 403);

  const olive = members.find((m) => m.role === 'owner');
  assert.equal((await call(`/api/workspaces/${ws.id}/members/${olive.id}`, { method: 'PATCH', token: owner, body: { role: 'viewer' } })).status, 403);
  assert.equal((await call(`/api/workspaces/${ws.id}/members/${vic.id}`, { method: 'PATCH', token: owner, body: { role: 'editor' } })).status, 200);
  assert.equal((await call(`/api/workspaces/${ws.id}/agents`, { method: 'POST', token: v.body.token, body: { name: 'Vic bot' } })).status, 200);
  assert.equal((await call(`/api/workspaces/${ws.id}/members/${vic.id}`, { method: 'DELETE', token: owner })).status, 200);
  assert.equal((await call(`/api/workspaces/${ws.id}`, { token: v.body.token })).status, 404);
});

test('agents: templates, edit, duplicate, delete', async () => {
  const templates = (await call('/api/templates')).body.map((t) => t.key);
  assert.deepEqual(templates.sort(), ['blank', 'booking', 'leads', 'support']);
  for (const template of templates) {
    const a = await call(`/api/workspaces/${ws.id}/agents`, { method: 'POST', token: owner, body: { name: `T ${template}`, template } });
    assert.equal(a.status, 200, template);
  }
  assert.equal((await call(`/api/workspaces/${ws.id}/agents`, { method: 'POST', token: owner, body: { name: ' ' } })).status, 400);

  agent = (await call(`/api/workspaces/${ws.id}/agents`, { method: 'POST', token: owner, body: { name: 'Acme Help', template: 'support' } })).body;
  const cfg = agent.config;
  cfg.knowledge.push({ id: 'k_web', type: 'text', title: 'Gift cards', content: 'Gift cards never expire and can be used online or in store.' });
  cfg.escalation.keywords = ['human', 'agent', 'complaint'];
  const patched = await call(`/api/agents/${agent.id}`, { method: 'PATCH', token: owner, body: { name: 'Acme Helper', color: '#e8590c', config: cfg } });
  assert.equal(patched.body.name, 'Acme Helper');
  assert.equal(patched.body.config.knowledge.length, 4);

  const dup = await call(`/api/agents/${agent.id}/duplicate`, { method: 'POST', token: owner });
  assert.equal(dup.body.name, 'Acme Helper (copy)');
  assert.equal((await call(`/api/agents/${dup.body.id}`, { method: 'DELETE', token: owner })).status, 200);
  assert.equal((await call(`/api/agents/${dup.body.id}`, { token: owner })).status, 404);

  const list = (await call(`/api/workspaces/${ws.id}/agents`, { token: owner })).body;
  assert.ok(list.find((a) => a.id === agent.id).channels.includes('webchat'));
});

test('knowledge import and HTTP tools', async () => {
  const page = await call(`/api/agents/${agent.id}/knowledge/fetch`, { method: 'POST', token: owner, body: { url: siteUrl } });
  assert.equal(page.body.title, 'Acme Help');
  assert.match(page.body.content, /Gift cards never expire/);
  assert.doesNotMatch(page.body.content, /p\{\}/);
  assert.equal((await call(`/api/agents/${agent.id}/knowledge/fetch`, { method: 'POST', token: owner, body: { url: 'ftp://x' } })).status, 400);

  const tool = { name: 'lookup_order', method: 'GET', url: `${siteUrl}/orders/{{order}}` };
  const r = await call(`/api/agents/${agent.id}/tools/test`, { method: 'POST', token: owner, body: { tool, args: { order: 'A 1' } } });
  assert.deepEqual(r.body.data, { order: 'A%201', status: 'shipped' });
});

test('preview runs the working copy, playbooks and validators', async () => {
  const say = (text) => call(`/api/agents/${agent.id}/preview`, { method: 'POST', token: owner, body: { sessionId: 'pv-1', text } });
  let r = await say('where is my order');
  assert.match(r.body.messages.at(-1).text, /order number/);
  r = await say('A-1001');
  assert.match(r.body.messages.at(-1).text, /email/);
  r = await say('not-an-email');
  assert.match(r.body.messages.at(-1).text, /doesn't look valid/);
  r = await say('sam@acme.io');
  assert.match(r.body.messages.at(-1).text, /Order A-1001 for sam@acme.io is on its way/);

  r = await say('Do gift cards expire?');
  assert.match(r.body.messages.at(-1).text, /never expire/);
  r = await say('What colour is the moon on Tuesdays?');
  assert.equal(r.body.messages.at(-1).meta.gap, true);

  const previews = (await call(`/api/agents/${agent.id}/conversations?source=preview`, { token: owner })).body;
  assert.equal(previews.length, 1);
  await call(`/api/agents/${agent.id}/preview/pv-1`, { method: 'DELETE', token: owner });
  assert.equal((await call(`/api/agents/${agent.id}/conversations?source=preview`, { token: owner })).body.length, 0);

  // A lead playbook with a condition branch.
  const leads = (await call(`/api/workspaces/${ws.id}/agents`, { token: owner })).body.find((a) => a.name === 'T leads');
  const lsay = (text) => call(`/api/agents/${leads.id}/preview`, { method: 'POST', token: owner, body: { sessionId: 'pv-2', text } });
  await lsay('book a demo'); await lsay('Jo'); r = await lsay('jo@x.io');
  assert.deepEqual(r.body.messages.at(-1).meta.choices, ['1–10', '11–50', '51–200', '200+']);
  r = await lsay('200+');
  assert.match(r.body.messages.map((m) => m.text).join(' '), /enterprise specialist/);
  assert.equal(r.body.conversation.status, 'human');
});

test('publish, versions and restore', async () => {
  const v1 = await call(`/api/agents/${agent.id}/publish`, { method: 'POST', token: owner, body: { note: 'First launch' } });
  assert.equal(v1.body.publishedVersion, 1);

  const cfg = v1.body.config; cfg.greeting = 'Changed greeting';
  await call(`/api/agents/${agent.id}`, { method: 'PATCH', token: owner, body: { config: cfg } });
  assert.notEqual((await call(`/api/chat/${agent.id}/config`)).body.greeting, 'Changed greeting', 'live chat uses the published copy');

  const v2 = await call(`/api/agents/${agent.id}/publish`, { method: 'POST', token: owner, body: {} });
  assert.equal(v2.body.publishedVersion, 2);
  assert.equal((await call(`/api/chat/${agent.id}/config`)).body.greeting, 'Changed greeting');

  const versions = (await call(`/api/agents/${agent.id}/versions`, { token: owner })).body;
  assert.deepEqual(versions.map((v) => v.version), [2, 1]);
  assert.equal(versions[1].note, 'First launch');
  const restored = await call(`/api/agents/${agent.id}/versions/1/restore`, { method: 'POST', token: owner });
  assert.notEqual(restored.body.config.greeting, 'Changed greeting');
  assert.equal((await call(`/api/agents/${agent.id}/versions/9/restore`, { method: 'POST', token: owner })).status, 404);
});

test('web chat widget: answers, handoff, live human reply, rating', async () => {
  assert.equal((await realFetch(`${base}/widget.js`)).headers.get('access-control-allow-origin'), '*');
  const cfg = await call(`/api/chat/${agent.id}/config`);
  assert.equal(cfg.body.name, 'Acme Helper');
  assert.equal((await call(`/api/chat/${agent.id}/messages`, { method: 'POST', body: { userId: 'bad id!', text: 'hi' } })).status, 400);

  const user = 'visitor-e2e-01';
  const a = await call(`/api/chat/${agent.id}/messages`, { method: 'POST', body: { userId: user, text: 'How long does shipping take?' } });
  assert.match(a.body.messages.at(-1).text, /3–5 business days/);
  assert.ok(a.body.messages.at(-1).meta.sources?.length, 'answers cite their source');

  const h = await call(`/api/chat/${agent.id}/messages`, { method: 'POST', body: { userId: user, text: 'I want to speak to a human' } });
  assert.equal(h.body.conversation.status, 'human');

  // Listen on the widget stream, then reply from the inbox.
  const ctrl = new AbortController();
  const stream = await realFetch(`${base}/api/chat/${agent.id}/stream?userId=${user}`, { signal: ctrl.signal });
  const reader = stream.body.getReader();
  const inbox = (await call(`/api/workspaces/${ws.id}/inbox`, { token: owner })).body;
  const conv = inbox.find((c) => c.external_id === user);
  assert.ok(conv, 'escalation shows up in the inbox');
  await call(`/api/conversations/${conv.id}/messages`, { method: 'POST', token: owner, body: { text: 'Hi, Olive here!' } });
  let got = '';
  while (!got.includes('Olive here')) got += new TextDecoder().decode((await reader.read()).value);
  ctrl.abort();

  // While a human owns the chat the bot stays quiet.
  const quiet = await call(`/api/chat/${agent.id}/messages`, { method: 'POST', body: { userId: user, text: 'Thanks!' } });
  assert.equal(quiet.body.messages.length, 1);

  const hist = await call(`/api/chat/${agent.id}/history?userId=${user}`);
  assert.ok(hist.body.messages.some((m) => m.role === 'agent'));

  await call(`/api/conversations/${conv.id}/status`, { method: 'POST', token: owner, body: { status: 'bot' } });
  const back = await call(`/api/chat/${agent.id}/messages`, { method: 'POST', body: { userId: user, text: 'Do you ship internationally?' } });
  assert.match(back.body.messages.at(-1).text, /40 countries/);
  await call(`/api/conversations/${conv.id}/status`, { method: 'POST', token: owner, body: { status: 'closed' } });

  assert.equal((await call(`/api/chat/${agent.id}/rating`, { method: 'POST', body: { userId: user, rating: 9 } })).status, 400);
  await call(`/api/chat/${agent.id}/rating`, { method: 'POST', body: { userId: user, rating: 5 } });
  const detail = await call(`/api/conversations/${conv.id}`, { token: owner });
  assert.equal(detail.body.conversation.rating, 5);
  assert.equal(detail.body.conversation.status, 'closed');

  const search = (await call(`/api/agents/${agent.id}/conversations?q=Olive`, { token: owner })).body;
  assert.equal(search.length, 1);
});

test('REST API channel with workspace keys', async () => {
  const key = (await call(`/api/workspaces/${ws.id}/keys`, { method: 'POST', token: owner, body: { name: 'CRM' } })).body.key;
  assert.match(key, /^ap_/);
  const keys = (await call(`/api/workspaces/${ws.id}/keys`, { token: owner })).body;
  assert.equal(keys[0].prefix, key.slice(0, 10));

  assert.equal((await call(`/api/v1/agents/${agent.id}/messages`, { method: 'POST', body: { userId: 'u1', text: 'hi' }, headers: { authorization: 'Bearer ap_wrong' } })).status, 401);
  const r = await call(`/api/v1/agents/${agent.id}/messages`, { method: 'POST', body: { userId: 'crm-42', text: 'What is your return policy?' }, headers: { authorization: `Bearer ${key}` } });
  assert.match(r.body.replies[0].text, /30 days/);

  await call(`/api/workspaces/${ws.id}/keys/${keys[0].id}`, { method: 'DELETE', token: owner });
  assert.equal((await call(`/api/v1/agents/${agent.id}/messages`, { method: 'POST', body: { userId: 'crm-42', text: 'hi' }, headers: { authorization: `Bearer ${key}` } })).status, 401);
});

/* ---------- messaging channels ---------- */

const discordKeys = generateKeyPairSync('ed25519');
const discordPublicKey = discordKeys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');

const CHANNELS = {
  telegram: {
    config: { botToken: '123:abc' },
    expectSetup: /setWebhook/,
    inbound: (ch) => ({ headers: { 'x-telegram-bot-api-secret-token': ch.secret }, body: { message: { chat: { id: 555 }, from: { first_name: 'Tia' }, text: 'Do you ship internationally?' } } }),
    unsigned: { headers: {}, body: { message: { chat: { id: 1 }, text: 'x' } } },
    outHost: 'api.telegram.org', user: '555',
  },
  viber: {
    config: { authToken: 'viber-token', senderName: 'Acme' },
    expectSetup: /set_webhook/,
    inbound: () => { const raw = JSON.stringify({ event: 'message', sender: { id: 'vb-1', name: 'Vera' }, message: { type: 'text', text: 'Do you ship internationally?' } }); return { raw, headers: { 'x-viber-content-signature': createHmac('sha256', 'viber-token').update(raw).digest('hex') } }; },
    unsigned: { headers: { 'x-viber-content-signature': 'bad' }, body: { event: 'message' } },
    outHost: 'chatapi.viber.com', user: 'vb-1',
  },
  whatsapp: {
    config: { phoneNumberId: '111', accessToken: 'wa-token', verifyToken: 'verify-me', appSecret: 'wa-secret' },
    verify: { token: 'verify-me' },
    inbound: () => { const raw = JSON.stringify({ entry: [{ changes: [{ value: { contacts: [{ wa_id: '447700', profile: { name: 'Wes' } }], messages: [{ from: '447700', text: { body: 'Do you ship internationally?' } }] } }] }] }); return { raw, headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', 'wa-secret').update(raw).digest('hex') } }; },
    unsigned: { headers: { 'x-hub-signature-256': 'sha256=00' }, body: {} },
    outHost: 'graph.facebook.com', user: '447700',
  },
  messenger: {
    config: { pageId: 'p1', pageAccessToken: 'pg-token', verifyToken: 'verify-me', appSecret: 'fb-secret' },
    verify: { token: 'verify-me' },
    inbound: () => { const raw = JSON.stringify({ entry: [{ messaging: [{ sender: { id: 'psid-1' }, message: { text: 'Do you ship internationally?' } }] }] }); return { raw, headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', 'fb-secret').update(raw).digest('hex') } }; },
    unsigned: { headers: {}, body: {} },
    outHost: 'graph.facebook.com', user: 'psid-1',
  },
  instagram: {
    config: { igUserId: 'ig1', pageAccessToken: 'pg-token', verifyToken: 'verify-me', appSecret: 'ig-secret' },
    verify: { token: 'verify-me' },
    inbound: () => { const raw = JSON.stringify({ entry: [{ messaging: [{ sender: { id: 'igsid-1' }, message: { text: 'Do you ship internationally?' } }] }] }); return { raw, headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', 'ig-secret').update(raw).digest('hex') } }; },
    unsigned: { headers: {}, body: {} },
    outHost: 'graph.facebook.com', user: 'igsid-1',
  },
  slack: {
    config: { botToken: 'xoxb-1', signingSecret: 'slack-secret' },
    challenge: { body: { type: 'url_verification', challenge: 'ch-123' }, expect: { challenge: 'ch-123' } },
    inbound: () => { const raw = JSON.stringify({ event: { type: 'message', channel: 'C1', user: 'U1', text: 'Do you ship internationally?' } }); const ts = String(Math.floor(Date.now() / 1000)); return { raw, headers: { 'x-slack-request-timestamp': ts, 'x-slack-signature': 'v0=' + createHmac('sha256', 'slack-secret').update(`v0:${ts}:${raw}`).digest('hex') } }; },
    unsigned: { headers: { 'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)), 'x-slack-signature': 'v0=bad' }, body: { event: {} } },
    outHost: 'slack.com', user: 'C1',
  },
  line: {
    config: { channelAccessToken: 'line-token', channelSecret: 'line-secret' },
    inbound: () => { const raw = JSON.stringify({ events: [{ type: 'message', source: { userId: 'Uline1' }, message: { type: 'text', text: 'Do you ship internationally?' } }] }); return { raw, headers: { 'x-line-signature': createHmac('sha256', 'line-secret').update(raw).digest('base64') } }; },
    unsigned: { headers: { 'x-line-signature': 'bad' }, body: {} },
    outHost: 'api.line.me', user: 'Uline1',
  },
  discord: {
    config: { applicationId: 'app1', botToken: 'discord-token', publicKey: discordPublicKey },
    inbound: () => {
      const raw = JSON.stringify({ type: 2, token: 'itok', channel_id: 'D1', member: { user: { username: 'dee' } }, data: { name: 'ask', options: [{ name: 'message', value: 'Do you ship internationally?' }] } });
      const ts = String(Math.floor(Date.now() / 1000));
      return { raw, headers: { 'x-signature-timestamp': ts, 'x-signature-ed25519': sign(null, Buffer.from(ts + raw), discordKeys.privateKey).toString('hex') } };
    },
    unsigned: { headers: { 'x-signature-timestamp': '1', 'x-signature-ed25519': '00' }, body: { type: 1 } },
    outHost: 'discord.com', user: 'D1',
  },
  teams: {
    config: { appId: 'teams-app', appPassword: 'teams-pass' },
    inbound: () => ({ body: { type: 'message', id: 'act1', text: 'Do you ship internationally?', serviceUrl: 'https://smba.trafficmanager.net/emea/', conversation: { id: 'tconv-1' }, from: { name: 'Tom' } } }),
    outHost: 'smba.trafficmanager.net', user: 'tconv-1',
  },
  twilio: {
    config: { accountSid: 'AC1', authToken: 'tw-token', phoneNumber: '+15550000' },
    inbound: (ch) => {
      const params = { From: '+15551234', Body: 'Do you ship internationally?' };
      const data = ch.url + Object.keys(params).sort().map((k) => k + params[k]).join('');
      return { form: params, headers: { 'x-twilio-signature': createHmac('sha1', 'tw-token').update(data).digest('base64') } };
    },
    unsigned: { form: { From: '+1', Body: 'x' }, headers: { 'x-twilio-signature': 'bad' } },
    outHost: 'api.twilio.com', user: '+15551234',
  },
  email: {
    config: { inboundAddress: 'help@acme.dev', replyFrom: 'Acme <help@acme.dev>', resendApiKey: 're_123' },
    inbound: () => ({ body: { from: 'erin@example.com', subject: 'Shipping', text: 'Do you ship internationally?\n\nOn Mon, Acme wrote:\n> old' } }),
    outHost: 'api.resend.com', user: 'erin@example.com',
  },
};

for (const [type, spec] of Object.entries(CHANNELS)) {
  test(`channel: ${type} connects, receives, replies`, async () => {
    sent.length = 0;
    const put = await call(`/api/agents/${agent.id}/channels/${type}`, { method: 'PUT', token: owner, body: { enabled: true, config: spec.config } });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.equal(put.body.status, 'live', `${type}: ${put.body.lastError || put.body.missing}`);
    if (spec.expectSetup) assert.ok(sent.some((s) => spec.expectSetup.test(s.path)), `${type} registered its webhook`);
    for (const [k, v] of Object.entries(spec.config)) if (/token|secret|password|key/i.test(k)) assert.notEqual(put.body.config[k], v, `${type}.${k} is masked`);

    // Saving the masked values back leaves the secrets unchanged.
    const again = await call(`/api/agents/${agent.id}/channels/${type}`, { method: 'PUT', token: owner, body: { enabled: true, config: put.body.config } });
    assert.equal(again.body.status, 'live');

    const hookPath = new URL(put.body.webhookUrl).pathname;
    const { one } = await import('../db.js');
    const row = one('SELECT webhook_secret FROM channels WHERE agent_id = ? AND type = ?', agent.id, type);
    const ch = { secret: row.webhook_secret, url: put.body.webhookUrl };

    if (spec.verify) {
      const ok = await realFetch(`${base}${hookPath}?hub.mode=subscribe&hub.verify_token=${spec.verify.token}&hub.challenge=42`);
      assert.equal(await ok.text(), '42');
      assert.equal((await realFetch(`${base}${hookPath}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42`)).status, 403);
    }
    if (spec.challenge) {
      const c = await call(hookPath, { method: 'POST', body: spec.challenge.body });
      assert.deepEqual(c.body, spec.challenge.expect);
    }
    const post = (msg) => msg.form
      ? call(hookPath, { method: 'POST', raw: new URLSearchParams(msg.form).toString(), headers: { 'content-type': 'application/x-www-form-urlencoded', ...msg.headers } })
      : call(hookPath, { method: 'POST', raw: msg.raw ?? JSON.stringify(msg.body), headers: msg.headers || {} });
    if (spec.unsigned) assert.equal((await post(spec.unsigned)).status, 401, `${type} rejects unsigned webhooks`);

    sent.length = 0;
    const res = await post(spec.inbound(ch));
    assert.ok(res.status < 300, `${type} webhook accepted (${res.status})`);
    const conv = await until(async () => (await call(`/api/agents/${agent.id}/conversations?channel=${type}`, { token: owner })).body.find((c) => c.external_id === spec.user));
    assert.ok(conv, `${type} conversation created`);
    const out = await until(() => sent.find((s) => s.host === spec.outHost && /40 countries/.test(s.body)));
    assert.ok(out, `${type} reply delivered via ${spec.outHost}: ${JSON.stringify(sent)}`);

    // A human reply from the inbox goes out on the same channel.
    sent.length = 0;
    await call(`/api/conversations/${conv.id}/messages`, { method: 'POST', token: owner, body: { text: 'Human here on ' + type } });
    assert.ok(sent.some((s) => s.host === spec.outHost && s.body.includes('Human here')), `${type} human reply delivered`);

    const off = await call(`/api/agents/${agent.id}/channels/${type}`, { method: 'PUT', token: owner, body: { enabled: false } });
    assert.equal(off.body.status, 'disabled');
    await call(`/api/agents/${agent.id}/channels/${type}`, { method: 'DELETE', token: owner });
  });
}

test('channel setup errors are reported', async () => {
  const prev = globalThis.fetch;
  globalThis.fetch = (url, init) => (String(url).includes('telegram') ? Promise.resolve(new Response('{"ok":false,"description":"Unauthorized"}', { status: 401 })) : prev(url, init));
  const r = await call(`/api/agents/${agent.id}/channels/telegram`, { method: 'PUT', token: owner, body: { enabled: true, config: { botToken: 'bad' } } });
  globalThis.fetch = prev;
  assert.equal(r.body.status, 'error');
  assert.match(r.body.lastError, /Couldn't register with Telegram: HTTP 401/);
  const needs = await call(`/api/agents/${agent.id}/channels/whatsapp`, { method: 'PUT', token: owner, body: { enabled: true, config: { phoneNumberId: '1' } } });
  assert.equal(needs.body.status, 'needs_setup');
  assert.deepEqual(needs.body.missing, ['accessToken', 'verifyToken']);
  assert.equal((await call(`/api/agents/${agent.id}/channels/webchat`, { method: 'DELETE', token: owner })).status, 400);
});

test('simulations, analytics, usage, logs', async () => {
  const sim = await call(`/api/agents/${agent.id}/simulations`, { method: 'POST', token: owner, body: { name: 'Returns', input: 'What is your return policy?', expect: '30 days' } });
  const failing = await call(`/api/agents/${agent.id}/simulations`, { method: 'POST', token: owner, body: { input: 'track my order\nA-1\nbad', expect: 'refund issued' } });
  const runAll = (await call(`/api/agents/${agent.id}/simulations/run`, { method: 'POST', token: owner, body: {} })).body;
  assert.equal(runAll.find((s) => s.id === sim.body.id).last_status, 'passed');
  assert.equal(runAll.find((s) => s.id === failing.body.id).last_status, 'failed');
  await call(`/api/agents/${agent.id}/simulations/${failing.body.id}`, { method: 'DELETE', token: owner });
  assert.equal((await call(`/api/agents/${agent.id}/simulations`, { token: owner })).body.length, 1);

  const an = (await call(`/api/agents/${agent.id}/analytics?days=14`, { token: owner })).body;
  assert.ok(an.totals.conversations >= 12, `conversations: ${an.totals.conversations}`);
  assert.ok(an.totals.handoffs >= 1);
  assert.equal(an.totals.rating, 5);
  assert.ok(an.byChannel.length >= 10);
  assert.ok(an.totals.p50LatencyMs != null);

  const usage = (await call(`/api/workspaces/${ws.id}/usage`, { token: owner })).body;
  assert.ok(usage.rows.reduce((n, r) => n + r.n, 0) > 10);
  const wsd = (await call(`/api/workspaces/${ws.id}`, { token: owner })).body;
  assert.ok(wsd.stats.conversations >= 12);

  const logs = (await call(`/api/agents/${agent.id}/logs`, { token: owner })).body;
  assert.ok(logs.some((l) => l.type === 'publish'));
  assert.ok(logs.some((l) => l.type === 'channel' && l.level === 'warn'), 'rejected webhooks are logged');
  assert.ok((await call(`/api/agents/${agent.id}/logs?level=error`, { token: owner })).body.every((l) => l.level === 'error'));
});

test('workspace isolation and SPA routes', async () => {
  const eve = (await call('/api/auth/signup', { method: 'POST', body: { name: 'Eve', email: 'eve@test.dev', password: 'password1' } })).body.token;
  assert.equal((await call(`/api/agents/${agent.id}`, { token: eve })).status, 404);
  assert.equal((await call(`/api/workspaces/${ws.id}/inbox`, { token: eve })).status, 404);
  const conv = (await call(`/api/agents/${agent.id}/conversations`, { token: owner })).body[0];
  assert.equal((await call(`/api/conversations/${conv.id}`, { token: eve })).status, 404);
  assert.equal((await call(`/api/conversations/${conv.id}/messages`, { method: 'POST', token: eve, body: { text: 'x' } })).status, 404);
});

test('server-side fetches refuse private addresses by default', async () => {
  delete process.env.ALLOW_PRIVATE_FETCH;
  try {
    for (const url of [siteUrl, 'http://169.254.169.254/latest/meta-data/', 'http://[::1]:22/']) {
      const r = await call(`/api/agents/${agent.id}/knowledge/fetch`, { method: 'POST', token: owner, body: { url } });
      assert.equal(r.status, 422, url);
      const t = await call(`/api/agents/${agent.id}/tools/test`, { method: 'POST', token: owner, body: { tool: { url, method: 'GET' } } });
      assert.equal(t.body.ok, false, url);
    }
  } finally { process.env.ALLOW_PRIVATE_FETCH = '1'; }
});
