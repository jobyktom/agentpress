import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Bot, MessagesSquare, Headphones, Users, Search, Copy, Trash2, MoreHorizontal, Key, Sparkles, LayoutTemplate } from 'lucide-react';
import { api, timeAgo } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { PageHeader, Stat, Modal, Empty, PageLoader, Badge, Avatar, useToast, CopyField } from '../components/ui';
import { ChannelIcon } from '../components/channels';
import { BarChart, SERIES, fillDays } from '../components/charts';

const COLORS = ['#ee661b', '#181715', '#5f7f6a', '#c99a3c', '#8b6b55', '#4f6d8a', '#a24b3a'];

export function NewAgentModal({ open, onClose, wid }) {
  const { data: templates } = useFetch('/templates');
  const [form, setForm] = useState({ name: '', description: '', template: 'support', color: COLORS[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const a = await api(`/workspaces/${wid}/agents`, { method: 'POST', body: form }); nav(`/app/w/${wid}/agents/${a.id}`); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create an agent" wide>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="label">Start from</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates?.map((t) => (
              <button type="button" key={t.key} onClick={() => setForm({ ...form, template: t.key })}
                className={`rounded-xl border p-4 text-left transition ${form.template === t.key ? 'border-brand-400 bg-brand-50 ring-4 ring-brand-100' : 'border-ink-200 hover:border-ink-300'}`}>
                <div className="flex items-center gap-2 font-semibold">{t.key === 'blank' ? <LayoutTemplate className="h-4 w-4 text-ink-400" /> : <Sparkles className="h-4 w-4 text-brand-500" />}{t.name}</div>
                <p className="mt-1 text-xs text-ink-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Agent name</span><input className="input" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ava from Acme" /></label>
          <div><span className="label">Color</span><div className="flex h-10 items-center gap-2">{COLORS.map((c) => <button type="button" key={c} aria-label={`Color ${c}`} onClick={() => setForm({ ...form, color: c })} className={`h-7 w-7 rounded-full ring-offset-2 ${form.color === c ? 'ring-2 ring-ink-900' : ''}`} style={{ background: c }} />)}</div></div>
        </div>
        <label className="block"><span className="label">Who is this agent and what does it do? (optional)</span><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="You are Ava, a cheerful assistant for Acme's online store. You help with orders, returns and product questions." /></label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create agent'}</button></div>
      </form>
    </Modal>
  );
}

export function WorkspaceHome() {
  const { wid } = useParams();
  const { data: ws } = useFetch(`/workspaces/${wid}`);
  const { data: agents, reload } = useFetch(`/workspaces/${wid}/agents`);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(null);
  const toast = useToast();
  if (!ws || !agents) return <PageLoader />;
  const list = agents.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const act = async (a, kind) => {
    setMenu(null);
    if (kind === 'dup') { await api(`/agents/${a.id}/duplicate`, { method: 'POST' }); toast('Agent duplicated'); }
    if (kind === 'del') { if (!confirm(`Delete "${a.name}" and all its conversations? This can't be undone.`)) return; await api(`/agents/${a.id}`, { method: 'DELETE' }); toast('Agent deleted'); }
    reload();
  };
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-10">
      <PageHeader title={`Welcome back to ${ws.name}`} description="Build, launch and monitor your AI agents." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New agent</button>} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Agents" value={ws.stats.agents} sub={`${ws.limits.agents} on your plan`} icon={Bot} />
        <Stat label="Conversations (30d)" value={ws.stats.conversations} icon={MessagesSquare} tone="blue" />
        <Stat label="AI replies (30d)" value={ws.stats.botMessages} sub={`${Math.round((ws.stats.botMessages / ws.limits.botMessages) * 100)}% of ${ws.limits.botMessages.toLocaleString()} included`} icon={Sparkles} tone="green" />
        <Stat label="Waiting for a human" value={ws.stats.waiting} sub={<Link to={`/app/w/${wid}/inbox`} className="font-semibold text-brand-600">Open inbox →</Link>} icon={Headphones} tone="amber" />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Agents</h2>
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="input pl-9" placeholder="Search agents" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {!agents.length ? (
        <Empty icon={Bot} title="Create your first agent" action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New agent</button>}>Pick a template for support, sales or bookings, or start blank.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <div key={a.id} className="card group relative p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <Link to={`/app/w/${wid}/agents/${a.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Open ${a.name}`} />
              <div className="flex items-start gap-3">
                <Avatar name={a.name} color={a.color} size="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{a.name}</h3>
                  <p className="line-clamp-2 text-xs text-ink-500">{a.description}</p>
                </div>
                <div className="relative z-10">
                  <button className="rounded-lg p-1 text-ink-400 hover:bg-ink-100" onClick={() => setMenu(menu === a.id ? null : a.id)} aria-label="Agent actions"><MoreHorizontal className="h-4 w-4" /></button>
                  {menu === a.id && (
                    <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-ink-200 bg-surface p-1 shadow-pop">
                      <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50" onClick={() => act(a, 'dup')}><Copy className="h-4 w-4" />Duplicate</button>
                      <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-rose-600 hover:bg-rose-50" onClick={() => act(a, 'del')}><Trash2 className="h-4 w-4" />Delete</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex -space-x-1.5">{a.channels.map((c) => <ChannelIcon key={c} type={c} className="h-6 w-6 rounded-full ring-2 ring-white" iconClass="h-3 w-3" />)}</div>
                {a.publishedVersion ? <Badge tone={a.hasUnpublishedChanges ? 'amber' : 'green'}>{a.hasUnpublishedChanges ? 'Unpublished changes' : `Live · v${a.publishedVersion}`}</Badge> : <Badge>Draft</Badge>}
              </div>
              <div className="mt-4 flex justify-between border-t border-ink-100 pt-3 text-xs text-ink-500"><span>{a.conversations7d} conversations this week</span><span>Edited {timeAgo(a.updatedAt)}</span></div>
            </div>
          ))}
          <button onClick={() => setCreating(true)} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 text-sm font-semibold text-ink-500 transition hover:border-brand-300 hover:text-brand-600"><Plus className="h-6 w-6" />New agent</button>
        </div>
      )}
      <NewAgentModal open={creating} onClose={() => setCreating(false)} wid={wid} />
    </div>
  );
}

