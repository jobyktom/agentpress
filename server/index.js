import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { api } from './routes/api.js';
import { pub } from './routes/public.js';
import { seedDemo } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(express.json({ limit: '5mb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: false, verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));

// The chat widget and its endpoints are embedded on customers' sites.
app.use(['/api/chat', '/widget.js', '/api/v1'], (req, res, next) => {
  res.set('access-control-allow-origin', '*');
  res.set('access-control-allow-headers', 'content-type, authorization');
  res.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// EventSource can't send headers, so streams accept ?token=.
app.use('/api', (req, _res, next) => {
  if (!req.headers.authorization && req.query.token) req.headers.authorization = `Bearer ${req.query.token}`;
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', pub);
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(join(here, 'public'), { maxAge: '1h' }));
const dist = join(here, '..', 'web', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1d', index: false }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

if (process.env.SEED_DEMO !== '0' && process.env.NODE_ENV !== 'test' && seedDemo()) console.log('Seeded demo account: demo@agentpress.dev / demo1234');

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`AgentPress running on http://localhost:${port}`));
}
export default app;
