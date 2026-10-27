export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs><linearGradient id="lg-ap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c6cff" /><stop offset="1" stopColor="#3b2fd1" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill="url(#lg-ap)" />
      <path d="M9 10.5A3.5 3.5 0 0 1 12.5 7h7A3.5 3.5 0 0 1 23 10.5v5a3.5 3.5 0 0 1-3.5 3.5H15l-4.2 3.6a.5.5 0 0 1-.8-.4V18.6A3.5 3.5 0 0 1 9 15.5z" fill="#fff" />
      <circle cx="13.5" cy="13" r="1.5" fill="#3b2fd1" /><circle cx="18.5" cy="13" r="1.5" fill="#3b2fd1" />
      <path d="M22 21.5l1.2 2.3 2.3 1.2-2.3 1.2L22 28.5l-1.2-2.3-2.3-1.2 2.3-1.2z" fill="#a5f3fc" />
    </svg>
  );
}

export function Logo({ dark = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className={`font-display text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}>Agent<span className="text-brand-500">Press</span></span>
    </span>
  );
}