export function Usage() {
  const { wid } = useParams();
  const { data } = useFetch(`/workspaces/${wid}/usage?days=30`);
  const { data: ws } = useFetch(`/workspaces/${wid}`);
  if (!data || !ws) return <PageLoader />;
  const agents = [...new Set(data.rows.map((r) => r.agent))];
  const byDay = {};
  for (const r of data.rows) (byDay[r.day] ||= { day: r.day })[r.agent] = r.n;
  const total = data.rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <PageHeader title="Usage" description="AI replies sent on live channels in the last 30 days. Preview and simulation messages are free." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="AI replies (30d)" value={total.toLocaleString()} icon={Sparkles} />
        <Stat label="Included in plan" value={ws.limits.botMessages.toLocaleString()} sub={<span className="capitalize">{ws.plan} plan</span>} icon={Key} tone="blue" />
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Quota used</span>
          <div className="mt-2 font-display text-3xl font-extrabold">{Math.round((total / ws.limits.botMessages) * 100)}%</div>
          <div className="mt-3 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, (total / ws.limits.botMessages) * 100)}%` }} /></div>
        </div>
      </div>
      <div className="card p-6">
        <h3 className="mb-4 font-bold">Daily AI replies by agent</h3>
        <BarChart data={fillDays(Object.values(byDay), 30)} series={agents.map((a, i) => ({ key: a, label: a, color: SERIES[i % SERIES.length] }))} />
      </div>
    </div>
  );
}

