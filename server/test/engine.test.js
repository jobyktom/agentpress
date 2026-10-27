import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respond, interpolate } from '../engine.js';
import { search } from '../knowledge.js';
import { TEMPLATES } from '../templates.js';

delete process.env.ANTHROPIC_API_KEY;

test('interpolate fills nested variables', () => {
  assert.equal(interpolate('Hi {{name}}, order {{order.id}}', { name: 'Jo', order: { id: 7 } }), 'Hi Jo, order 7');
});

test('knowledge search ranks the matching FAQ first', () => {
  const kb = TEMPLATES.support.build('Bot').knowledge;
  assert.match(search(kb, 'how long is shipping')[0].text, /3–5 business days/);
});

test('playbook asks, validates and finishes', async () => {
  const config = TEMPLATES.support.build('Bot');
  let r = await respond({ config, text: 'where is my order?' });
  assert.match(r.replies[0].text, /order number/);
  r = await respond({ config, meta: r.meta, text: 'A-1' });
  assert.match(r.replies[0].text, /email/);
  r = await respond({ config, meta: r.meta, text: 'not-an-email' });
  assert.match(r.replies[0].text, /doesn't look valid/);
  r = await respond({ config, meta: r.meta, text: 'a@b.co' });
  assert.match(r.replies[0].text, /Order A-1 for a@b\.co/);
  assert.equal(r.meta.playbook, null);
});

test('condition branches to the right step', async () => {
  const config = TEMPLATES.leads.build('Bot');
  let r = await respond({ config, text: 'book a demo' });
  for (const t of ['Jo', 'jo@x.io', '11–50']) r = await respond({ config, meta: r.meta, text: t });
  assert.match(r.replies[0].text, /booking link/);
  assert.equal(r.handoff, null);
});

test('escalation keywords hand off', async () => {
  const r = await respond({ config: TEMPLATES.blank.build('Bot'), text: 'can I talk to a human' });
  assert.ok(r.handoff);
});

test('unknown questions are flagged as gaps', async () => {
  const r = await respond({ config: TEMPLATES.blank.build('Bot'), text: 'what is the airspeed of a swallow' });
  assert.equal(r.gap, true);
});
