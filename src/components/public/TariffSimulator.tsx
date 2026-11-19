"use client";

import Link from "next/link";
import { useState } from "react";
import { eur, profileAnnualCost, type PlanLike } from "@/lib/decision";

/** Maquette, écran 14 : coût annuel pour le profil du visiteur, sur les prix publics validés. */
type Plan = PlanLike & { conditions?: string | null };

export function TariffSimulator({ tools }: { tools: { slug: string; name: string; plans: Plan[]; setup: number | null }[] }) {
  const [entities, setEntities] = useState(1);
  const [users, setUsers] = useState(2);
  const [setup, setSetup] = useState(true);
  const excluded: string[] = [];
  const rows = tools.map((t) => {
    const best = t.plans.map((p) => ({ p, c: profileAnnualCost(p, entities, users) })).filter((x): x is { p: Plan; c: number } => x.c != null).sort((a, b) => a.c - b.c)[0];
    if (!best) { excluded.push(`${t.name} : pas de prix public pour ce profil (sur devis ou offre non adaptée).`); return null; }
    return { ...t, plan: best.p.plan_name, conditions: best.p.conditions ?? null, cost: best.c + (setup && t.setup ? t.setup : 0) };
  }).filter((r) => r != null).sort((a, b) => a.cost - b.cost);
  const max = Math.max(1, ...rows.map((r) => r.cost));
  return (
    <section className="flex flex-wrap gap-6 items-start" aria-labelledby="cout">
      <div className="flex-[1_1_280px] max-w-xs flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="m-0 text-xl font-extrabold">Votre profil</h2>
        <label className="flex flex-col gap-1 text-sm font-bold">Sociétés : <span className="text-xl">{entities}</span>
          <input type="range" min={1} max={8} value={entities} onChange={(e) => setEntities(Number(e.target.value))} className="accent-ink" /></label>
        <label className="flex flex-col gap-1 text-sm font-bold">Utilisateurs : <span className="text-xl">{users}</span>
          <input type="range" min={1} max={10} value={users} onChange={(e) => setUsers(Number(e.target.value))} className="accent-ink" /></label>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" checked={setup} onChange={() => setSetup(!setup)} className="size-[18px] accent-ink" /> Inclure la mise en place (1ʳᵉ année), quand elle est publiée</label>
      </div>
      <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-2.5">
        <h2 id="cout" className="m-0 mb-1 text-2xl font-extrabold">Coût annuel pour vous, du moins cher au plus cher</h2>
        {rows.length === 0 && <p className="m-0 text-ink-2">Aucun prix public ne couvre ce profil.</p>}
        {rows.map((r, i) => (
          <Link key={r.slug} href={`/logiciels/${r.slug}`} className="grid grid-cols-[28px_minmax(110px,170px)_minmax(0,1fr)_120px] gap-3 items-center rounded-2xl border border-line bg-white px-4 py-3 no-underline">
            <span className="font-display font-extrabold text-xl">{i + 1}</span>
            <span className="flex flex-col"><strong>{r.name}</strong><span className="text-xs text-ink-3">Offre {r.plan}{r.conditions ? ` (${r.conditions})` : ""}{setup && r.setup ? ` + mise en place ${eur(r.setup)}` : ""}</span></span>
            <span className="h-4 rounded-md bg-surface-2"><span className="block h-full rounded-md bg-ink" style={{ width: `${Math.max(4, Math.round((r.cost / max) * 100))}%` }} /></span>
            <strong className="text-right">{eur(r.cost)} HT</strong>
          </Link>
        ))}
        {excluded.map((x) => <p key={x} className="m-0 text-[13px] text-ink-3">{x}</p>)}
      </div>
    </section>
  );
}
