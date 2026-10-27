import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, ScrollText, Workflow, BookOpen, Wrench, LifeBuoy, Radio, MessageSquareCode, MessagesSquare, BarChart3, FlaskConical, Terminal, History, Play, Rocket, Check, Loader2, AlertTriangle, RotateCcw, Send, X, Sparkles } from 'lucide-react';
import { AgentProvider, useAgent } from './context';
import { Frame, Sidebar } from '../Shell';
import { Avatar, Modal, PageLoader, useToast } from '../../components/ui';
import { api, uid } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const NAV = [
  { group: null, items: [['', LayoutDashboard, 'Overview']] },
  { group: 'Build', items: [['instructions', ScrollText, 'Instructions'], ['playbooks', Workflow, 'Playbooks'], ['knowledge', BookOpen, 'Knowledge'], ['tools', Wrench, 'Tools'], ['escalation', LifeBuoy, 'Escalation']] },
  { group: 'Deploy', items: [['channels', Radio, 'Channels'], ['webchat', MessageSquareCode, 'Web chat']] },
  { group: 'Monitor', items: [['conversations', MessagesSquare, 'Conversations'], ['analytics', BarChart3, 'Analytics'], ['simulations', FlaskConical, 'Simulations'], ['logs', Terminal, 'Logs'], ['versions', History, 'Versions']] },
];

export default function AgentLayout() {
  const { aid } = useParams();
  return <AgentProvider aid={aid}><Studio /></AgentProvider>;
}

function SaveState({ saving }) {
  const map = { saved: [Check, 'Saved', 'text-ink-400'], saving: [Loader2, 'Saving…', 'text-ink-400 animate-spin'], pending: [Loader2, 'Saving…', 'text-ink-400 animate-spin'], error: [AlertTriangle, 'Couldn\'t save', 'text-rose-500'] };
  const [Icon, label, cls] = map[saving];
  return <span className="hidden items-center gap-1 text-xs text-ink-500 sm:inline-flex"><Icon className={`h-3.5 w-3.5 ${cls}`} />{label}</span>;
}

