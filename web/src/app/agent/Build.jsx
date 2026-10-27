import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScrollText, BookOpen, Wrench, LifeBuoy, Plus, Trash2, Globe, FileText, HelpCircle, Upload, Search, Play, Workflow, MessagesSquare, Radio, Rocket, ArrowRight, Fingerprint, MessageCircle, Brain, Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAgent } from './context';
import { PageHeader, Toggle, Empty, Badge, Modal, Stat, useToast, Avatar } from '../../components/ui';
import { api, uid, timeAgo } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { ChannelIcon, CHANNEL_META } from '../../components/channels';

const wrap = 'mx-auto max-w-4xl p-6 lg:p-8';

export function Overview() {
  const { agent, patch, canEdit } = useAgent();
  const { wid, aid } = useParams();
  const { data: stats } = useFetch(`/agents/${aid}/analytics?days=7`);
  const { data: channels } = useFetch(`/agents/${aid}/channels`);
  const c = agent.config;
  const live = channels?.filter((x) => x.status === 'live') || [];
  const checklist = [
    ['Write instructions', c.instructions.identity.length > 40, 'instructions'],
    ['Add knowledge', c.knowledge.length > 0, 'knowledge'],
    ['Create a playbook', c.playbooks.length > 0, 'playbooks'],
    ['Publish a version', agent.publishedVersion > 0, null],
    ['Connect a messaging channel', live.some((x) => x.type !== 'webchat'), 'channels'],
  ];
  const done = checklist.filter((x) => x[1]).length;
  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={agent.name} color={agent.color} size="h-16 w-16" className="text-2xl" />
        <div className="min-w-0 flex-1">
          <input className="w-full bg-transparent font-display text-2xl font-extrabold outline-none" value={agent.name} disabled={!canEdit} onChange={(e) => patch({ name: e.target.value })} aria-label="Agent name" />
          <input className="w-full bg-transparent text-sm text-ink-500 outline-none" value={agent.description} disabled={!canEdit} onChange={(e) => patch({ description: e.target.value })} placeholder="Short description" aria-label="Description" />
        </div>
        <input type="color" value={agent.color} disabled={!canEdit} onChange={(e) => patch({ color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-ink-200" aria-label="Agent color" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Conversations (7d)" value={stats?.totals.conversations ?? '—'} icon={MessagesSquare} />
        <Stat label="Resolved by AI" value={stats?.totals.resolutionRate != null ? `${stats.totals.resolutionRate}%` : '—'} icon={CheckCircle2} tone="green" />
        <Stat label="Handoffs" value={stats?.totals.handoffs ?? '—'} icon={LifeBuoy} tone="amber" />
        <Stat label="Live channels" value={live.length} icon={Radio} tone="blue" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-6 lg:col-span-3">
          <div className="flex items-center justify-between"><h3 className="font-bold">Launch checklist</h3><span className="text-xs font-semibold text-ink-500">{done}/{checklist.length}</span></div>
          <div className="mt-3 h-1.5 rounded-full bg-ink-100"><div className="h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-all" style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
          <ul className="mt-5 space-y-2">
            {checklist.map(([label, ok, to]) => (
              <li key={label}>
                <Link to={to ? `/app/w/${wid}/agents/${aid}/${to}` : '#'} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-ink-50">
                  {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <span className="h-5 w-5 rounded-full border-2 border-ink-200" />}
                  <span className={`flex-1 text-sm ${ok ? 'text-ink-400 line-through' : 'font-medium'}`}>{label}</span>
                  {!ok && to && <ArrowRight className="h-4 w-4 text-ink-300" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-bold">What it's built from</h3>
          <div className="mt-4 space-y-3 text-sm">
            {[[Workflow, 'Playbooks', c.playbooks.length, 'playbooks'], [BookOpen, 'Knowledge sources', c.knowledge.length, 'knowledge'], [Wrench, 'Tools', c.tools.length, 'tools']].map(([I, l, n, to]) => (
              <Link key={l} to={`/app/w/${wid}/agents/${aid}/${to}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 hover:border-brand-200"><I className="h-4 w-4 text-brand-500" /><span className="flex-1">{l}</span><b>{n}</b></Link>
            ))}
          </div>
          <h3 className="mt-6 font-bold">Channels</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {live.length ? live.map((ch) => <span key={ch.type} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 py-1 pl-1 pr-3 text-xs font-medium"><ChannelIcon type={ch.type} className="h-5 w-5 rounded-full" iconClass="h-3 w-3" />{ch.name}</span>) : <span className="text-sm text-ink-400">None yet</span>}
          </div>
          <Link to={`/app/w/${wid}/agents/${aid}/channels`} className="btn btn-outline btn-sm mt-4"><Rocket className="h-3.5 w-3.5" />Manage channels</Link>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  ['identity', Fingerprint, 'Identity', 'Who the agent is, who it serves and what it is for.'],
  ['communication', MessageCircle, 'Communication', 'Tone, length, formatting and language.'],
  ['memory', Brain, 'Memory', 'What to remember about the user during a conversation.'],
  ['safety', Shield, 'Safety', 'Topics to avoid and what never to promise.'],
];

export function Instructions() {
  const { config, updateConfig, canEdit } = useAgent();
  return (
    <div className={wrap}>
      <PageHeader icon={ScrollText} title="Instructions" description="Always-on rules your agent follows in every conversation and on every channel." />
      <div className="space-y-4">
        {SECTIONS.map(([key, Icon, title, hint]) => (
          <div key={key} className="card p-5">
            <div className="mb-2 flex items-center gap-2"><Icon className="h-4 w-4 text-brand-500" /><h3 className="font-bold">{title}</h3><span className="text-xs text-ink-400">{hint}</span></div>
            <textarea className="input" rows={key === 'identity' ? 5 : 3} disabled={!canEdit} value={config.instructions[key]} onChange={(e) => updateConfig((c) => { c.instructions[key] = e.target.value; return c; })} />
          </div>
        ))}
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Greeting message</span><input className="input" disabled={!canEdit} value={config.greeting} onChange={(e) => updateConfig((c) => ({ ...c, greeting: e.target.value }))} /></label>
          <label className="block sm:col-span-2"><span className="label">Suggested replies shown at the start (comma separated)</span><input className="input" disabled={!canEdit} value={config.suggestions.join(', ')} onChange={(e) => updateConfig((c) => ({ ...c, suggestions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} /></label>
          <label className="block"><span className="label">Model</span>
            <select className="input" disabled={!canEdit} value={config.model} onChange={(e) => updateConfig((c) => ({ ...c, model: e.target.value }))}>
              <option value="claude-opus-5-5">Claude Opus 5.5 (most capable)</option><option value="claude-sonnet-5-5">Claude Sonnet 5.5 (balanced)</option><option value="claude-haiku-5-5">Claude Haiku 5.5 (fastest)</option>
            </select>
          </label>
          <label className="block"><span className="label">Reasoning effort</span>
            <select className="input" disabled={!canEdit} value={config.effort} onChange={(e) => updateConfig((c) => ({ ...c, effort: e.target.value }))}>
              <option value="low">Low (fast chat)</option><option value="medium">Medium</option><option value="high">High (complex tasks)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export function Knowledge() {
  const { config, updateConfig, canEdit, agent } = useAgent();
  const [adding, setAdding] = useState(null);
  const [q, setQ] = useState('');
  const list = config.knowledge.filter((k) => JSON.stringify(k).toLowerCase().includes(q.toLowerCase()));
  const remove = (id) => updateConfig((c) => ({ ...c, knowledge: c.knowledge.filter((k) => k.id !== id) }));
  const toggle = (id, v) => updateConfig((c) => { c.knowledge.find((k) => k.id === id).enabled = v; return c; });
  const icons = { faq: HelpCircle, text: FileText, website: Globe, file: Upload };
  return (
    <div className={wrap}>
      <PageHeader icon={BookOpen} title="Knowledge" description="Facts your agent searches before it answers. Replies cite the source they used." actions={canEdit && (
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setAdding('faq')}><HelpCircle className="h-3.5 w-3.5" />FAQ</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAdding('text')}><FileText className="h-3.5 w-3.5" />Document</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding('website')}><Globe className="h-3.5 w-3.5" />Website</button>
        </div>
      )} />
      {config.knowledge.length > 0 && <div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="input pl-9" placeholder="Search knowledge" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
      {!config.knowledge.length ? <Empty icon={BookOpen} title="No knowledge yet" action={canEdit && <button className="btn btn-primary" onClick={() => setAdding('faq')}><Plus className="h-4 w-4" />Add your first FAQ</button>}>Add FAQs, paste documents, upload text files or import a web page.</Empty> : (
        <div className="card divide-y divide-ink-100">
          {list.map((k) => {
            const Icon = icons[k.type] || FileText;
            return (
              <div key={k.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500"><Icon className="h-4 w-4" /></span>
                <button className="min-w-0 flex-1 text-left" onClick={() => canEdit && setAdding(k)}>
                  <div className="truncate text-sm font-semibold">{k.type === 'faq' ? k.question : k.title}</div>
                  <p className="line-clamp-2 text-xs text-ink-500">{k.type === 'faq' ? k.answer : k.content}</p>
                  {k.url && <p className="mt-0.5 truncate text-[11px] text-brand-600">{k.url}</p>}
                </button>
                <Badge className="capitalize">{k.type === 'text' ? 'document' : k.type}</Badge>
                {canEdit && <Toggle checked={k.enabled !== false} onChange={(v) => toggle(k.id, v)} label="Enabled" />}
                {canEdit && <button className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4" /></button>}
              </div>
            );
          })}
        </div>
      )}
      <KnowledgeModal item={adding} agentId={agent.id} onClose={() => setAdding(null)} onSave={(item) => { updateConfig((c) => { const i = c.knowledge.findIndex((k) => k.id === item.id); if (i >= 0) c.knowledge[i] = item; else c.knowledge.push(item); return c; }); setAdding(null); }} />
    </div>
  );
}

function KnowledgeModal({ item, onClose, onSave, agentId }) {
  const type = typeof item === 'string' ? item : item?.type;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(null);
  if (item && key !== item) { setKey(item); setForm(typeof item === 'string' ? { id: uid('k'), type: item } : { ...item }); setError(''); }
  if (!item) return null;
  const fetchUrl = async () => {
    setBusy(true); setError('');
    try { const r = await api(`/agents/${agentId}/knowledge/fetch`, { method: 'POST', body: { url: form.url } }); setForm((f) => ({ ...f, title: r.title, content: r.content, fetchedAt: new Date().toISOString() })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const readFile = (file) => { const r = new FileReader(); r.onload = () => setForm((f) => ({ ...f, title: f.title || file.name, content: String(r.result).slice(0, 200000) })); r.readAsText(file); };
  const valid = type === 'faq' ? form.question && form.answer : form.content;
  return (
    <Modal open onClose={onClose} title={{ faq: 'FAQ', text: 'Document', website: 'Web page' }[type]} wide>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(form); }}>
        {type === 'faq' && <>
          <label className="block"><span className="label">Question</span><input className="input" autoFocus value={form.question || ''} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="What is your return policy?" /></label>
          <label className="block"><span className="label">Answer</span><textarea className="input" rows={5} value={form.answer || ''} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></label>
        </>}
        {type === 'website' && (
          <div className="flex gap-2"><input className="input" autoFocus value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://yourcompany.com/help/shipping" /><button type="button" className="btn btn-dark" disabled={busy || !form.url} onClick={fetchUrl}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}</button></div>
        )}
        {type !== 'faq' && <>
          <label className="block"><span className="label">Title</span><input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="block"><span className="label">Content {form.content && <span className="font-normal text-ink-400">· {form.content.length.toLocaleString()} characters</span>}</span><textarea className="input font-mono text-xs" rows={10} value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={type === 'website' ? 'Imported text appears here. You can edit it.' : 'Paste policies, product details or any text.'} /></label>
          {type === 'text' && <label className="btn btn-outline btn-sm cursor-pointer"><Upload className="h-3.5 w-3.5" />Upload .txt, .md, .csv or .json<input type="file" className="hidden" accept=".txt,.md,.csv,.json,.html" onChange={(e) => e.target.files[0] && readFile(e.target.files[0])} /></label>}
        </>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid}>Save</button></div>
      </form>
    </Modal>
  );
}

const EMPTY_TOOL = () => ({ id: uid('t'), name: '', description: '', method: 'GET', url: '', headers: [], params: [], body: '', enabled: true });

export function Tools() {
  const { config, updateConfig, canEdit, agent } = useAgent();
  const [edit, setEdit] = useState(null);
  return (
    <div className={wrap}>
      <PageHeader icon={Wrench} title="Tools" description="HTTP actions your agent can run mid-conversation: look up orders, create tickets, book meetings." actions={canEdit && <button className="btn btn-primary btn-sm" onClick={() => setEdit(EMPTY_TOOL())}><Plus className="h-3.5 w-3.5" />New tool</button>} />
      {!config.tools.length ? <Empty icon={Wrench} title="No tools yet" action={canEdit && <button className="btn btn-primary" onClick={() => setEdit(EMPTY_TOOL())}><Plus className="h-4 w-4" />Connect an API</button>}>Tools are used by the AI automatically, and by playbook “Call tool” steps.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {config.tools.map((t) => (
            <button key={t.id} onClick={() => setEdit(t)} className="card p-5 text-left transition hover:shadow-pop">
              <div className="flex items-center gap-2"><Badge tone="blue">{t.method}</Badge><span className="truncate font-mono text-sm font-bold">{t.name}</span>{t.enabled === false && <Badge>Off</Badge>}</div>
              <p className="mt-2 line-clamp-2 text-xs text-ink-500">{t.description}</p>
              <p className="mt-2 truncate font-mono text-[11px] text-ink-400">{t.url}</p>
            </button>
          ))}
        </div>
      )}
      {edit && <ToolModal tool={edit} agentId={agent.id} canEdit={canEdit} onClose={() => setEdit(null)}
        onDelete={() => { updateConfig((c) => ({ ...c, tools: c.tools.filter((x) => x.id !== edit.id) })); setEdit(null); }}
        onSave={(t) => { updateConfig((c) => { const i = c.tools.findIndex((x) => x.id === t.id); if (i >= 0) c.tools[i] = t; else c.tools.push(t); return c; }); setEdit(null); }} />}
    </div>
  );
}

function ToolModal({ tool, onClose, onSave, onDelete, agentId, canEdit }) {
  const [t, setT] = useState(tool);
  const [args, setArgs] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setT({ ...t, [k]: v });
  const test = async () => { setBusy(true); setResult(null); try { setResult(await api(`/agents/${agentId}/tools/test`, { method: 'POST', body: { tool: t, args } })); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={tool.name ? `Edit ${tool.name}` : 'New tool'} wide>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave({ ...t, name: t.name.replace(/[^a-zA-Z0-9_-]/g, '_') }); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Name</span><input className="input font-mono" required value={t.name} onChange={(e) => set('name', e.target.value)} placeholder="get_order_status" /></label>
          <div className="flex items-end gap-3"><Toggle checked={t.enabled !== false} onChange={(v) => set('enabled', v)} label="Enabled" /><span className="pb-0.5 text-sm text-ink-600">Enabled</span></div>
        </div>
        <label className="block"><span className="label">When should the agent use it?</span><textarea className="input" rows={2} required value={t.description} onChange={(e) => set('description', e.target.value)} placeholder="Look up the shipping status of an order by order number." /></label>
        <div className="flex gap-2">
          <select className="input w-28" value={t.method} onChange={(e) => set('method', e.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}</select>
          <input className="input font-mono text-xs" required value={t.url} onChange={(e) => set('url', e.target.value)} placeholder="https://api.example.com/orders/{{orderNumber}}" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><span className="label !mb-0">Parameters the agent fills in</span><button type="button" className="text-xs font-semibold text-brand-600" onClick={() => set('params', [...t.params, { name: '', type: 'string', description: '', required: true }])}>+ Add</button></div>
          {t.params.map((p, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="input w-40 font-mono text-xs" placeholder="orderNumber" value={p.name} onChange={(e) => { const ps = [...t.params]; ps[i] = { ...p, name: e.target.value }; set('params', ps); }} />
              <select className="input w-28 text-xs" value={p.type} onChange={(e) => { const ps = [...t.params]; ps[i] = { ...p, type: e.target.value }; set('params', ps); }}><option>string</option><option>number</option><option>boolean</option></select>
              <input className="input text-xs" placeholder="Description" value={p.description} onChange={(e) => { const ps = [...t.params]; ps[i] = { ...p, description: e.target.value }; set('params', ps); }} />
              <button type="button" className="rounded-lg px-2 text-ink-400 hover:text-rose-600" onClick={() => set('params', t.params.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><span className="label !mb-0">Headers</span><button type="button" className="text-xs font-semibold text-brand-600" onClick={() => set('headers', [...t.headers, { key: '', value: '' }])}>+ Add</button></div>
          {t.headers.map((h, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="input w-48 font-mono text-xs" placeholder="Authorization" value={h.key} onChange={(e) => { const hs = [...t.headers]; hs[i] = { ...h, key: e.target.value }; set('headers', hs); }} />
              <input className="input font-mono text-xs" placeholder="Bearer …" value={h.value} onChange={(e) => { const hs = [...t.headers]; hs[i] = { ...h, value: e.target.value }; set('headers', hs); }} />
              <button type="button" className="rounded-lg px-2 text-ink-400 hover:text-rose-600" onClick={() => set('headers', t.headers.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {t.method !== 'GET' && <label className="block"><span className="label">Body template (JSON, optional)</span><textarea className="input font-mono text-xs" rows={3} value={t.body} onChange={(e) => set('body', e.target.value)} placeholder='{"order": "{{orderNumber}}"}' /></label>}
        <div className="rounded-xl bg-ink-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold">Test</span>
            {t.params.filter((p) => p.name).map((p) => <input key={p.name} className="input h-8 w-36 text-xs" placeholder={p.name} value={args[p.name] || ''} onChange={(e) => setArgs({ ...args, [p.name]: e.target.value })} />)}
            <button type="button" className="btn btn-dark btn-sm" disabled={busy || !t.url} onClick={test}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run</button>
          </div>
          {result && <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-ink-950 p-3 text-[11px] text-brand-100">{result.error ? `Error: ${result.error}` : `HTTP ${result.status}\n${JSON.stringify(result.data, null, 2)}`}</pre>}
        </div>
        <div className="flex justify-between">
          {tool.name ? <button type="button" className="btn btn-ghost text-rose-600" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</button> : <span />}
          <div className="flex gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>{canEdit && <button className="btn btn-primary">Save tool</button>}</div>
        </div>
      </form>
    </Modal>
  );
}

export function Escalation() {
  const { config, updateConfig, canEdit } = useAgent();
  const e = config.escalation;
  const set = (k, v) => updateConfig((c) => { c.escalation[k] = v; return c; });
  return (
    <div className={wrap}>
      <PageHeader icon={LifeBuoy} title="Escalation" description="Decide when a conversation moves to a person. Escalated chats appear instantly in the workspace inbox." />
      <div className="space-y-4">
        <div className="card flex items-center justify-between p-5"><div><h3 className="font-bold">Human handoff</h3><p className="text-sm text-ink-500">Allow this agent to hand conversations to your team.</p></div><Toggle checked={e.enabled} disabled={!canEdit} onChange={(v) => set('enabled', v)} label="Human handoff" /></div>
        <div className={`space-y-4 ${e.enabled ? '' : 'pointer-events-none opacity-50'}`}>
          <div className="card space-y-4 p-5">
            <h3 className="font-bold">Triggers</h3>
            <label className="block"><span className="label">Hand off when the user says any of these (comma separated)</span><input className="input" disabled={!canEdit} value={e.keywords.join(', ')} onChange={(ev) => set('keywords', ev.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></label>
            <div className="flex items-center justify-between"><div><div className="text-sm font-semibold">Frustration detection</div><p className="text-xs text-ink-500">Hand off when the user sounds upset.</p></div><Toggle checked={e.negativeSentiment} disabled={!canEdit} onChange={(v) => set('negativeSentiment', v)} label="Frustration detection" /></div>
            <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800">With an AI model configured, the agent can also decide to hand off on its own when it can't help.</p>
          </div>
          <div className="card space-y-4 p-5">
            <h3 className="font-bold">Messages</h3>
            <label className="block"><span className="label">Sent when a handoff starts</span><textarea className="input" rows={2} disabled={!canEdit} value={e.message} onChange={(ev) => set('message', ev.target.value)} /></label>
            <label className="block"><span className="label">Outside business hours</span><textarea className="input" rows={2} disabled={!canEdit} value={e.offHoursMessage} onChange={(ev) => set('offHoursMessage', ev.target.value)} /></label>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MessagesSquare, CHANNEL_META, timeAgo, useToast, XCircle };
