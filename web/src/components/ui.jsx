import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) { return <Loader2 className={`animate-spin text-brand-500 ${className}`} />; }

export function PageLoader() {
  return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-brand-500' : 'bg-ink-200'} disabled:opacity-50`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Badge({ tone = 'gray', children, className = '' }) {
  const tones = {
    gray: 'bg-ink-100 text-ink-600', green: 'bg-[#e8efe6] text-[#3d6a4a] ring-1 ring-[#cddbc9]', amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200', blue: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  };
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card fade-up w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} shadow-pop`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h3 className="text-base font-bold">{title}</h3>
          <button className="btn-ghost rounded-lg p-1" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface/60 px-6 py-14 text-center">
      {Icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-ink-200 bg-surface text-ink-700 shadow-card"><Icon className="h-6 w-6" /></div>}
      <h3 className="text-base font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-white"><Icon className="h-5 w-5" /></div>}
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', green: 'bg-ink-100 text-ink-700', amber: 'bg-ink-100 text-ink-700', blue: 'bg-ink-100 text-ink-700' };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-500">{label}</span>
        {Icon && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <div className="mt-2 font-display text-[32px] font-bold leading-none tracking-tighter">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-ink-200/70 bg-ink-100 p-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === t.value ? 'bg-surface text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800'}`}>
          {t.label}{t.count != null && <span className="ml-1.5 text-ink-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="fade-up pointer-events-auto flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-pop">
            {t.tone === 'error' ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex gap-2">
        <input className="input font-mono text-xs" readOnly value={value} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-outline" onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

export function Avatar({ name = '?', color = '#ee661b', size = 'h-9 w-9', className = '' }) {
  return <span className={`grid shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-white ${size} ${className}`} style={{ background: color }}>{name.trim().charAt(0).toUpperCase()}</span>;
}
