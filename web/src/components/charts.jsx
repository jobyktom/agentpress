import { useState } from 'react';

// Small dependency-free charts. Bars are single-hue; stacked series use a
// short, distinguishable palette with a legend.
export const SERIES = ['#ee661b', '#272522', '#a29c91', '#c99a3c', '#5f7f6a', '#8b6b55'];

export function fillDays(rows, days, key = 'day') {
  const map = Object.fromEntries(rows.map((r) => [r[key], r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    out.push(map[d] || { [key]: d });
  }
  return out;
}

export function BarChart({ data, series, height = 220 }) {
  const [hover, setHover] = useState(null);
  const totals = data.map((d) => series.reduce((s, x) => s + (Number(d[x.key]) || 0), 0));
  const max = Math.max(1, ...totals);
  const nice = Math.ceil(max / 4) * 4 || 4;
  const W = 640, H = height, pad = { l: 32, r: 8, t: 10, b: 24 };
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v) => H - pad.b - (v / nice) * (H - pad.t - pad.b);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(nice * f)} y2={y(nice * f)} stroke="#ebe6dd" />
            <text x={pad.l - 6} y={y(nice * f) + 4} textAnchor="end" fontSize="10" fill="#a29c91">{Math.round(nice * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill={hover === i ? '#f0ece5' : 'transparent'} />
              {series.map((s) => {
                const v = Number(d[s.key]) || 0;
                const r = <rect key={s.key} x={pad.l + i * bw + bw * 0.18} width={bw * 0.64} y={y(acc + v)} height={Math.max(0, y(acc) - y(acc + v))} rx="3" fill={s.color} />;
                acc += v;
                return r;
              })}
              {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && <text x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#a29c91">{d.day?.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-pop" style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="font-semibold">{data[hover].day}</div>
          {series.map((s) => <div key={s.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}: {Number(data[hover][s.key]) || 0}</div>)}
        </div>
      )}
      {series.length > 1 && <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">{series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}</div>}
    </div>
  );
}

export function HBar({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-ink-700">{i.label}</span><span className="tabular-nums text-ink-500">{i.value}</span></div>
          <div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: i.color || '#ee661b' }} /></div>
        </div>
      ))}
    </div>
  );
}