export function Members() {
  const { wid } = useParams();
  const { data, reload } = useFetch(`/workspaces/${wid}/members`);
  const { data: ws } = useFetch(`/workspaces/${wid}`);
  const [form, setForm] = useState({ email: '', role: 'editor' });
  const [error, setError] = useState('');
  const toast = useToast();
  if (!data || !ws) return <PageLoader />;
  const admin = ['owner', 'admin'].includes(ws.role);
  const invite = async (e) => {
    e.preventDefault(); setError('');
    try { await api(`/workspaces/${wid}/members`, { method: 'POST', body: form }); setForm({ email: '', role: 'editor' }); toast('Member added'); reload(); }
    catch (err) { setError(err.message); }
  };
  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10">
      <PageHeader title="Members" description="Everyone in this workspace. Seats are free on every plan." icon={Users} />
      {admin && (
        <form onSubmit={invite} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
          <label className="min-w-[220px] flex-1"><span className="label">Email</span><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teammate@company.com" /></label>
          <label><span className="label">Role</span><select className="input w-36" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
          <button className="btn btn-primary">Add member</button>
          {error && <p className="w-full text-sm text-rose-600">{error}</p>}
        </form>
      )}
      <div className="card divide-y divide-ink-100">
        {data.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar name={m.name} color="#14b8a6" />
            <div className="min-w-0 flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-ink-500">{m.email}</div></div>
            {admin && m.role !== 'owner' ? (
              <>
                <select className="input h-8 w-28 text-xs" value={m.role} onChange={async (e) => { await api(`/workspaces/${wid}/members/${m.id}`, { method: 'PATCH', body: { role: e.target.value } }); reload(); }}>
                  <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
                </select>
                <button className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove member" onClick={async () => { if (confirm(`Remove ${m.name}?`)) { await api(`/workspaces/${wid}/members/${m.id}`, { method: 'DELETE' }); reload(); } }}><Trash2 className="h-4 w-4" /></button>
              </>
            ) : <Badge tone={m.role === 'owner' ? 'brand' : 'gray'} className="capitalize">{m.role}</Badge>}
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 text-xs text-ink-500 sm:grid-cols-3">
        <div className="card p-4"><b className="text-ink-800">Viewer</b><p className="mt-1">Sees agents, conversations and analytics.</p></div>
        <div className="card p-4"><b className="text-ink-800">Editor</b><p className="mt-1">Builds and publishes agents, connects channels and replies in the inbox.</p></div>
        <div className="card p-4"><b className="text-ink-800">Admin</b><p className="mt-1">Everything editors can do, plus members, API keys and deleting agents.</p></div>
      </div>
    </div>
  );
}

export function WorkspaceSettings() {
  const { wid } = useParams();
  const { data: ws, reload } = useFetch(`/workspaces/${wid}`);
  const { data: keys, reload: reloadKeys } = useFetch(`/workspaces/${wid}/keys`);
  const [name, setName] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const toast = useToast();
  const nav = useNavigate();
  if (!ws) return <PageLoader />;
  const admin = ['owner', 'admin'].includes(ws.role);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10">
      <PageHeader title="Workspace settings" />
      <form className="card space-y-4 p-6" onSubmit={async (e) => { e.preventDefault(); await api(`/workspaces/${wid}`, { method: 'PATCH', body: { name } }); toast('Saved'); reload(); }}>
        <h3 className="font-bold">General</h3>
        <label className="block"><span className="label">Workspace name</span><input className="input" disabled={!admin} value={name ?? ws.name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className="label">Workspace ID</span><input className="input font-mono text-xs" readOnly value={ws.id} /></label>
        {admin && <button className="btn btn-primary" disabled={name == null}>Save</button>}
      </form>
      {admin && (
        <div className="card p-6">
          <div className="flex items-center justify-between"><h3 className="font-bold">API keys</h3><button className="btn btn-outline btn-sm" onClick={async () => { const r = await api(`/workspaces/${wid}/keys`, { method: 'POST', body: { name: 'API key' } }); setNewKey(r.key); reloadKeys(); }}><Plus className="h-3.5 w-3.5" /> Create key</button></div>
          <p className="mt-1 text-sm text-ink-500">Use keys with the REST API channel to talk to any agent in this workspace.</p>
          {newKey && <div className="mt-4 rounded-xl bg-amber-50 p-4"><p className="mb-2 text-xs font-semibold text-amber-800">Copy this key now. You won't see it again.</p><CopyField value={newKey} /></div>}
          <div className="mt-4 divide-y divide-ink-100">
            {keys?.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-mono text-xs">{k.prefix}…</span><span className="text-xs text-ink-500">Created {timeAgo(k.created_at)}</span>
                <button className="text-xs font-semibold text-rose-600" onClick={async () => { await api(`/workspaces/${wid}/keys/${k.id}`, { method: 'DELETE' }); reloadKeys(); }}>Revoke</button>
              </div>
            ))}
            {!keys?.length && <p className="py-3 text-sm text-ink-400">No keys yet.</p>}
          </div>
        </div>
      )}
      {ws.role === 'owner' && (
        <div className="card border-rose-200 p-6">
          <h3 className="font-bold text-rose-700">Delete workspace</h3>
          <p className="mt-1 text-sm text-ink-500">Deletes every agent, conversation and log in this workspace.</p>
          <button className="btn btn-danger mt-4" onClick={async () => { if (prompt(`Type "${ws.name}" to confirm`) === ws.name) { await api(`/workspaces/${wid}`, { method: 'DELETE' }); nav('/app'); } }}>Delete workspace</button>
        </div>
      )}
    </div>
  );
}
