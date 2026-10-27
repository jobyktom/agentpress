// Lightweight retrieval over an agent's knowledge sources. No embeddings
// service is required: chunks are scored with BM25 so the platform works
// offline, and the top chunks are handed to the model (or answered directly
// when no model key is configured).

const STOP = new Set('a an and are as at be but by can do does for from has have how i in is it its me my of on or our so that the their this to was we what when where which who why will with you your'.split(' '));

export function tokenize(text) {
  return (text || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, '') || w);
}

export function chunkText(text, size = 700) {
  const paras = (text || '').split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + ' ' + p).length > size && cur) { chunks.push(cur.trim()); cur = ''; }
    cur += ' ' + p;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export function buildChunks(knowledge = []) {
  const out = [];
  for (const k of knowledge) {
    if (k.enabled === false) continue;
    if (k.type === 'faq') {
      out.push({ sourceId: k.id, title: k.question, text: `Q: ${k.question}\nA: ${k.answer}`, answer: k.answer, faq: true });
    } else {
      for (const c of chunkText(k.content)) out.push({ sourceId: k.id, title: k.title || k.url || 'Document', text: c, url: k.url });
    }
  }
  return out;
}

export function search(knowledge, query, k = 4) {
  const chunks = buildChunks(knowledge);
  if (!chunks.length) return [];
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const docs = chunks.map((c) => tokenize(c.title + ' ' + c.text));
  const avg = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1;
  const df = Object.fromEntries(q.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  const N = docs.length;
  const scored = chunks.map((c, i) => {
    const d = docs[i];
    let score = 0;
    for (const t of q) {
      const tf = d.filter((w) => w === t).length;
      if (!tf) continue;
      const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
      score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avg));
    }
    // Coverage bonus: answers that match more of the question's words rank higher.
    const coverage = q.filter((t) => d.includes(t)).length / q.length;
    return { ...c, score: score * (0.5 + coverage), coverage };
  });
  return scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

function stripHtml(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|article)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*(\n\s*)+/g, '\n\n').trim();
}

export async function fetchWebsite(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'AgentPressBot/1.0 (+knowledge indexer)' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`);
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || url).trim();
  return { title, content: stripHtml(html).slice(0, 200_000) };
}
