import { Link } from 'react-router-dom';
import { ArrowRight, Check, Search, Bell, Home as HomeIcon, MessageSquare, BarChart3, Users, Settings, ArrowLeft, Plus } from 'lucide-react';
import { ChannelIcon, CHANNEL_META } from '../components/channels';

function Arrow({ className = '' }) {
  return (
    <svg viewBox="0 0 40 16" className={`h-4 w-10 text-ink-700 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8h34M30 2l6 6-6 6" />
    </svg>
  );
}

// Three product moments in sequence: a question arrives, a playbook runs, the
// customer is sorted. Static markup, so it renders crisply at any size.
export function HeroMock() {
  const rows = [
    ['whatsapp', 'Priya Nair', 'Where is my order A-1042?', 'Resolved', true],
    ['webchat', 'Website visitor', 'Do you ship to Canada?', 'Resolved', true],
    ['viber', 'Daniel Costa', 'I want to change my address', 'Waiting', false],
    ['telegram', 'Tia Brooks', 'Can I return a gift?', 'Resolved', true],
  ];
  return (
    <div className="relative grid items-start gap-8 lg:grid-cols-12 lg:gap-6">
      {/* 01 */}
      <div className="relative lg:col-span-7">
        <span className="step-tag absolute -top-3.5 left-6 z-10">01</span>
        <div className="card overflow-hidden p-2 shadow-lift">
          <div className="flex min-h-[380px] gap-3 rounded-xl bg-paper/60 p-2">
            <div className="hidden w-14 shrink-0 flex-col items-center gap-3 rounded-xl bg-ink-900 py-4 sm:flex">
              {[HomeIcon, MessageSquare, BarChart3, Users, Settings].map((I, i) => (
                <span key={i} className={`grid h-9 w-9 place-items-center rounded-lg ${i === 1 ? 'bg-brand-500 text-white shadow-btn' : 'text-ink-400'}`}><I className="h-4 w-4" /></span>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold tracking-tight">Conversations</span>
                <span className="flex items-center gap-2 text-ink-500"><Bell className="h-4 w-4" /><span className="grid h-7 w-7 place-items-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">SL</span></span>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-ink-100/70 px-3 text-xs text-ink-400"><Search className="h-3.5 w-3.5" />Search conversations…</div>
                <span className="hidden h-9 items-center gap-1 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-btn sm:inline-flex"><Plus className="h-3.5 w-3.5" />New agent</span>
              </div>
              <div className="mt-3 flex items-end justify-between rounded-xl border border-ink-200/80 bg-surface p-4 shadow-card">
                <div>
                  <div className="text-xs text-ink-500">Resolved by AI this week</div>
                  <div className="mt-1 text-4xl font-bold tracking-tighter">82%</div>
                </div>
                <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
                  {[30, 45, 40, 62, 70, 88].map((h, i) => <span key={i} className={`w-2.5 rounded-sm ${i > 3 ? 'bg-ink-800' : 'bg-ink-300'}`} style={{ height: `${h}%` }} />)}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs"><span className="font-semibold text-ink-800">Recent</span><span className="text-ink-500">View all</span></div>
              <ul className="mt-2 divide-y divide-ink-200/70 rounded-xl border border-ink-200/80 bg-surface">
                {rows.map(([ch, name, text, status, ok]) => (
                  <li key={name} className="flex items-center gap-3 px-3 py-2.5">
                    <ChannelIcon type={ch} className="h-8 w-8 rounded-lg" iconClass="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{name}</div>
                      <div className="truncate text-[11px] text-ink-500">{text}</div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-600"><span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-brand-500' : 'bg-ink-400'}`} />{status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <Arrow className="absolute -right-9 top-20 hidden lg:block" />
      </div>

      <div className="space-y-10 lg:col-span-5 lg:pt-6">
        {/* 02 */}
        <div className="relative">
          <span className="step-tag absolute -top-3.5 left-6 z-10">02</span>
          <div className="card p-5 shadow-lift">
            <div className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4 text-ink-500" />Playbook · Track an order</div>
            <div className="mt-4 space-y-2">
              {[
                ['Ask', 'Order number', 'A-1042'],
                ['Ask', 'Email', 'priya@mail.com'],
                ['Call tool', 'GET /orders/A-1042', '200 · shipped'],
              ].map(([k, v, r]) => (
                <div key={v} className="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-ink-100/60 px-3 py-2.5">
                  <span className="w-16 shrink-0 text-[11px] text-ink-500">{k}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{v}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-600">{r}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-btn">Send update <ArrowRight className="h-4 w-4" /></div>
          </div>
        </div>
        {/* 03 */}
        <div className="relative mx-auto max-w-[300px] lg:ml-16 lg:mr-0">
          <span className="step-tag absolute -top-3.5 left-6 z-10">03</span>
          <div className="card flex flex-col items-center px-6 pb-6 pt-8 text-center shadow-lift">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-btn"><Check className="h-7 w-7" strokeWidth={3} /></span>
            <div className="mt-4 font-bold">Resolved in 38 seconds</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">A-1042</div>
            <p className="mt-2 text-xs text-ink-500">Priya got her delivery date on WhatsApp. No ticket, no wait.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  ['Instructions in plain language', 'Write identity, tone, memory and safety rules the way you would brief a new hire. The agent follows them on every channel.'],
  ['Playbooks for the steps that must go right', 'Collect details with validation, branch on answers, call your APIs and hand off. AI handles everything around the script.'],
  ['Knowledge with sources', 'Add FAQs, paste policies or import pages from your site. Replies cite where the answer came from.'],
  ['Tools that take action', 'Connect any HTTP API so the agent can look up an order, create a ticket or book a slot mid-conversation.'],
  ['A team inbox, built in', 'Escalations from every channel land in one live inbox. Take over, reply, and hand back without the customer repeating themselves.'],
  ['Analytics that point to the next fix', 'Resolution rate, handoffs, response time and ratings, plus a list of the questions your agent could not answer yet.'],
  ['Simulations and versions', 'Save test conversations, rerun them before every publish, and roll back any release in one click.'],
];

export default function Home() {
  const channels = Object.keys(CHANNEL_META).filter((c) => c !== 'api');
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20">
        <div className="fade-up max-w-4xl">
          <p className="eyebrow">AI agents for customer conversations</p>
          <h1 className="display mt-6 text-[clamp(2.75rem,8vw,6.25rem)]">Answers that<br />finish the job.</h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-600 sm:text-2xl">Build one agent. Run it on your website, WhatsApp, Telegram, Viber and nine more channels. Hand over to your team the moment it matters.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/signup" className="btn btn-primary h-12 px-6 text-base">Start building free <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={() => window.AgentPress?.open()} className="btn btn-outline h-12 px-6 text-base">Talk to a live agent</button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            {['Free plan, no card', 'No per-seat fees', 'Self-host or cloud'].map((t) => <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-500" />{t}</li>)}
          </ul>
        </div>
        <div className="mt-20"><HeroMock /></div>
      </section>

      {/* Channels */}
      <section className="border-y border-ink-200/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center">
          <p className="eyebrow shrink-0 lg:w-56">Works where your customers already are</p>
          <ul className="flex flex-wrap gap-x-7 gap-y-3 text-[15px] font-medium text-ink-700">
            {channels.map((c) => { const I = CHANNEL_META[c].icon; return <li key={c} className="inline-flex items-center gap-2"><I className="h-4 w-4 text-ink-400" />{CHANNEL_META[c].name}</li>; })}
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tighter sm:text-5xl">From a blank page to a live agent in an afternoon.</h2>
          </div>
          <p className="self-end text-lg text-ink-600 lg:col-span-6 lg:col-start-7">No engineering backlog. Your support or operations team can own the whole loop, from the first draft to the fix for next week's unanswered question.</p>
        </div>
        <div className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Build', 'Pick a template, write instructions, add knowledge, playbooks and tools.'],
            ['Test', 'Chat with your working copy side by side and run saved simulations.'],
            ['Launch', 'Publish a version and switch on web chat, WhatsApp, Viber and more.'],
            ['Improve', 'Read conversations, close knowledge gaps, and step in from the inbox.'],
          ].map(([t, d], i) => (
            <div key={t} className="relative">
              <span className="step-tag">0{i + 1}</span>
              <div className="card -mt-px rounded-tl-none p-6">
                <h3 className="text-xl font-bold tracking-tight">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-900 py-28 text-ink-100">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow text-ink-400">The platform</p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tighter text-white sm:text-5xl">Everything an agent needs in production. In one place.</h2>
            <p className="mt-6 max-w-md text-lg text-ink-400">Building, deploying, monitoring and human handoff ship together, so nothing falls between tools.</p>
            <Link to="/product" className="btn mt-8 h-11 border border-white/15 px-5 text-white hover:bg-white/5">Tour the product <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10 lg:col-span-7">
            {FEATURES.map(([t, d], i) => (
              <li key={t} className="grid gap-2 py-7 sm:grid-cols-[4rem_1fr]">
                <span className="font-mono text-sm text-brand-400">{String(i + 1).padStart(2, '0')}</span>
                <div><h3 className="text-xl font-semibold tracking-tight text-white">{t}</h3><p className="mt-2 leading-relaxed text-ink-400">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <div className="grid items-start gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">Why AgentPress</p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tighter sm:text-5xl">Built around the gaps teams hit with other builders.</h2>
            <p className="mt-6 text-lg text-ink-600">Prompt-only tools cannot guarantee a step happens. Flow-only tools break the moment a customer goes off script. You need both, plus a person on call.</p>
          </div>
          <div className="card overflow-hidden lg:col-span-7">
            <table className="w-full text-[15px]">
              <thead className="border-b border-ink-200 text-left text-xs text-ink-500">
                <tr><th className="px-5 py-4 font-medium">Capability</th><th className="px-5 py-4 font-semibold text-ink-900">AgentPress</th><th className="px-5 py-4 font-medium">Typical builder</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-200/70">
                {[
                  ['Playbooks and AI instructions together', true, 'One or the other'],
                  ['Shared human inbox', true, 'Separate product'],
                  ['Viber, LINE, Teams, Discord, SMS, email', true, 'Partial'],
                  ['Signed, verified webhooks', true, 'Varies'],
                  ['Simulations before publish', true, 'Limited'],
                  ['Version history and rollback', true, 'Limited'],
                  ['Per-seat pricing', 'Never', 'Often'],
                ].map(([k, a, b]) => (
                  <tr key={k}><td className="px-5 py-3.5">{k}</td><td className="px-5 py-3.5">{a === true ? <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span> : <span className="font-semibold">{a}</span>}</td><td className="px-5 py-3.5 text-ink-500">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-ink-200/80 py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">Templates</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tighter sm:text-5xl">Start from the job, not a blank canvas.</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              ['Customer support', 'Answer FAQs, track orders, process returns and escalate the tricky ones with full context.', ['Order tracking', 'Returns', 'Account help']],
              ['Lead capture', 'Qualify visitors, collect contact details and route large deals straight to your sales team.', ['Qualification', 'Demo booking', 'Routing']],
              ['Bookings', 'Let customers book, move and cancel appointments over WhatsApp, Viber or SMS.', ['Scheduling', 'Opening hours', 'Cancellations']],
            ].map(([t, d, tags]) => (
              <div key={t} className="card flex flex-col p-7">
                <h3 className="text-2xl font-bold tracking-tight">{t}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-ink-600">{d}</p>
                <div className="mt-6 flex flex-wrap gap-2">{tags.map((x) => <span key={x} className="chip border border-ink-200 bg-ink-100/70 text-ink-700">{x}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-ink-900 px-8 py-14 text-white sm:px-14 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-ink-400">Get started</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.02] tracking-tighter sm:text-6xl">Your first agent is ten minutes away.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="btn btn-primary h-12 px-6 text-base">Start building free</Link>
            <Link to="/pricing" className="btn h-12 border border-white/15 px-6 text-base text-white hover:bg-white/5">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
