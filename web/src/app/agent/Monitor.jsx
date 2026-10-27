import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart3, MessagesSquare, CheckCircle2, LifeBuoy, Timer, Star, Users, FlaskConical, Plus, Play, Trash2, Loader2, XCircle, Terminal, History, RotateCcw, HelpCircle, Search } from 'lucide-react';
import { useAgent } from './context';
import { PageHeader, Stat, Empty, PageLoader, Badge, Modal, Tabs, useToast } from '../../components/ui';
import { BarChart, HBar, fillDays } from '../../components/charts';
import { CHANNEL_META } from '../../components/channels';
import { api, timeAgo, uid } from '../../lib/api';
import { useFetch, useStream } from '../../lib/hooks';

export function Analytics() {
  const { aid, wid } = useParams();
  const { updateConfig, canEdit } = useAgent();
  const [days, setDays] = useState('14');
  const { data } = useFetch(`/agents/${aid}/analytics?days=${days}`, [days]);
  const toast = useToast();
  if (!data) return <PageLoader />;
  const t = data.totals;
  const daily = fillDays(data.daily.map((d) => ({ ...d, resolved: d.conversations - d.handoffs })), Number(days));
  const addFaq = (q) => { updateConfig((c) => ({ ...c, knowledge: [...c.knowledge, { id: uid('k'), type: 'faq', question: q, answer: '' }] })); toast('Added to Knowledge. Write the answer there.'); };
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader icon={BarChart3} title="Analytics" description="How your agent performs on live channels." actions={<Tabs value={days} onChange={setDays} tabs={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Conversations" value={t.conversations} icon={MessagesSquare} />
        <Stat label="Unique users" value={t.users} icon={Users} tone="blue" />
        <Stat label="Resolved by AI" value={t.resolutionRate != null ? `${t.resolutionRate}%` : '—'} icon={CheckCircle2} tone="green" />
        <Stat label="Handoffs" value={t.handoffs} icon={LifeBuoy} tone="amber" />
        <Stat label="Median reply" value={t.p50LatencyMs != null ? `${(t.p50LatencyMs / 1000).toFixed(1)}s` : '—'} sub={t.p95LatencyMs != null ? `p95 ${(t.p95LatencyMs / 1000).toFixed(1)}s` : null} icon={Timer} tone="blue" />
        <Stat label="Satisfaction" value={t.rating ? `${Number(t.rating).toFixed(1)}/5` : '—'} icon={Star} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h3 className="mb-4 font-bold">Conversations per day</h3>
          <BarChart data={daily} series={[{ key: 'resolved', label: 'Resolved by AI', color: '#ee661b' }, { key: 'handoffs', label: 'Handed off', color: '#272522' }]} />
        </div>
        <div className="card p-6">
          <h3 className="mb-4 font-bold">By channel</h3>
          {data.byChannel.length ? <HBar items={data.byChannel.map((c) => ({ label: CHANNEL_META[c.channel]?.name || c.channel, value: c.n, color: CHANNEL_META[c.channel]?.color }))} /> : <p className="text-sm text-ink-400">No data yet.</p>}
          {data.topics.length > 0 && <>
            <h3 className="mb-4 mt-8 font-bold">Top playbooks</h3>
            <HBar items={data.topics.map((p) => ({ label: p.playbook, value: p.n }))} />
          </>}
        </div>
      </div>
      <div className="card mt-6 p-6">
        <div className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-amber-500" /><h3 className="font-bold">Knowledge gaps</h3><span className="text-xs text-ink-400">Questions your agent couldn't answer</span></div>
        {data.gaps.length ? (
          <div className="mt-4 divide-y divide-ink-100">
            {data.gaps.map((g) => (
              <div key={g.question} className="flex items-center gap-3 py-3">
                <span className="flex-1 text-sm">“{g.question}”</span>
                <Badge tone="amber">{g.n}×</Badge><span className="w-20 text-right text-xs text-ink-400">{timeAgo(g.last)}</span>
                {canEdit && <button className="btn btn-outline btn-sm" onClick={() => addFaq(g.question)}><Plus className="h-3.5 w-3.5" />Answer as FAQ</button>}
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-ink-400">No gaps. Your agent answered everything it was asked.</p>}
        <Link to={`/app/w/${wid}/agents/${aid}/knowledge`} className="mt-3 inline-block text-xs font-semibold text-brand-600">Go to Knowledge →</Link>
      </div>
    </div>
  );
}

export function Simulations() {
  const { aid } = useParams();
  const { canEdit, flush } = useAgent();
  const { data, reload, setData } = useFetch(`/agents/${aid}/simulations`);
  const [form, setForm] = useState(null);
  const [running, setRunning] = useState(null);
  const [open, setOpen] = useState(null);
  if (!data) return <PageLoader />;
  const run = async (id) => {
    setRunning(id || 'all'); await flush();
    try { const r = await api(`/agents/${aid}/simulations/run`, { method: 'POST', body: id ? { id } : {} }); setData((d) => d.map((s) => r.find((x) => x.id === s.id) || s)); }
    finally { setRunning(null); }
  };
  const passed = data.filter((s) => s.last_status === 'passed').length;
  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <PageHeader icon={FlaskConical} title="Simulations" description="Saved test conversations. Run them against your working copy before you publish to catch regressions."
        actions={<>{canEdit && <button className="btn btn-outline btn-sm" onClick={() => setForm({ name: '', input: '', expect: '' })}><Plus className="h-3.5 w-3.5" />New</button>}<button className="btn btn-primary btn-sm" disabled={!data.length || running} onClick={() => run()}>{running === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run all</button></>} />
      {data.some((s) => s.last_status) && <div className="mb-4 rounded-xl bg-ink-50 p-3 text-sm"><b>{passed}</b> of {data.filter((s) => s.last_status).length} passing</div>}
      {!data.length ? <Empty icon={FlaskConical} title="No simulations yet" action={canEdit && <button className="btn btn-primary" onClick={() => setForm({ name: '', input: '', expect: '' })}><Plus className="h-4 w-4" />Create one</button>}>Write what a customer says, line by line, and the phrases you expect in the replies.</Empty> : (
        <div className="card divide-y divide-ink-100">
          {data.map((s) => {
            const out = s.last_output ? JSON.parse(s.last_output) : null;
            return (
              <div key={s.id} className="p-4">
                <div className="flex items-center gap-3">
                  {s.last_status === 'passed' ? <CheckCircle2 className="h-5 w-5 text-[#3d6a4a]" /> : s.last_status === 'failed' ? <XCircle className="h-5 w-5 text-rose-500" /> : <span className="h-5 w-5 rounded-full border-2 border-ink-200" />}
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-400">{s.input.split('\n').length} messages · expects {s.expect ? s.expect.split('\n').filter(Boolean).length : 0} phrases{s.last_run_at && ` · ran ${timeAgo(s.last_run_at)}`}</div>
                  </button>
                  {s.last_status && <Badge tone={s.last_status === 'passed' ? 'green' : s.last_status === 'failed' ? 'red' : 'gray'}>{s.last_status === 'passed' ? 'Passed' : s.last_status === 'failed' ? 'Failed' : 'Ran'}</Badge>}
                  <button className="btn btn-outline btn-sm" disabled={!!running} onClick={() => run(s.id)}>{running === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run</button>
                  {canEdit && <button className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete" onClick={async () => { await api(`/agents/${aid}/simulations/${s.id}`, { method: 'DELETE' }); reload(); }}><Trash2 className="h-4 w-4" /></button>}
                </div>
                {open === s.id && out && (
                  <div className="ml-8 mt-3 space-y-1.5 rounded-xl bg-ink-50 p-3 text-xs">
                    {out.transcript.map((m, i) => <div key={i} className={m.role === 'user' ? 'font-semibold' : m.role === 'system' ? 'text-amber-700' : 'text-ink-600'}>{m.role === 'user' ? 'User' : m.role === 'bot' ? 'Agent' : '•'}: {m.text}</div>)}
                    {out.failed.length > 0 && <div className="pt-2 text-rose-600">Missing: {out.failed.map((f) => `“${f}”`).join(', ')}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="New simulation">
        {form && <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await api(`/agents/${aid}/simulations`, { method: 'POST', body: form }); setForm(null); reload(); }}>
          <label className="block"><span className="label">Name</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Refund request" /></label>
          <label className="block"><span className="label">User messages (one per line)</span><textarea className="input font-mono text-xs" rows={4} required value={form.input} onChange={(e) => setForm({ ...form, input: e.target.value })} placeholder={'Where is my order?\nA-1042\njane@example.com'} /></label>
          <label className="block"><span className="label">Replies should contain (one phrase per line)</span><textarea className="input font-mono text-xs" rows={3} value={form.expect} onChange={(e) => setForm({ ...form, expect: e.target.value })} placeholder="on its way" /></label>
          <div className="flex justify-end"><button className="btn btn-primary">Save</button></div>
        </form>}
      </Modal>
    </div>
  );
}

const LEVEL = { error: 'red', warn: 'amber', info: 'blue', debug: 'gray' };

export function Logs() {
  const { aid } = useParams();
  const [level, setLevel] = useState('all');
  const [q, setQ] = useState('');
  const { data, setData } = useFetch(`/agents/${aid}/logs?level=${level}&q=${encodeURIComponent(q)}`, [level, q]);
  const [open, setOpen] = useState(null);
  useStream(`/agents/${aid}/stream`, { log: (p) => (level === 'all' || p.log.level === level) && setData((d) => [p.log, ...(d || [])].slice(0, 300)) });
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader icon={Terminal} title="Logs" description="Everything your agent does, streamed live: turns, handoffs, channel events, publishes and errors." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={level} onChange={setLevel} tabs={['all', 'error', 'warn', 'info', 'debug'].map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))} />
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="input pl-9" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live</span>
      </div>
      <div className="card overflow-hidden font-mono text-xs">
        {!data ? <PageLoader /> : !data.length ? <p className="p-6 text-ink-400">No logs yet.</p> : data.map((l) => (
          <div key={l.id} className="border-b border-ink-100 last:border-0">
            <button className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-ink-50" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <span className="w-36 shrink-0 text-ink-400">{new Date(l.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <Badge tone={LEVEL[l.level]} className="w-14 justify-center uppercase !text-[10px]">{l.level}</Badge>
              <span className="w-16 shrink-0 text-ink-500">{l.type}</span>
              <span className="flex-1 truncate text-ink-800">{l.message}</span>
            </button>
            {open === l.id && <pre className="overflow-x-auto bg-ink-950 px-4 py-3 text-[11px] text-brand-100">{JSON.stringify(l.data, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

function diffConfigs(a, b) {
  if (!a) return ['First version'];
  const out = [];
  const keys = ['instructions', 'greeting', 'suggestions', 'model', 'effort', 'escalation', 'webchat'];
  for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k[0].toUpperCase() + k.slice(1)} changed`);
  for (const k of ['playbooks', 'knowledge', 'tools']) {
    const d = (b[k]?.length || 0) - (a[k]?.length || 0);
    if (d) out.push(`${d > 0 ? '+' : ''}${d} ${k}`);
    else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k[0].toUpperCase() + k.slice(1)} edited`);
  }
  return out.length ? out : ['No configuration changes'];
}

export function Versions() {
  const { aid } = useParams();
  const { agent, replace, canEdit } = useAgent();
  const { data } = useFetch(`/agents/${aid}/versions`, [agent.publishedVersion]);
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  if (!data) return <PageLoader />;
  const restore = async (v) => {
    const a = await api(`/agents/${aid}/versions/${v}/restore`, { method: 'POST' });
    replace(a); setConfirm(null);
    toast(`Version ${v} restored to your working copy. Publish to make it live.`);
  };
  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <PageHeader icon={History} title="Versions" description="Each publish creates a version. Restore one into your working copy, test it, then publish." />
      {agent.hasUnpublishedChanges && <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">Your working copy has unpublished changes.</div>}
      {!data.length ? <Empty icon={History} title="Nothing published yet">Click Publish in the top bar to create version 1.</Empty> : (
        <ol className="relative space-y-4 border-l-2 border-ink-200 pl-6">
          {data.map((v, i) => (
            <li key={v.id} className="relative">
              <span className={`absolute -left-[33px] top-4 h-4 w-4 rounded-full border-4 border-surface ${v.version === agent.publishedVersion ? 'bg-emerald-500' : 'bg-ink-300'}`} />
              <div className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold">Version {v.version}</span>
                  {v.version === agent.publishedVersion && <Badge tone="green">Live</Badge>}
                  <span className="text-xs text-ink-400">{new Date(v.created_at).toLocaleString()} · {v.author || 'Unknown'}</span>
                  {canEdit && v.version !== agent.publishedVersion && <button className="btn btn-outline btn-sm ml-auto" onClick={() => setConfirm(v.version)}><RotateCcw className="h-3.5 w-3.5" />Restore</button>}
                </div>
                {v.note && <p className="mt-2 text-sm">{v.note}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">{diffConfigs(data[i + 1]?.config, v.config).map((d) => <span key={d} className="chip bg-ink-100 text-ink-600">{d}</span>)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Modal open={confirm != null} onClose={() => setConfirm(null)} title={`Restore version ${confirm}?`} footer={<><button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={() => restore(confirm)}>Restore</button></>}>
        <p className="text-sm text-ink-600">This replaces your working copy with version {confirm}. Live channels keep using version {agent.publishedVersion} until you publish.</p>
      </Modal>
    </div>
  );
}
