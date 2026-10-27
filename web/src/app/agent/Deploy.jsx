import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, MessageSquareCode, Search, ExternalLink, AlertTriangle, CheckCircle2, Clock, Loader2, Unplug, Code2, MessageCircle, X, ArrowRight } from 'lucide-react';
import { useAgent } from './context';
import { PageHeader, Badge, Modal, Toggle, CopyField, PageLoader, useToast, Tabs } from '../../components/ui';
import { ChannelIcon, CHANNEL_META, CHANNEL_GUIDES } from '../../components/channels';
import { api, timeAgo } from '../../lib/api';
import { useFetch } from '../../lib/hooks';

const STATUS = {
  live: ['green', 'Live'], needs_setup: ['amber', 'Needs setup'], disabled: ['gray', 'Disabled'], error: ['red', 'Error'], available: ['gray', 'Not connected'],
};

export function Channels() {
  const { aid, wid } = useParams();
  const { agent } = useAgent();
  const { data, reload, setData } = useFetch(`/agents/${aid}/channels`);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  if (!data) return <PageLoader />;
  const connected = data.filter((c) => c.status !== 'available');
  const list = data.filter((c) => (filter === 'all' || (filter === 'connected' ? c.status !== 'available' : c.status === 'available')) && c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader icon={Radio} title="Channels" description="Where customers talk to the published version of your agent. Connect as many as you like; conversations from all of them land in one inbox." />
      {!agent.publishedVersion && <div className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="h-4 w-4" />This agent isn't published yet. Channels will use your working copy until you publish.</div>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All', count: data.length }, { value: 'connected', label: 'Connected', count: connected.length }, { value: 'available', label: 'Available', count: data.length - connected.length }]} />
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="input pl-9" placeholder="Search channels" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {list.map((c) => (
          <div key={c.type} className="card flex flex-col p-5">
            <div className="flex items-start gap-3">
              <ChannelIcon type={c.type} className="h-11 w-11" />
              <div className="min-w-0 flex-1"><h3 className="truncate font-bold">{c.name}</h3><p className="text-xs text-ink-500">{CHANNEL_META[c.type].category}</p></div>
              <Badge tone={STATUS[c.status][0]}>{c.status === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}{STATUS[c.status][1]}</Badge>
            </div>
            <p className="mt-3 flex-1 text-sm text-ink-500">{CHANNEL_META[c.type].blurb}</p>
            {c.status !== 'available' && (
              <div className="mt-3 flex gap-4 text-[11px] text-ink-400"><span>{c.conversations} conversations</span><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{c.lastEventAt ? `Last message ${timeAgo(c.lastEventAt)}` : 'No messages yet'}</span></div>
            )}
            <button className={`btn btn-sm mt-4 ${c.status === 'available' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setOpen(c.type)}>{c.status === 'available' ? 'Connect' : 'Manage'}</button>
          </div>
        ))}
      </div>
      {open && <ChannelModal channel={data.find((c) => c.type === open)} aid={aid} wid={wid} onClose={() => setOpen(null)} onSaved={(c) => setData((d) => d.map((x) => x.type === c.type ? c : x))} onRemoved={() => { setOpen(null); reload(); }} />}
    </div>
  );
}

function ChannelModal({ channel, aid, wid, onClose, onSaved, onRemoved }) {
  const { canEdit } = useAgent();
  const guide = CHANNEL_GUIDES[channel.type];
  const [cfg, setCfg] = useState(channel.config);
  const [enabled, setEnabled] = useState(channel.status === 'available' ? true : channel.enabled);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const toast = useToast();
  const save = async (e) => {
    e?.preventDefault(); setBusy(true); setInfo(null);
    try {
      const r = await api(`/agents/${aid}/channels/${channel.type}`, { method: 'PUT', body: { enabled, config: cfg } });
      onSaved(r); setCfg(r.config);
      if (r.lastError) setInfo({ tone: 'error', text: r.lastError });
      else { setInfo({ tone: 'ok', text: r.info || (r.status === 'live' ? 'Saved and live.' : r.status === 'needs_setup' ? `Saved. Still needed: ${r.missing.join(', ')}` : 'Saved.') }); toast(`${channel.name} saved`); }
    } catch (err) { setInfo({ tone: 'error', text: err.message }); } finally { setBusy(false); }
  };
  const remove = async () => { if (!confirm(`Disconnect ${channel.name}? Saved credentials will be deleted.`)) return; await api(`/agents/${aid}/channels/${channel.type}`, { method: 'DELETE' }); onRemoved(); };
  const live = channel.webhookUrl;
  return (
    <Modal open onClose={onClose} title={<span className="flex items-center gap-2"><ChannelIcon type={channel.type} className="h-7 w-7 rounded-lg" iconClass="h-4 w-4" />{channel.name}</span>} wide>
      {channel.type === 'webchat' ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Web chat is ready to use. Customise how it looks and grab the embed code on the Web chat page.</p>
          <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4"><span className="text-sm font-semibold">Enabled</span><Toggle checked={enabled} disabled={!canEdit} onChange={(v) => setEnabled(v)} label="Enabled" /></div>
          <div className="flex justify-end gap-2"><a href={`/app/w/${wid}/agents/${aid}/webchat`} className="btn btn-outline">Customise</a>{canEdit && <button className="btn btn-primary" onClick={save} disabled={busy}>Save</button>}</div>
        </div>
      ) : channel.type === 'api' ? (
        <div className="space-y-4 text-sm text-ink-600">
          <p>Send messages to this agent from your own app using a workspace API key.</p>
          <pre className="overflow-x-auto rounded-xl bg-ink-950 p-4 text-xs text-brand-100">{`curl -X POST ${location.origin}/api/v1/agents/${aid}/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"userId":"customer-42","text":"Hello"}'`}</pre>
          <div className="flex justify-end"><a href={`/app/w/${wid}/settings`} className="btn btn-primary"><Code2 className="h-4 w-4" />Create an API key</a></div>
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400">How to connect</h4>
            <ol className="mt-3 space-y-3">
              {guide.steps.map((s, i) => <li key={i} className="flex gap-3 text-sm text-ink-600"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>{s}</li>)}
            </ol>
            {channel.lastEventAt && <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Last webhook received {timeAgo(channel.lastEventAt)}</p>}
          </div>
          <div className="space-y-4 md:col-span-3">
            {live && <CopyField label="Webhook URL" value={channel.webhookUrl} />}
            {channel.fields.map((f) => (
              <label key={f} className="block"><span className="label">{guide.labels[f] || f}</span>
                <input className="input font-mono text-xs" disabled={!canEdit} value={cfg[f] || ''} onChange={(e) => setCfg({ ...cfg, [f]: e.target.value })} type={/secret|token|password|key/i.test(f) && !(cfg[f] || '').startsWith('••••') ? 'password' : 'text'} autoComplete="off" />
              </label>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3"><div><div className="text-sm font-semibold">Enabled</div><div className="text-xs text-ink-500">Turn off to pause replies without losing settings.</div></div><Toggle checked={enabled} disabled={!canEdit} onChange={setEnabled} label="Enabled" /></div>
            {info && <p className={`flex items-start gap-2 rounded-lg p-3 text-sm ${info.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{info.tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{info.text}</p>}
            {canEdit && <div className="flex justify-between gap-2">
              {channel.status !== 'available' ? <button type="button" className="btn btn-ghost text-rose-600" onClick={remove}><Unplug className="h-4 w-4" />Disconnect</button> : <span />}
              <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save & connect</button>
            </div>}
          </div>
        </form>
      )}
    </Modal>
  );
}

const THEMES = [
  { name: 'Forest & bronze', head: '#1e2a24', accent: '#9a7b4f' },
  { name: 'Graphite & orange', head: '#181715', accent: '#ee661b' },
  { name: 'Navy & sky', head: '#16233a', accent: '#3f7fc4' },
  { name: 'Plum & rose', head: '#2c1b2b', accent: '#b5566f' },
];

function ColorField({ label, value, onChange, disabled }) {
  return (
    <label className="block"><span className="label">{label}</span>
      <div className="flex gap-2"><input type="color" disabled={disabled} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-surface" value={value} onChange={(e) => onChange(e.target.value)} /><input className="input font-mono" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} /></div>
    </label>
  );
}

export function Webchat() {
  const { agent, config, updateConfig, canEdit } = useAgent();
  const w = config.webchat;
  const set = (k, v) => updateConfig((c) => { c.webchat[k] = v; return c; });
  const head = w.headerColor || '#1e2a24';
  const snippet = `<script src="${location.origin}/widget.js" data-agent="${agent.id}" async></script>`;
  const hosted = `${location.origin}/chat/${agent.id}`;
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader icon={MessageSquareCode} title="Web chat" description="Customise the chat bubble, then add it to your site or share the hosted page." actions={<a href={hosted} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="h-3.5 w-3.5" />Open hosted chat</a>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <h3 className="font-bold">Appearance</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">Title</span><input className="input" disabled={!canEdit} value={w.title} onChange={(e) => set('title', e.target.value)} /></label>
              <label className="block"><span className="label">Subtitle</span><input className="input" disabled={!canEdit} value={w.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></label>
              <div className="sm:col-span-2">
                <span className="label">Theme</span>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button key={t.name} type="button" disabled={!canEdit} onClick={() => updateConfig((c) => { c.webchat.headerColor = t.head; c.webchat.primaryColor = t.accent; return c; })}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${head === t.head && w.primaryColor === t.accent ? 'border-ink-900 bg-surface' : 'border-ink-200 hover:border-ink-300'}`}>
                      <span className="flex"><span className="h-4 w-4 rounded-full ring-2 ring-surface" style={{ background: t.head }} /><span className="-ml-1.5 h-4 w-4 rounded-full ring-2 ring-surface" style={{ background: t.accent }} /></span>{t.name}
                    </button>
                  ))}
                </div>
              </div>
              <ColorField label="Header color" value={head} disabled={!canEdit} onChange={(v) => set('headerColor', v)} />
              <ColorField label="Accent color" value={w.primaryColor} disabled={!canEdit} onChange={(v) => set('primaryColor', v)} />
              <label className="block"><span className="label">Position</span><select className="input" disabled={!canEdit} value={w.position} onChange={(e) => set('position', e.target.value)}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></label>
              <label className="block sm:col-span-2"><span className="label">Launcher label (optional)</span><input className="input" disabled={!canEdit} value={w.launcherText} onChange={(e) => set('launcherText', e.target.value)} placeholder="Chat with us" /></label>
            </div>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Show “Powered by AgentPress”</span><Toggle checked={w.showPoweredBy} disabled={!canEdit} onChange={(v) => set('showPoweredBy', v)} label="Powered by" /></div>
          </div>
          <div className="card space-y-4 p-5">
            <h3 className="font-bold">Add to your website</h3>
            <p className="text-sm text-ink-500">Paste this just before <code>&lt;/body&gt;</code>. It loads the published version of your agent.</p>
            <CopyField value={snippet} />
            <CopyField label="Shareable link" value={hosted} />
            <p className="text-xs text-ink-400">Changes to appearance go live when you publish.</p>
          </div>
        </div>
        <div className="card relative min-h-[600px] overflow-hidden bg-ink-100/70">
          <div className="eyebrow absolute left-5 top-4">Live preview</div>
          <div className={`absolute bottom-24 ${w.position === 'left' ? 'left-5' : 'right-5'} flex w-[330px] max-w-[calc(100%-2.5rem)] flex-col overflow-hidden rounded-[18px] border border-black/5 bg-[#fbfaf6] shadow-pop`}>
            <div className="flex items-center gap-3 px-4 py-3.5 text-[#f6f3ec]" style={{ background: head }}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#efe9dc]" style={{ color: head }}><MessageCircle className="h-5 w-5" /></span>
              <div><div className="text-[15px] font-bold">{w.title}</div><div className="flex items-center gap-1.5 text-[12px] opacity-80"><span className="h-1.5 w-1.5 rounded-full bg-[#7bc38f]" />{w.subtitle}</div></div>
              <X className="ml-auto h-4 w-4 opacity-70" />
            </div>
            <div className="space-y-2.5 px-4 py-4 text-[13.5px] leading-snug">
              <div className="w-fit max-w-[86%] rounded-xl bg-[#e8ede6] px-3.5 py-2.5 text-[#25302a]">{config.greeting}</div>
              <div className="ml-auto w-fit max-w-[86%] rounded-xl px-3.5 py-2.5 text-[#fbf8f2]" style={{ background: w.primaryColor }}>{config.suggestions[0] || 'Hi there!'}</div>
              <div className="flex w-fit gap-1 rounded-xl bg-[#e8ede6] px-3.5 py-3">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#7e8a82]" />)}</div>
              <div className="flex flex-wrap justify-end gap-1.5 pt-1">{config.suggestions.slice(1).map((s) => <span key={s} className="rounded-full border px-2.5 py-1 text-xs font-medium" style={{ borderColor: w.primaryColor, color: w.primaryColor }}>{s}</span>)}</div>
            </div>
            <div className="px-3 pb-3"><div className="flex items-center rounded-[14px] border border-[#e1ddd3] bg-surface py-1.5 pl-3.5 pr-1.5 text-[13px] text-[#9a9f98]">Type your question…<span className="ml-auto grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: w.primaryColor }}><ArrowRight className="h-4 w-4" /></span></div></div>
            {w.showPoweredBy && <div className="pb-2.5 text-center text-[10px] text-[#9a9f98]">Powered by <b>AgentPress</b></div>}
          </div>
          <div className={`absolute bottom-5 ${w.position === 'left' ? 'left-5' : 'right-5'} flex h-14 min-w-14 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-[#f6f3ec] shadow-pop`} style={{ background: head }}>
            <MessageCircle className="h-6 w-6" />{w.launcherText}
          </div>
        </div>
      </div>
    </div>
  );
}