function Studio() {
  const { wid, aid } = useParams();
  const { agent, saving, publish, canEdit, error } = useAgent();
  const [preview, setPreview] = useState(() => window.innerWidth > 1600);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState('');
  const toast = useToast();
  if (error && !agent) return <div className="p-10 text-rose-600">{error.message}</div>;
  if (!agent) return <PageLoader />;
  const base = `/app/w/${wid}/agents/${aid}`;
  const doPublish = async (e) => {
    e.preventDefault();
    const a = await publish(note);
    setPublishing(false); setNote('');
    toast(`Published version ${a.publishedVersion}. Live channels now use it.`);
  };
  return (
    <Frame sidebar={
      <Sidebar top={
        <div>
          <Link to={`/app/w/${wid}`} className="mb-3 flex items-center gap-1.5 px-2 text-xs font-medium text-ink-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />All agents</Link>
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2">
            <Avatar name={agent.name} color={agent.color} size="h-8 w-8" />
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{agent.name}</div><div className="text-[11px] text-ink-400">{agent.publishedVersion ? `v${agent.publishedVersion} live` : 'Not published'}</div></div>
          </div>
        </div>
      }>
        {NAV.map(({ group, items }) => (
          <div key={group || 'top'}>
            {group && <div className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{group}</div>}
            {items.map(([path, Icon, label]) => (
              <NavLink key={path} to={path ? `${base}/${path}` : base} end={!path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon className="h-4 w-4" />{label}</NavLink>
            ))}
          </div>
        ))}
      </Sidebar>
    }>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-surface px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display font-bold">{agent.name}</span>
            {agent.hasUnpublishedChanges ? <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200">{agent.publishedVersion ? 'Unpublished changes' : 'Draft'}</span> : <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Live · v{agent.publishedVersion}</span>}
          </div>
        </div>
        <SaveState saving={saving} />
        <button className={`btn btn-sm ${preview ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPreview(!preview)}><Play className="h-3.5 w-3.5" />Preview</button>
        {canEdit && <button className="btn btn-primary btn-sm" disabled={!agent.hasUnpublishedChanges} onClick={() => setPublishing(true)}><Rocket className="h-3.5 w-3.5" />Publish</button>}
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin"><Outlet /></main>
        {preview && <PreviewPanel onClose={() => setPreview(false)} />}
      </div>
      <Modal open={publishing} onClose={() => setPublishing(false)} title="Publish changes">
        <form onSubmit={doPublish} className="space-y-4">
          <p className="text-sm text-ink-600">Publishing makes your working copy live on every connected channel as version {agent.publishedVersion + 1}. You can restore an earlier version anytime.</p>
          <label className="block"><span className="label">What changed? (optional)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Added shipping FAQs" /></label>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={() => setPublishing(false)}>Cancel</button><button className="btn btn-primary"><Rocket className="h-4 w-4" />Publish v{agent.publishedVersion + 1}</button></div>
        </form>
      </Modal>
    </Frame>
  );
}

function PreviewPanel({ onClose }) {
  const { agent, flush } = useAgent();
  const { llm } = useAuth();
  const [session, setSession] = useState(() => uid('preview'));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('bot');
  const [debug, setDebug] = useState(null);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);
  const send = async (t) => {
    t = (t ?? text).trim(); if (!t || busy) return;
    setText(''); setBusy(true);
    setMessages((m) => [...m, { id: uid('m'), role: 'user', text: t }]);
    try {
      await flush();
      const r = await api(`/agents/${agent.id}/preview`, { method: 'POST', body: { sessionId: session, text: t } });
      setMessages((m) => [...m, ...r.messages.filter((x) => x.role !== 'user')]);
      setStatus(r.conversation.status);
    } catch (e) { setMessages((m) => [...m, { id: uid('m'), role: 'system', text: e.message }]); }
    finally { setBusy(false); }
  };
  const reset = async () => { await api(`/agents/${agent.id}/preview/${session}`, { method: 'DELETE' }).catch(() => {}); setSession(uid('preview')); setMessages([]); setStatus('bot'); };
  const last = [...messages].reverse().find((m) => m.role === 'bot');
  const chips = messages.length ? last?.meta?.choices : agent.config.suggestions;
  return (
    <aside className="flex w-full max-w-sm shrink-0 flex-col border-l border-ink-200 bg-surface max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:shadow-pop">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
        <Play className="h-4 w-4 text-brand-500" /><span className="flex-1 text-sm font-bold">Preview <span className="font-normal text-ink-400">· working copy</span></span>
        <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" title="Restart conversation" aria-label="Restart conversation" onClick={reset}><RotateCcw className="h-4 w-4" /></button>
        <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Close preview" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      {!llm && <div className="flex gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />Answers come from knowledge and playbooks. Set ANTHROPIC_API_KEY on the server for full AI replies.</div>}
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-ink-50/60 p-4 scrollbar-thin">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-sm ring-1 ring-ink-200">{agent.config.greeting}</div>
        {messages.map((m) => m.role === 'system' ? <p key={m.id} className="text-center text-[11px] text-ink-400">{m.text}</p> : (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-surface ring-1 ring-ink-200'}`}>{m.text}</div>
            {m.role === 'bot' && (
              <button className="mt-0.5 text-[10px] text-ink-400 hover:text-brand-600" onClick={() => setDebug(debug === m.id ? null : m.id)}>
                {m.meta?.trace?.[0] ? `${m.meta.trace[0].type}${m.meta.trace[0].name ? `: ${m.meta.trace[0].name}` : m.meta.trace[0].title ? `: ${m.meta.trace[0].title}` : ''}` : 'details'} · {m.meta?.latencyMs} ms
              </button>
            )}
            {debug === m.id && <pre className="mt-1 max-h-40 w-full overflow-auto rounded-lg bg-ink-900 p-2 font-mono text-[10px] text-ink-100">{JSON.stringify({ trace: m.meta?.trace, sources: m.meta?.sources }, null, 2)}</pre>}
          </div>
        ))}
        {busy && <div className="flex w-14 gap-1 rounded-2xl bg-surface px-3 py-3 ring-1 ring-ink-200">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300" style={{ animationDelay: `${i * 120}ms` }} />)}</div>}
        {status === 'human' && <p className="rounded-lg bg-amber-50 p-2 text-center text-[11px] text-amber-800">Handed off. In production this chat now waits in the inbox.</p>}
        {chips?.length > 0 && !busy && <div className="flex flex-wrap gap-1.5">{chips.map((c) => <button key={c} onClick={() => send(c)} className="rounded-full border border-brand-300 bg-surface px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">{c}</button>)}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-ink-100 p-3">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your agent…" aria-label="Preview message" />
        <button className="btn btn-primary px-3" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </aside>
  );
}
