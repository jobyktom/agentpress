import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Fetches made on behalf of users (website import, HTTP tools) must not reach
// the server's own network: localhost, private ranges or cloud metadata.
// Set ALLOW_PRIVATE_FETCH=1 to allow them, e.g. for an intranet API.

function isPrivate(ip) {
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('ff');
}

async function assertPublic(url) {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https URLs are allowed');
  if (process.env.ALLOW_PRIVATE_FETCH === '1') return;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivate)) throw new Error('That address points to a private network, which is blocked');
}

export async function safeFetch(url, init = {}) {
  let current = String(url);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(current);
    const res = await fetch(current, { ...init, redirect: 'manual' });
    const next = res.status >= 300 && res.status < 400 && res.headers.get('location');
    if (!next) return res;
    current = new URL(next, current).toString();
  }
  throw new Error('Too many redirects');
}
