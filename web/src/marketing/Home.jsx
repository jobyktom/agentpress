import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Workflow, Wrench, Headphones, BarChart3, History, FlaskConical, ShieldCheck, Sparkles, Check, Zap, Globe2, Users } from 'lucide-react';
import { ChannelIcon, CHANNEL_META } from '../components/channels';

export function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-fuchsia-200/40 to-mint-400/30 blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-pop">
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-300" /><span className="h-3 w-3 rounded-full bg-amber-300" /><span className="h-3 w-3 rounded-full bg-emerald-300" />
          <span className="ml-3 text-xs font-medium text-ink-400">Playbook · Track an order</span>
        </div>
        <div className="grid grid-cols-5">
          <div className="col-span-3 space-y-3 border-r border-ink-100 bg-[radial-gradient(#e2e1ee_1px,transparent_1px)] p-5 [background-size:16px_16px]">
            {[
              ['Trigger', '“Where is my order?”', 'bg-brand-500'],
              ['Ask', 'Order number → orderNumber', 'bg-sky-500'],
              ['Call API', 'GET /orders/{{orderNumber}}', 'bg-amber-500'],
              ['Condition', 'status = delayed?', 'bg-fuchsia-500'],
              ['Reply', 'Your order arrives {{eta}}', 'bg-emerald-500'],
            ].map(([k, v, c], i) => (
              <div key={k} className="fade-up flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-2.5 shadow-sm" style={{ animationDelay: `${i * 120}ms` }}>
                <span className={`h-7 w-1.5 rounded-full ${c}`} />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{k}</div>
                  <div className="truncate text-xs font-medium text-ink-800">{v}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="col-span-2 flex flex-col gap-2 bg-white p-4 text-[12px]">
            <div className="self-end rounded-2xl rounded-br-md bg-brand-500 px-3 py-2 text-white">Where is my order?</div>
            <div className="rounded-2xl rounded-bl-md border border-ink-200 px-3 py-2">Happy to check! What's your order number?</div>
            <div className="self-end rounded-2xl rounded-br-md bg-brand-500 px-3 py-2 text-white">A-1042</div>
            <div className="rounded-2xl rounded-bl-md border border-ink-200 px-3 py-2">It's out for delivery and arrives today before 6pm 🚚</div>
            <div className="mt-auto flex flex-wrap gap-1">
              {['whatsapp', 'telegram', 'viber', 'webchat'].map((t) => <ChannelIcon key={t} type={t} className="h-6 w-6 rounded-lg" iconClass="h-3.5 w-3.5" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-ink-200 bg-white p-3 shadow-pop sm:block">
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Resolved by AI</div>
        <div className="font-display text-2xl font-extrabold text-emerald-600">82%</div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Sparkles, title: 'Instructions, not code', text: 'Describe identity, tone, memory and safety rules in plain language. Your agent follows them on every channel.' },
  { icon: Workflow, title: 'Visual playbooks', text: 'Combine AI with step-by-step flows for the moments that must go exactly right: collecting details, branching, calling APIs.' },
  { icon: BookOpen, title: 'Knowledge from anywhere', text: 'Add FAQs, paste documents or import web pages. Answers cite their source so customers can trust them.' },
  { icon: Wrench, title: 'Tools that take action', text: 'Connect any HTTP API so the agent can look up orders, create tickets or book meetings in the middle of a chat.' },
  { icon: Headphones, title: 'Built-in team inbox', text: 'When a human is needed, conversations land in a shared inbox with full context. Reply from one place across every channel.' },
  { icon: BarChart3, title: 'Analytics and gaps', text: 'See resolution rate, handoffs, latency and satisfaction. Unanswered questions are collected so you know what to teach next.' },
  { icon: FlaskConical, title: 'Simulations', text: 'Save test conversations with expected answers and rerun them before every publish to catch regressions.' },
  { icon: History, title: 'Versions and rollback', text: 'Every publish is a version. Compare, restore and republish in one click when something goes wrong.' },
];

export default function Home() {
  const channels = Object.keys(CHANNEL_META).filter((c) => c !== 'api');
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,#efeaff_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#e0fbf6_0%,transparent_50%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="fade-up">
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200"><Zap className="h-3 w-3" /> New: visual playbooks + 13 channels</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              AI agents that <span className="gradient-text">resolve</span>, not just reply.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-500">
              AgentPress is the all-in-one platform to build, test and launch customer-facing AI agents on your website, WhatsApp, Telegram, Viber and every channel in between, with a human inbox built in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn btn-primary h-12 px-6 text-base">Start building free <ArrowRight className="h-4 w-4" /></Link>
              <button onClick={() => window.AgentPress?.open()} className="btn btn-outline h-12 px-6 text-base">Chat with a live agent</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              {['Free plan, no credit card', 'No per-seat fees', 'Live in minutes'].map((t) => <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{t}</span>)}
            </div>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* Channels strip */}
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-center text-sm font-semibold text-ink-500">Build once. Launch everywhere your customers already are.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {channels.map((c) => (
              <span key={c} className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-sm">
                <ChannelIcon type={c} className="h-7 w-7 rounded-full" iconClass="h-3.5 w-3.5" />{CHANNEL_META[c].name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">From idea to live agent in four steps</h2>
          <p className="mt-4 text-ink-500">No engineering backlog. Your support or ops team can own the whole loop.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {[
            ['Build', 'Pick a template, write instructions and add knowledge, playbooks and tools.'],
            ['Test', 'Chat with the working copy side by side and run saved simulations.'],
            ['Launch', 'Publish a version and switch on web chat, WhatsApp, Telegram, Viber and more.'],
            ['Improve', 'Review conversations, close knowledge gaps and step in from the inbox.'],
          ].map(([t, d], i) => (
            <div key={t} className="card relative p-6">
              <span className="font-display text-5xl font-extrabold text-brand-100">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-ink-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="chip bg-white/10 text-brand-200">Everything in one place</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">A complete agent platform, not a pile of plugins</h2>
            <p className="mt-4 text-ink-300">Building, deploying, monitoring and human handoff ship together, so nothing falls between tools.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-ink-950 p-6 transition hover:bg-ink-900">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm text-ink-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Fixes the gaps teams hit with other builders</h2>
            <p className="mt-4 text-ink-500">We studied where agent builders slow teams down and designed around it.</p>
            <ul className="mt-8 space-y-5">
              {[
                [Workflow, 'AI and structured flows together', 'Prompt-only builders can\'t guarantee a step happens. Playbooks run deterministic steps and hand the rest to AI.'],
                [Headphones, 'Human inbox included', 'No separate helpdesk subscription. Take over any conversation on any channel and hand it back when you\'re done.'],
                [Globe2, 'More channels out of the box', 'Viber, LINE, Teams, Discord, SMS and email sit next to web chat and WhatsApp, with webhooks verified by signature.'],
                [ShieldCheck, 'Safe changes', 'Edit a working copy, test it, publish a version, roll back anytime. Roles keep viewers from editing.'],
              ].map(([Icon, t, d]) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
                  <div><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-ink-500">{d}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr><th className="px-5 py-3">Capability</th><th className="px-5 py-3 text-brand-600">AgentPress</th><th className="px-5 py-3">Typical builder</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {[
                  ['Visual flows + AI instructions', true, 'One or the other'],
                  ['Shared human inbox', true, 'Separate product'],
                  ['Viber, LINE, Teams, Discord, SMS', true, 'Partial'],
                  ['Simulations before publish', true, 'Limited'],
                  ['Version history and rollback', true, 'Limited'],
                  ['Per-seat pricing', 'Never', 'Often'],
                ].map(([k, a, b]) => (
                  <tr key={k}><td className="px-5 py-3 font-medium">{k}</td><td className="px-5 py-3">{a === true ? <Check className="h-5 w-5 text-emerald-500" /> : <span className="font-semibold text-emerald-600">{a}</span>}</td><td className="px-5 py-3 text-ink-500">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-gradient-to-b from-ink-50 to-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Ready-made for the jobs that matter</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              [Headphones, 'Customer support', 'Answer FAQs, track orders, process returns and escalate the tricky ones with full context.', ['Order tracking', 'Returns', 'Account help']],
              [Users, 'Lead capture & sales', 'Qualify visitors, collect contact details and route big deals straight to your sales team.', ['Qualification', 'Demo booking', 'CRM sync']],
              [Sparkles, 'Bookings & services', 'Let customers book, move and cancel appointments over WhatsApp, Viber or SMS.', ['Scheduling', 'Reminders', 'FAQs']],
            ].map(([Icon, t, d, tags]) => (
              <div key={t} className="card p-7">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-ink-500">{d}</p>
                <div className="mt-5 flex flex-wrap gap-2">{tags.map((x) => <span key={x} className="chip bg-ink-100 text-ink-600">{x}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 px-6 py-16 text-center text-white sm:px-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-mint-400/20 blur-3xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-5xl">Your first agent is ten minutes away</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-brand-100">Start from a template, connect a channel and watch it handle real conversations today.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="btn h-12 bg-white px-6 text-base text-ink-900 hover:bg-brand-50">Start building free</Link>
            <Link to="/pricing" className="btn h-12 border border-white/30 px-6 text-base text-white hover:bg-white/10">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
