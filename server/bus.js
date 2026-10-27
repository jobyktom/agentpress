import { EventEmitter } from 'node:events';

// In-process pub/sub that feeds the server-sent event streams used by the
// inbox, the preview panel and the web chat widget.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export function sse(req, res, topics, filter = () => true) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write(': connected\n\n');
  const handler = (topic) => (payload) => { if (filter(payload)) res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`); };
  const handlers = topics.map((t) => [t, handler(t)]);
  for (const [t, h] of handlers) bus.on(t, h);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); for (const [t, h] of handlers) bus.off(t, h); });
}
