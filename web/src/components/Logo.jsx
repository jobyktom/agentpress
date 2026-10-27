export function LogoMark({ className = 'h-8 w-8', dark = false }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={dark ? '#fbfaf7' : '#181715'} />
      <path d="M8.5 11.5a4 4 0 0 1 4-4h7a4 4 0 0 1 4 4v4.5a4 4 0 0 1-4 4h-4.2l-4.1 3.4a.6.6 0 0 1-1-.46V19.6a4 4 0 0 1-1.7-3.27z" fill={dark ? '#181715' : '#fbfaf7'} />
      <circle cx="22.5" cy="9.5" r="3.5" fill="#ee661b" stroke={dark ? '#100f0e' : '#f2efe9'} strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ dark = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark dark={dark} />
      <span className={`font-display text-[17px] font-bold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}>AgentPress</span>
    </span>
  );
}
