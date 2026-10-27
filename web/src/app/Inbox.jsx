import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Headphones, Send, Bot, UserCheck, CheckCircle2, Search, Star, ArrowLeft, Info } from 'lucide-react';
import { api, timeAgo } from '../lib/api';
import { useFetch, useStream } from '../lib/hooks';
import { Tabs, Empty, Badge, Avatar, Spinner, useToast } from '../components/ui';
import { ChannelIcon, CHANNEL_META } from '../components/channels';

const STATUS = { bot: ['brand', 'Agent'], human: ['amber', 'Needs human'], closed: ['gray', 'Closed'] };

export function Thread({ cid, onBack, onChange }) {
  const { data, setData } = useFetch(`/conversations/${cid}`, [cid]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState(null);
  const end = useRef(null);
  const toast = useToast();
  useStream(data ? `/agents/${data.agent.id}/stream` : null, {
    message: (p) => p.conversationId === cid && setData((d) => d && !d.messages.some((m) => m.id === p.message.id) ? { ...d, messages: [...d.messages, p.message] } : d),
    conversation: (p) => p.conversation.id === cid && setData((d) => d && { ...d, conversation: p.conversation }),
  });
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [data?.messages.length]);
  if (!data) return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  const c = data.conversation;
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true);
    try { await api(`/conversations/${cid}/messages`, { method: 'POST', body: { text } }); setText(''); onChange?.(); }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const status = async (s) => { await api(`/conversations/${cid}/status`, { method: 'POST', body: { status: s } }); onChange?.(); };
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
        {onBack && <button className="rounded-lg p-1 hover:bg-ink-100 md:hidden" onClick={onBack} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>}
        <ChannelIcon type={c.channel} className="h-9 w-9" iconClass="h-4 w-4" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{c.user_name}</div>
          <div className="text-xs text-ink-500">{CHANNEL_META[c.channel]?.name} · {data.agent.name} · started {timeAgo(c.created_at)}{c.rating ? ` · rated ${c.rating}/5` : ''}</div>
        </div>
        <Badge tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Badge>
        {c.source === 'live' && <div className="flex gap-2">
          {c.status !== 'human' && <button className="btn btn-outline btn-sm" onClick={() => status('human')}><UserCheck className="h-3.5 w-3.5" />Take over</button>}
          {c.status === 'human' && <button className="btn btn-outline btn-sm" onClick={() => status('bot')}><Bot className="h-3.5 w-3.5" />Hand back to agent</button>}
          {c.status !== 'closed' && <button className="btn btn-dark btn-sm" onClick={() => status('closed')}><CheckCircle2 className="h-3.5 w-3.5" />Close</button>}
        </div>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/60 p-5 scrollbar-thin">
        {data.messages.map((m) => m.role === 'system' ? (
          <div key={m.id} className="text-center text-xs text-ink-400"><span className="rounded-full bg-surface px-3 py-1 ring-1 ring-ink-200">{m.text} · {timeAgo(m.created_at)}</span></div>
        ) : (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[75%]">
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-bl-md bg-surface ring-1 ring-ink-200' : m.role === 'agent' ? 'rounded-br-md bg-amber-100 text-amber-950' : 'rounded-br-md bg-brand-500 text-white'}`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.meta?.choices?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.meta.choices.map((ch) => <span key={ch} className="rounded-full bg-white/20 px-2 py-0.5 text-xs ring-1 ring-white/40">{ch}</span>)}</div>}
              </div>
              <div className={`mt-1 flex items-center gap-2 text-[11px] text-ink-400 ${m.role === 'user' ? '' : 'justify-end'}`}>
                {m.role === 'agent' && <span>{m.meta?.author}</span>}
                {m.role === 'bot' && <span>AI{m.meta?.latencyMs ? ` · ${m.meta.latencyMs} ms` : ''}</span>}
                {m.meta?.sources?.length > 0 && <span>· {m.meta.sources.map((s) => s.title).join(', ')}</span>}
                {m.meta?.trace?.length > 0 && <button className="inline-flex items-center gap-0.5 hover:text-brand-600" onClick={() => setTrace(trace === m.id ? null : m.id)}><Info className="h-3 w-3" />trace</button>}
                <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {trace === m.id && <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-ink-950 p-2 text-[10px] text-brand-100">{JSON.stringify(m.meta.trace, null, 2)}</pre>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {c.source === 'live' && (
        <form onSubmit={send} className="flex gap-2 border-t border-ink-100 p-3">
          <textarea className="input min-h-[44px] flex-1 resize-none" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
            placeholder={c.status === 'human' ? `Reply to ${c.user_name} on ${CHANNEL_META[c.channel]?.name}…` : 'Type to take over and reply…'} />
          <button className="btn btn-primary h-11" disabled={busy || !text.trim()}><Send className="h-4 w-4" />Send</button>
        </form>
      )}
    </div>
  );
}

export function ConversationList({ items, selected, onSelect, showAgent }) {
  return (
    <div className="divide-y divide-ink-100">
      {items.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)} className={`flex w-full gap-3 px-4 py-3 text-left transition ${selected === c.id ? 'bg-brand-50' : 'hover:bg-ink-50'}`}>
          <div className="relative">
            <Avatar name={c.user_name} color={c.agent_color || '#9480ff'} />
            <ChannelIcon type={c.channel} className="absolute -bottom-1 -right-1 h-4 w-4 rounded-md ring-2 ring-white" iconClass="h-2.5 w-2.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{c.user_name}</span><span className="shrink-0 text-[11px] text-ink-400">{timeAgo(c.updated_at)}</span></div>
            <p className="truncate text-xs text-ink-500">{c.last_text}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge tone={STATUS[c.status][0]} className="!text-[10px]">{STATUS[c.status][1]}</Badge>
              {showAgent && <span className="truncate text-[11px] text-ink-400">{c.agent_name}</span>}
              {c.rating && <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600"><Star className="h-3 w-3 fill-current" />{c.rating}</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function WorkspaceInbox() {
  const { wid } = useParams();
  const [status, setStatus] = useState('human');
  const [selected, setSelected] = useState(null);
  const { data, reload } = useFetch(`/workspaces/${wid}/inbox?status=${status}`, [status]);
  useStream(`/workspaces/${wid}/stream`, { conversation: () => reload(), inbox: () => reload(), message: () => reload() });
  return (
    <div className="flex h-full">
      <div className={`flex w-full flex-col border-r border-ink-200 bg-surface md:w-96 ${selected ? 'hidden md:flex' : ''}`}>
        <div className="border-b border-ink-100 p-4">
          <h1 className="flex items-center gap-2 text-xl font-extrabold"><Headphones className="h-5 w-5 text-brand-500" />Inbox</h1>
          <p className="mt-1 text-xs text-ink-500">Live conversations from every agent and channel.</p>
          <div className="mt-3"><Tabs value={status} onChange={setStatus} tabs={[{ value: 'human', label: 'Needs human' }, { value: 'bot', label: 'With agent' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} /></div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {data?.length ? <ConversationList items={data} selected={selected} onSelect={setSelected} showAgent /> : <div className="p-6"><Empty icon={CheckCircle2} title={status === 'human' ? 'All caught up' : 'Nothing here'}>{status === 'human' ? 'Escalated conversations will show up here instantly.' : 'No conversations match this filter.'}</Empty></div>}
        </div>
      </div>
      {selected ? <Thread key={selected} cid={selected} onBack={() => setSelected(null)} onChange={reload} /> : <div className="hidden flex-1 items-center justify-center md:flex"><Empty icon={Headphones} title="Pick a conversation">Select a conversation to read it, take over or reply.</Empty></div>}
    </div>
  );
}

export function AgentConversations() {
  const { aid } = useParams();
  const [f, setF] = useState({ status: 'all', channel: 'all', source: 'live', q: '' });
  const [selected, setSelected] = useState(null);
  const qs = new URLSearchParams(f).toString();
  const { data, reload } = useFetch(`/agents/${aid}/conversations?${qs}`, [qs]);
  useStream(`/agents/${aid}/stream`, { conversation: () => reload(), message: () => reload() });
  return (
    <div className="flex h-full">
      <div className={`flex w-full flex-col border-r border-ink-200 bg-surface md:w-96 ${selected ? 'hidden md:flex' : ''}`}>
        <div className="space-y-2 border-b border-ink-100 p-4">
          <h1 className="text-xl font-extrabold">Conversations</h1>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="input pl-9" placeholder="Search names and messages" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <select className="input h-8 text-xs" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="all">Any status</option><option value="bot">Agent</option><option value="human">Needs human</option><option value="closed">Closed</option></select>
            <select className="input h-8 text-xs" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} aria-label="Channel"><option value="all">All channels</option>{Object.entries(CHANNEL_META).map(([k, m]) => <option key={k} value={k}>{m.name}</option>)}</select>
            <select className="input h-8 text-xs" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} aria-label="Source"><option value="live">Live</option><option value="preview">Preview</option><option value="all">Both</option></select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {data?.length ? <ConversationList items={data} selected={selected} onSelect={setSelected} /> : <div className="p-6"><Empty title="No conversations">Try another filter, or open Preview to start one.</Empty></div>}
        </div>
      </div>
      {selected ? <Thread key={selected} cid={selected} onBack={() => setSelected(null)} onChange={reload} /> : <div className="hidden flex-1 items-center justify-center md:flex"><Empty title="Pick a conversation">See the full transcript, sources and trace for every reply.</Empty></div>}
    </div>
  );
}
