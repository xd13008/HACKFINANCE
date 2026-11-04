"use client";

import { useState } from "react";

/**
 * Graphiques du back-office — palette de référence dataviz (variables --viz-*),
 * marques fines, grille discrète, info-bulle au survol, tableau de données disponible.
 */
type Point = { label: string; value: number };
type Series = { name: string; color: string; points: Point[] };

const fmt = new Intl.NumberFormat("fr-FR");

export function LineChart({ series, height = 220, title }: { series: Series[]; height?: number; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, P = { l: 44, r: 12, t: 12, b: 26 };
  const n = series[0]?.points.length ?? 0;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const niceMax = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  const x = (i: number) => P.l + (n <= 1 ? 0 : (i * (W - P.l - P.r)) / (n - 1));
  const y = (v: number) => H - P.b - (v / niceMax) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * niceMax);

  return (
    <figure className="relative" style={{ background: "var(--viz-surface)" }}>
      <figcaption className="sr-only">{title}</figcaption>
      {series.length > 1 && (
        <div className="flex gap-4 text-xs mb-1" style={{ color: "var(--viz-text-2)" }}>
          {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: s.color }} />{s.name}</span>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--viz-text-2)">{fmt.format(t)}</text>
          </g>
        ))}
        {series[0]?.points.map((p, i) => (i % Math.ceil(n / 6) === 0 || i === n - 1) && (
          <text key={p.label} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--viz-text-2)">{p.label}</text>
        ))}
        {series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} />
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--viz-text-2)" strokeWidth={1} strokeDasharray="3 3" />
            {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.points[hover].value)} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hover != null && series[0] && (
        <div className="absolute top-6 pointer-events-none rounded-md border border-line bg-surface px-2 py-1 text-xs shadow"
             style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})`, color: "var(--viz-text)" }}>
          <p className="font-medium">{series[0].points[hover].label}</p>
          {series.map((s) => <p key={s.name}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: s.color }} />{s.name} : <strong>{fmt.format(s.points[hover].value)}</strong></p>)}
        </div>
      )}
      <details className="text-xs mt-1" style={{ color: "var(--viz-text-2)" }}>
        <summary className="cursor-pointer">Voir les données</summary>
        <table className="mt-1"><thead><tr><th className="pr-3 text-left">Jour</th>{series.map((s) => <th key={s.name} className="pr-3 text-right">{s.name}</th>)}</tr></thead>
          <tbody>{series[0]?.points.map((p, i) => <tr key={p.label}><td className="pr-3">{p.label}</td>{series.map((s) => <td key={s.name} className="pr-3 text-right tabular-nums">{fmt.format(s.points[i].value)}</td>)}</tr>)}</tbody></table>
      </details>
    </figure>
  );
}

/** Barres horizontales : une seule série, valeurs étiquetées directement. */
export function BarList({ rows, unit = "", color = "var(--viz-series-1)" }: { rows: { label: string; value: number; hint?: string }[]; unit?: string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(7rem,14rem)_1fr_auto] items-center gap-3 text-sm" title={`${r.label} : ${fmt.format(r.value)}${unit}`}>
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="h-3 rounded-r" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color, borderRadius: "0 4px 4px 0" }} />
          <span className="tabular-nums text-right" style={{ color: "var(--viz-text)" }}>{fmt.format(r.value)}{unit}{r.hint && <span className="text-ink-3 ml-1">{r.hint}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
