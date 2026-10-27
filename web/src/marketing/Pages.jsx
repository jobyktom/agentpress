import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Workflow, BookOpen, Wrench, Headphones, BarChart3, History, FlaskConical, Users, Code2 } from 'lucide-react';
import { ChannelIcon, CHANNEL_META } from '../components/channels';
import { HeroMock } from './Home';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';

function Hero({ eyebrow, title, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 lg:pt-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-5 max-w-4xl text-[clamp(2.5rem,6vw,4.75rem)]">{title}</h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-600">{children}</p>
    </section>
  );
}

export function Product() {
  const blocks = [
    { id: 'playbooks', icon: Workflow, title: 'Playbooks', text: 'Design the conversations that need to follow a script: ask for details with validation, branch on answers, call your APIs and hand off. Each playbook is drawn as a flow you can read at a glance, and AI handles everything around it.', bullets: ['Ask, message, condition, API call, AI reply, handoff steps', 'Email, phone, number and yes/no validation with retries', 'Variables like {{orderNumber}} carry through the chat'] },
    { id: 'knowledge', icon: BookOpen, title: 'Knowledge', text: 'Give your agent the facts. Add FAQs, paste policies, or import public web pages. Retrieval picks the most relevant passages for every question and replies show their source.', bullets: ['FAQs, documents and web pages', 'Source citations in replies', 'Unanswered questions surface as gaps'] },
    { id: 'tools', icon: Wrench, title: 'Tools', text: 'Connect any HTTP endpoint with parameters, headers and body templates. Test it from the dashboard, then let the AI or a playbook call it mid-conversation.', bullets: ['GET, POST, PUT, PATCH, DELETE', 'Templated URLs, headers and bodies', 'Built-in test console'] },
    { id: 'inbox', icon: Headphones, title: 'Human inbox', text: 'Escalations from every agent and channel arrive in one inbox, live. Take over, reply, hand back to the agent or close, and the customer never has to repeat themselves.', bullets: ['Keyword, sentiment and AI-triggered handoff', 'Live updates without refreshing', 'Replies delivered on the original channel'] },
    { id: 'analytics', icon: BarChart3, title: 'Analytics', text: 'Track conversations, resolution rate, handoffs, latency and satisfaction by day and channel, and see which playbooks run most.', bullets: ['Resolution and handoff rates', 'p50 / p95 response time', 'Ratings from the web chat'] },
    { id: 'quality', icon: FlaskConical, title: 'Simulations & versions', text: 'Save conversations with expected phrases and rerun them on the working copy before you publish. Every publish becomes a version you can restore.', bullets: ['One-click test runs', 'Publish notes and history', 'Restore any version'] },
  ];
  return (
    <>
      <Hero eyebrow="Product" title="Everything you need to run AI agents in production">Build with instructions, playbooks, knowledge and tools. Launch on 13 channels. Monitor, improve and step in when it counts.</Hero>
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6"><HeroMock /></div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-20 sm:px-6">
        {blocks.map(({ id, icon: Icon, title, text, bullets }) => (
          <section id={id} key={id} className="card grid scroll-mt-24 gap-6 p-8 md:grid-cols-5 md:p-10">
            <div className="md:col-span-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">{title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-600">{text}</p>
            </div>
            <ul className="space-y-3 self-center md:col-span-2">
              {bullets.map((b) => <li key={b} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{b}</li>)}
            </ul>
          </section>
        ))}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-8"><Users className="h-6 w-6 text-ink-800" /><h3 className="mt-3 text-lg font-bold">Teams and roles</h3><p className="mt-2 text-sm text-ink-500">Invite teammates as viewers, editors or admins. Work across multiple workspaces for different brands or clients.</p></div>
          <div className="card p-8"><History className="h-6 w-6 text-ink-800" /><h3 className="mt-3 text-lg font-bold">Working copy vs. published</h3><p className="mt-2 text-sm text-ink-500">Edit freely while customers keep talking to the published version. Preview always runs your latest changes.</p></div>
        </div>
      </div>
    </>
  );
}

export function Channels() {
  const groups = {};
  for (const [k, m] of Object.entries(CHANNEL_META)) (groups[m.category] ||= []).push([k, m]);
  return (
    <>
      <Hero eyebrow="Channels" title="Meet customers on every channel">One agent, thirteen channels. Connect in minutes with guided setup, signed webhooks and automatic registration where providers support it.</Hero>
      <div className="mx-auto max-w-7xl space-y-12 px-4 pb-24 sm:px-6">
        {Object.entries(groups).map(([g, list]) => (
          <section key={g}>
            <h2 className="eyebrow mb-4">{g}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(([k, m]) => (
                <div key={k} className="card flex gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <ChannelIcon type={k} className="h-12 w-12" />
                  <div><h3 className="font-bold">{m.name}</h3><p className="mt-1 text-sm text-ink-500">{m.blurb}</p></div>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <Code2 className="h-8 w-8 text-ink-800" />
          <h3 className="text-xl font-bold">Need something custom?</h3>
          <p className="max-w-lg text-sm text-ink-500">Use the REST API channel to connect kiosks, mobile apps, voice systems or anything else that can make an HTTP request.</p>
          <Link to="/docs#api" className="btn btn-outline">Read the API docs</Link>
        </div>
      </div>
    </>
  );
}

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const plans = [
    { name: 'Free', price: 0, desc: 'For trying things out and side projects.', cta: 'Start free', features: ['2,000 AI replies / month', '5 agents', 'All 13 channels', 'Shared inbox', '3 teammates'] },
    { name: 'Growth', price: annual ? 79 : 99, desc: 'For teams running agents with real customers.', cta: 'Start 14-day trial', featured: true, features: ['50,000 AI replies / month', '50 agents', 'Unlimited teammates', 'Remove AgentPress branding', 'Simulations & version history', 'Email support'] },
    { name: 'Scale', price: null, desc: 'For high volume, compliance and custom needs.', cta: 'Talk to us', features: ['Custom reply volume', 'SSO and audit export', 'Dedicated infrastructure', 'Uptime SLA', 'Solutions engineer'] },
  ];
  return (
    <>
      <Hero eyebrow="Pricing" title="Simple pricing. No per-seat fees.">Pay for the conversations your agents handle, not for how many people are on your team.</Hero>
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="mb-10 flex">
          <div className="inline-flex rounded-full border border-ink-200 bg-ink-100 p-1 text-sm font-semibold">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 ${!annual ? 'bg-surface shadow-card' : 'text-ink-500'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 ${annual ? 'bg-surface shadow-card' : 'text-ink-500'}`}>Yearly <span className="text-brand-600">−20%</span></button>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`card relative flex flex-col p-8 ${p.featured ? 'border-ink-900 shadow-lift' : ''}`}>
              {p.featured && <span className="step-tag absolute -top-3.5 left-8">Most popular</span>}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-500">{p.desc}</p>
              <div className="mt-6 font-display text-5xl font-bold tracking-tighter">{p.price == null ? 'Custom' : `$${p.price}`}<span className="text-base font-medium text-ink-400">{p.price ? '/mo' : ''}</span></div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-500" />{f}</li>)}
              </ul>
              <Link to="/signup" className={`btn mt-8 h-11 ${p.featured ? 'btn-primary' : 'btn-outline'}`}>{p.cta}</Link>
            </div>
          ))}
        </div>
        <div className="mt-20 max-w-3xl space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          {[
            ['What counts as an AI reply?', 'Each message your agent sends to a customer on a live channel. Preview and simulation messages are free.'],
            ['Do I need my own model key?', 'Agents answer from knowledge and playbooks out of the box. Add an Anthropic API key on your server to unlock full generative replies and tool use.'],
            ['Can I self-host?', 'Yes. AgentPress is a single Node.js app with an embedded database. It runs on Hostinger, any VPS or a container platform.'],
          ].map(([q, a]) => (
            <details key={q} className="card group p-5"><summary className="cursor-pointer list-none font-semibold">{q}</summary><p className="mt-3 text-sm text-ink-500">{a}</p></details>
          ))}
        </div>
      </div>
    </>
  );
}

export function Docs() {
  const sections = [
    ['quickstart', 'Quickstart', <>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Sign up and open your workspace.</li>
        <li>Click <b>New agent</b> and pick a template.</li>
        <li>Edit <b>Instructions</b>, add <b>Knowledge</b>, and test in the <b>Preview</b> panel.</li>
        <li>Click <b>Publish</b>, then open <b>Deploy › Channels</b> to connect web chat, WhatsApp, Telegram, Viber and more.</li>
      </ol></>],
    ['webchat', 'Embed web chat', <><p>Paste this before <code>&lt;/body&gt;</code> on your site. You'll find your agent ID under <b>Deploy › Web chat</b>.</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-xs text-ink-100">{`<script src="${location.origin}/widget.js" data-agent="YOUR_AGENT_ID" async></script>`}</pre>
      <p className="mt-3">Control it from your page with <code>window.AgentPress.open()</code>, <code>.close()</code> and <code>.send("text")</code>.</p></>],
    ['api', 'REST API', <><p>Create an API key in <b>Workspace settings</b>, then:</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-xs text-ink-100">{`curl -X POST ${location.origin}/api/v1/agents/AGENT_ID/messages \\
  -H "Authorization: Bearer ap_..." -H "Content-Type: application/json" \\
  -d '{"userId":"customer-42","text":"Where is my order?"}'`}</pre>
      <p className="mt-3">The response contains the agent's replies, any quick-reply choices and the conversation status.</p></>],
    ['playbooks', 'Playbook steps', <ul className="list-disc space-y-1.5 pl-5">
      <li><b>Message</b> sends text, with optional quick replies.</li><li><b>Ask</b> waits for an answer, validates it and saves it to a variable.</li>
      <li><b>Condition</b> branches on a variable.</li><li><b>Call tool</b> runs an HTTP tool and stores the result.</li>
      <li><b>AI reply</b> lets the model answer with extra instructions.</li><li><b>Handoff</b> moves the chat to the human inbox.</li><li><b>End</b> finishes the playbook.</li></ul>],
    ['security', 'Security', <p>Passwords are hashed with scrypt, channel secrets are masked in the dashboard, and webhooks from WhatsApp, Messenger, Instagram, Slack, Telegram, Viber and LINE are verified by signature or secret before they're processed.</p>],
    ['privacy', 'Privacy', <p>Conversation data stays in your own database. Delete an agent to remove its conversations and logs.</p>],
    ['terms', 'Terms', <p>Use AgentPress responsibly and follow each messaging provider's policies when you connect a channel.</p>],
  ];
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="eyebrow mb-3">Documentation</h2>
        <nav className="space-y-1">{sections.map(([id, t]) => <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100">{t}</a>)}</nav>
      </aside>
      <div className="space-y-12 lg:col-span-3">
        <h1 className="display text-5xl">AgentPress docs</h1>
        {sections.map(([id, t, body]) => (
          <section key={id} id={id} className="scroll-mt-24">
            <h2 className="text-2xl font-bold">{t}</h2>
            <div className="mt-3 space-y-2 text-ink-600">{body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AuthPage({ mode }) {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: mode === 'login' ? 'demo@agentpress.dev' : '', password: mode === 'login' ? 'demo1234' : '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await signIn(mode === 'login' ? '/auth/login' : '/auth/signup', form); nav('/app'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <Link to="/"><Logo /></Link>
        <h1 className="mt-12 text-4xl font-bold tracking-tighter">{mode === 'login' ? 'Welcome back' : 'Create your free account'}</h1>
        <p className="mt-2 text-sm text-ink-500">{mode === 'login' ? 'Log in to manage your agents.' : 'Build your first agent in minutes. No credit card needed.'}</p>
        <form onSubmit={submit} className="mt-8 max-w-sm space-y-4">
          {mode === 'signup' && <label className="block"><span className="label">Full name</span><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>}
          <label className="block"><span className="label">Work email</span><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
          <label className="block"><span className="label">Password</span><input className="input" type="password" required minLength={mode === 'signup' ? 8 : 1} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button className="btn btn-primary h-11 w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight className="h-4 w-4" /></button>
          {mode === 'login' && <p className="text-xs text-ink-500">Demo account is pre-filled: demo@agentpress.dev / demo1234</p>}
        </form>
        <p className="mt-6 text-sm text-ink-500">{mode === 'login' ? <>New here? <Link className="font-semibold text-ink-900 underline decoration-brand-500 underline-offset-4" to="/signup">Create an account</Link></> : <>Already have an account? <Link className="font-semibold text-ink-900 underline decoration-brand-500 underline-offset-4" to="/login">Log in</Link></>}</p>
      </div>
      <div className="hidden bg-ink-100/60 p-10 lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-md">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tighter">One agent.<br />Every conversation.</h2>
          <ol className="mt-10 space-y-4">
            {[[BookOpen, 'Answers grounded in your knowledge'], [Workflow, 'Playbooks for the steps that must go right'], [Headphones, 'A human inbox when people are needed']].map(([I, t], i) => (
              <li key={t} className="card flex items-center gap-4 p-4">
                <span className="step-tag">0{i + 1}</span>
                <span className="flex-1 text-[15px] font-medium">{t}</span>
                <I className="h-5 w-5 text-ink-400" />
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-2">
            {Object.keys(CHANNEL_META).slice(0, 12).map((c) => <ChannelIcon key={c} type={c} className="h-9 w-9 rounded-xl" iconClass="h-4 w-4" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HostedChat({ agentId }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div id="hosted-chat" className="h-[min(720px,calc(100vh-2rem))] w-full max-w-lg" />
      <ScriptLoader agentId={agentId} />
    </div>
  );
}

function ScriptLoader({ agentId }) {
  useState(() => {
    const s = document.createElement('script');
    s.src = '/widget.js'; s.async = true; s.dataset.agent = agentId; s.dataset.mode = 'inline'; s.dataset.target = '#hosted-chat';
    setTimeout(() => document.body.appendChild(s), 0);
  });
  return null;
}
