import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, GitBranch, AtSign, Rss } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/product', label: 'Product' },
  { to: '/channels', label: 'Channels' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
];

export function useDemoWidget() {
  useEffect(() => {
    if (document.getElementById('ap-demo-widget')) return;
    fetch('/api/demo-agent').then((r) => r.json()).then(({ agentId }) => {
      if (!agentId || document.getElementById('ap-demo-widget')) return;
      const s = document.createElement('script');
      s.id = 'ap-demo-widget'; s.src = '/widget.js'; s.async = true; s.dataset.agent = agentId;
      document.body.appendChild(s);
    }).catch(() => {});
    return () => {
      document.getElementById('ap-demo-widget')?.remove();
      document.getElementById('agentpress-widget')?.remove();
      delete window.AgentPress;
    };
  }, []);
}

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useDemoWidget();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="AgentPress home"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-brand-600' : 'text-ink-600 hover:text-ink-900'}`}>{n.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? <Link to="/app" className="btn btn-primary">Open dashboard</Link> : <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Start building free</Link>
            </>}
          </div>
          <button className="btn-ghost rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50">{n.label}</Link>)}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" className="btn btn-outline">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Start free</Link>
            </div>
          </div>
        )}
      </header>
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}

function Footer() {
  const cols = [
    { title: 'Product', links: [['Agent studio', '/product'], ['Playbooks', '/product#playbooks'], ['Knowledge', '/product#knowledge'], ['Inbox', '/product#inbox'], ['Analytics', '/product#analytics']] },
    { title: 'Channels', links: [['Web chat', '/channels'], ['WhatsApp', '/channels'], ['Telegram', '/channels'], ['Viber', '/channels'], ['All channels', '/channels']] },
    { title: 'Resources', links: [['Docs', '/docs'], ['Quickstart', '/docs#quickstart'], ['REST API', '/docs#api'], ['Pricing', '/pricing']] },
    { title: 'Company', links: [['About', '/product'], ['Security', '/docs#security'], ['Privacy', '/docs#privacy'], ['Terms', '/docs#terms']] },
  ];
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm text-ink-400">The friendly platform for building AI agents that talk to your customers on every channel they use.</p>
            <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); alert('Thanks! You\'re on the list.'); }}>
              <input type="email" required placeholder="you@company.com" className="input border-white/10 bg-white/5 text-white placeholder:text-ink-500" aria-label="Email for newsletter" />
              <button className="btn btn-primary">Subscribe</button>
            </form>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.links.map(([l, h]) => <li key={l}><Link to={h} className="hover:text-white">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row">
          <span>© {new Date().getFullYear()} AgentPress. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="https://github.com/jobyktom/agentpress" aria-label="GitHub" className="hover:text-white"><GitBranch className="h-4 w-4" /></a>
            <span aria-hidden className="opacity-60"><AtSign className="h-4 w-4" /></span>
            <span aria-hidden className="opacity-60"><Rss className="h-4 w-4" /></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
