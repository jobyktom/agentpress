// Browser end-to-end test: drives the real UI against a running server.
//   npm run build && PORT=3999 AGENTPRESS_DB=/tmp/e2e.db npm start
//   BASE=http://localhost:3999 node e2e/browser.cjs
// Needs Playwright with Chromium installed (npx playwright install chromium).
const { chromium } = require('playwright');

const B = process.env.BASE || 'http://localhost:3999';
const OUT = process.env.SHOTS || null;
const errors = [];
let passed = 0;

async function step(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.log('  ✗', name, '\n     ', e.message.split('\n')[0]); errors.push(name); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  ctx.setDefaultTimeout(10000);
  const watch = (p) => {
    p.on('pageerror', (e) => errors.push(`pageerror ${p.url()}: ${e.message}`));
    p.on('console', (m) => m.type() === 'error' && !/favicon|EventSource|net::ERR/.test(m.text()) && errors.push(`console ${p.url()}: ${m.text()}`));
  };
  const site = await ctx.newPage(); watch(site);
  const shot = (p, n) => OUT && p.screenshot({ path: `${OUT}/${n}.png` });

  console.log('Marketing site');
  for (const path of ['/', '/product', '/channels', '/pricing', '/docs', '/signup']) {
    await step(`page ${path} renders`, async () => {
      await site.goto(B + path);
      await site.locator('h1').first().waitFor();
    });
  }
  await step('pricing toggles monthly and yearly', async () => {
    await site.goto(B + '/pricing');
    await site.click('button:has-text("Monthly")'); await site.getByText('$99').waitFor();
    await site.click('button:has-text("Yearly")'); await site.getByText('$79').waitFor();
  });

  console.log('Web chat widget');
  const w = site.locator('#agentpress-widget');
  await step('widget answers from knowledge with a source', async () => {
    await site.goto(B + '/');
    await w.locator('button.launcher').click();
    await w.locator('.m.bot').first().waitFor();
    await w.locator('textarea').fill('Do you ship internationally?');
    await w.locator('button.send').click();
    await w.locator('.m.bot', { hasText: '40 countries' }).waitFor({ timeout: 10000 });
    await w.locator('.src').first().waitFor();
    await shot(site, 'widget');
  });
  await step('widget suggestion chips send a message', async () => {
    const chip = w.locator('.chip').first();
    if (await chip.count()) { await chip.click(); await w.locator('.m.user').nth(1).waitFor(); }
  });
  await step('widget hands off to a human', async () => {
    await w.locator('textarea').fill('I want to talk to a human');
    await w.locator('button.send').click();
    await w.locator('.m.bot', { hasText: 'connecting you' }).waitFor({ timeout: 10000 });
  });

  console.log('Dashboard');
  const app = await ctx.newPage(); watch(app);
  let ws;
  await step('log in with the demo account', async () => {
    await app.goto(B + '/login');
    await app.click('button:has-text("Log in")');
    await app.waitForURL(/\/app\/w\//);
    ws = app.url().replace(/\/$/, '');
  });
  await step('inbox reply reaches the widget live', async () => {
    await app.goto(ws + '/inbox');
    await app.getByText('Website visitor').first().click();
    await app.locator('textarea').fill('Hi! Sam from the team here.');
    await app.click('button:has-text("Send")');
    await w.locator('.m.agent', { hasText: 'Sam from the team' }).waitFor({ timeout: 10000 });
    await shot(app, 'inbox');
  });
  await step('close conversation prompts the widget rating', async () => {
    await app.click('button.btn-dark:has-text("Close")');
    await w.locator('.rate').waitFor({ timeout: 10000 });
    await w.locator('.rate button', { hasText: 'Yes' }).click();
    await w.getByText('Thanks for the feedback').waitFor();
  });

  for (const path of ['', '/usage', '/members', '/settings']) {
    await step(`workspace page ${path || '/'} renders`, async () => { await app.goto(ws + path); await app.locator('h1').first().waitFor(); });
  }
  await step('create an API key', async () => {
    await app.goto(ws + '/settings');
    await app.click('h3:has-text("API keys") + button');
    await app.locator('input[value^="ap_"]').waitFor();
  });

  let agentUrl;
  await step('create an agent from the lead template', async () => {
    await app.goto(ws);
    await app.click('button:has-text("New agent")');
    await app.click('button:has-text("Lead capture")');
    await app.fill('input[placeholder="e.g. Ava from Acme"]', 'E2E Leads');
    await app.click('button:has-text("Create agent")');
    await app.waitForURL(/agents\//);
    agentUrl = app.url().match(/.*\/agents\/[^/]+/)[0];
  });
  for (const s of ['overview', 'instructions', 'playbooks', 'knowledge', 'tools', 'escalation', 'channels', 'webchat', 'conversations', 'analytics', 'simulations', 'logs', 'versions']) {
    await step(`agent page ${s} renders`, async () => { await app.goto(`${agentUrl}/${s}`); await app.locator('h1').first().waitFor(); await shot(app, `agent-${s}`); });
  }
  await step('add an FAQ to knowledge', async () => {
    await app.goto(agentUrl + '/knowledge');
    await app.click('button:has-text("FAQ")');
    await app.fill('input[placeholder="What is your return policy?"]', 'Do you offer a free trial?');
    await app.locator('textarea').first().fill('Yes, every plan starts with a 14-day free trial.');
    await app.click('button:has-text("Save")');
    await app.getByText('Do you offer a free trial?').waitFor();
  });
  await step('preview runs the branching playbook and the new FAQ', async () => {
    await app.goto(agentUrl + '/playbooks');
    await app.locator('.react-flow__node').filter({ hasText: 'How big is your team' }).click();
    await app.click('header button:has-text("Preview")');
    const pv = app.locator('aside').last();
    const say = async (t) => { await pv.locator('input[aria-label="Preview message"]').fill(t); await pv.locator('button[aria-label="Send"]').click(); await app.waitForTimeout(600); };
    await say('Do you offer a free trial?');
    await pv.getByText('14-day free trial').waitFor({ timeout: 5000 });
    for (const t of ['book a demo', 'Jo', 'jo@x.io', '200+']) await say(t);
    await pv.getByText('enterprise specialist').waitFor({ timeout: 5000 });
    await shot(app, 'preview');
  });
  await step('publish version 1', async () => {
    await app.click('header button:has-text("Publish")');
    await app.click('button:has-text("Publish v1")');
    await app.getByText('Live · v1').first().waitFor();
  });
  await step('simulation passes against the working copy', async () => {
    await app.goto(agentUrl + '/simulations');
    await app.click('button:has-text("New")');
    await app.locator('textarea').first().fill('Do you offer a free trial?');
    await app.locator('textarea').nth(1).fill('14-day');
    await app.click('button:has-text("Save")');
    await app.click('button:has-text("Run all")');
    await app.getByText("Passed", { exact: true }).first().waitFor({ timeout: 8000 });
  });
  await step('web chat theme preset applies', async () => {
    await app.goto(agentUrl + '/webchat');
    await app.click('button:has-text("Graphite & orange")');
    await app.locator('input[value="#ee661b"]').first().waitFor();
  });
  await step('channel dialog shows the connect error from the provider', async () => {
    await app.goto(agentUrl + '/channels');
    await app.locator('.card', { hasText: 'Telegram' }).locator('button:has-text("Connect")').click();
    await app.fill('input[type=password]', '123:fake');
    await app.click('button:has-text("Save & connect")');
    await app.getByText(/Couldn't register with Telegram|Connected as/).first().waitFor({ timeout: 20000 });
  });
  await step('versions list shows v1', async () => { await app.goto(agentUrl + '/versions'); await app.getByText('v1').first().waitFor(); });

  console.log('Mobile');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } }); watch(m);
  for (const path of ['/', '/pricing', '/login']) {
    await step(`no horizontal scroll on ${path}`, async () => {
      await m.goto(B + path); await m.waitForTimeout(500);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) throw new Error(`overflows by ${over}px`);
    });
  }

  await step('log out', async () => {
    await app.goto(ws); await app.click('button[aria-label="Log out"]'); await app.waitForURL(B + '/');
  });

  await browser.close();
  const pageErrors = errors.filter((e) => /^(pageerror|console)/.test(e));
  console.log(`\n${passed} passed, ${errors.length - pageErrors.length} failed, ${pageErrors.length} browser errors`);
  pageErrors.forEach((e) => console.log('  !', e));
  process.exit(errors.length ? 1 : 0);
})();
