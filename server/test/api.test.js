import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.AGENTPRESS_DB = ':memory:';
let base, server;

before(async () => {
  const app = (await import('../index.js')).default;
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(() => { server.closeAllConnections(); server.close(); });

const call = async (path, { token, ...opts } = {}) => {
  const res = await fetch(base + path, { ...opts, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: opts.body && JSON.stringify(opts.body) });
  return { status: res.status, body: await res.json() };
};

test('signup, create agent, chat, hand off, reply, publish', async (t) => {
  const s = await call('/auth/signup', { method: 'POST', body: { name: 'Ana Test', email: 'ana@test.dev', password: 'password1' } });
  assert.equal(s.status, 200);
  const token = s.body.token;
  const [ws] = (await call('/workspaces', { token })).body;
  const agent = (await call(`/workspaces/${ws.id}/agents`, { method: 'POST', token, body: { name: 'Helper', template: 'support' } })).body;
  assert.equal(agent.config.playbooks.length, 1);

  const pub = await call(`/agents/${agent.id}/publish`, { method: 'POST', token, body: { note: 'v1' } });
  assert.equal(pub.body.publishedVersion, 1);

  const chat = await call(`/chat/${agent.id}/messages`, { method: 'POST', body: { userId: 'visitor-0001', text: 'What is your return policy?' } });
  assert.match(chat.body.messages.at(-1).text, /30 days/);

  const handoff = await call(`/chat/${agent.id}/messages`, { method: 'POST', body: { userId: 'visitor-0001', text: 'I need a human' } });
  assert.equal(handoff.body.conversation.status, 'human');

  const inbox = (await call(`/workspaces/${ws.id}/inbox?status=human`, { token })).body;
  assert.equal(inbox.length, 1);
  const reply = await call(`/conversations/${inbox[0].id}/messages`, { method: 'POST', token, body: { text: 'Hi, Ana here' } });
  assert.equal(reply.body.role, 'agent');

  const other = await call('/auth/signup', { method: 'POST', body: { name: 'Eve', email: 'eve@test.dev', password: 'password1' } });
  const denied = await call(`/agents/${agent.id}`, { token: other.body.token });
  assert.equal(denied.status, 404, 'other users cannot read the agent');

  const channels = (await call(`/agents/${agent.id}/channels`, { token })).body;
  assert.equal(channels.find((c) => c.type === 'webchat').status, 'live');
  assert.equal(channels.length, 13);
});
