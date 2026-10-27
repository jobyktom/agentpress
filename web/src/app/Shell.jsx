import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Bot, Inbox, BarChart2, Users, Settings, LogOut, ChevronsUpDown, Plus, Menu, X, Check, Home } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useFetch, useStream } from '../lib/hooks';
import { Modal, PageLoader, Avatar } from '../components/ui';

export function AppIndex() {
  const { data } = useFetch('/workspaces');
  if (!data) return <PageLoader />;
  return <Navigate to={`/app/w/${data[0].id}`} replace />;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function WorkspaceSwitcher({ wid }) {
  const { data: list, reload } = useFetch('/workspaces');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const nav = useNavigate();
  const current = list?.find((w) => w.id === wid);
  const create = async (e) => {
    e.preventDefault();
    const w = await api('/workspaces', { method: 'POST', body: { name } });
    setCreating(false); setName(''); await reload(); nav(`/app/w/${w.id}`);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 rounded-xl bg-white/5 p-2 text-left hover:bg-white/10">
        <Avatar name={current?.name || '?'} color="#9480ff" size="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{current?.name || 'Workspace'}</div>
          <div className="text-[11px] capitalize text-ink-400">{current?.plan} plan · {current?.role}</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-ink-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-white/10 bg-ink-900 p-1 shadow-pop">
          {list?.map((w) => (
            <button key={w.id} onClick={() => { setOpen(false); nav(`/app/w/${w.id}`); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-200 hover:bg-white/5">
              <Avatar name={w.name} color="#9480ff" size="h-6 w-6" className="text-[10px]" /><span className="flex-1 truncate text-left">{w.name}</span>{w.id === wid && <Check className="h-4 w-4 text-brand-300" />}
            </button>
          ))}
          <button onClick={() => { setOpen(false); setCreating(true); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-300 hover:bg-white/5"><Plus className="h-4 w-4" /> New workspace</button>
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New workspace">
        <form onSubmit={create} className="space-y-4">
          <label className="block"><span className="label">Workspace name</span><input className="input" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Europe" /></label>
          <div className="flex justify-end"><button className="btn btn-primary">Create workspace</button></div>
        </form>
      </Modal>
    </div>
  );
}

export function Sidebar({ children, top }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col bg-ink-950 px-3 py-4">
      <Link to="/" className="mb-5 px-2"><Logo dark /></Link>
      {top}
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">{children}</nav>
      <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-1 pt-4">
        <Avatar name={user?.name} color="#14b8a6" size="h-8 w-8" />
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{user?.name}</div><div className="truncate text-[11px] text-ink-400">{user?.email}</div></div>
        <button title="Log out" aria-label="Log out" onClick={async () => { await signOut(); nav('/'); }} className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function Frame({ sidebar, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-72" onClick={(e) => e.stopPropagation()}>{sidebar}</aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-ink-200 bg-white px-3 lg:hidden">
          <button className="btn-ghost rounded-lg p-1.5" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="ml-2 font-display font-bold">AgentPress</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function WorkspaceShell() {
  const { wid } = useParams();
  const [waiting, setWaiting] = useState(0);
  const loadWaiting = () => api(`/workspaces/${wid}`).then((w) => setWaiting(w.stats.waiting)).catch(() => {});
  useEffect(() => { loadWaiting(); }, [wid]); // eslint-disable-line
  useStream(`/workspaces/${wid}/stream`, { conversation: loadWaiting, inbox: loadWaiting });
  const items = [
    { to: `/app/w/${wid}`, end: true, icon: Bot, label: 'Agents' },
    { to: `/app/w/${wid}/inbox`, icon: Inbox, label: 'Inbox', badge: waiting },
    { to: `/app/w/${wid}/usage`, icon: BarChart2, label: 'Usage' },
    { to: `/app/w/${wid}/members`, icon: Users, label: 'Members' },
    { to: `/app/w/${wid}/settings`, icon: Settings, label: 'Settings' },
  ];
  return (
    <Frame sidebar={
      <Sidebar top={<WorkspaceSwitcher wid={wid} />}>
        <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Workspace</div>
        {items.map(({ to, end, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon className="h-4 w-4" /><span className="flex-1">{label}</span>
            {badge > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-ink-950">{badge}</span>}
          </NavLink>
        ))}
        <div className="px-2.5 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Help</div>
        <Link to="/docs" className="nav-link"><Home className="h-4 w-4" /> Docs</Link>
      </Sidebar>
    }>
      <main className="flex-1 overflow-y-auto scrollbar-thin"><Outlet /></main>
    </Frame>
  );
}

export { X };
