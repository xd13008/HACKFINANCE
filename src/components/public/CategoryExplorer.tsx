"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { connectsTo } from "@/lib/decision";

/**
 * Maquette, écran 2 : onglet « Test de la rédaction » d'une catégorie. Le visiteur pondère les critères notés pendant
 * les tests et filtre sur des faits validés ; le classement se recalcule. Les solutions non testées sont listées à part, sans note.
 */
export type ExplorerTool = {
  slug: string; name: string; tagline: string | null; score: number; criteria: Record<string, number>;
  targetSizes: string[]; multiEntity: boolean | null; freePlan: boolean | null; hosting: string | null; bankConnections: number | null;
  integrations: string[]; entry: number | null; testedAt: string;
};

const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const SIZES = [["tpe", "TPE (moins de 10 salariés)"], ["pme", "PME (10 à 249)"], ["eti", "ETI (250 et plus)"]] as const;

export function CategoryExplorer({ categorySlug, criteria, defaults, tools, referenced, providerCategories, sponsored }: {
  categorySlug: string;
  criteria: { key: string; label: string }[];
  defaults: Record<string, number>;
  tools: ExplorerTool[];
  referenced: { slug: string; name: string; tagline: string | null }[];
  providerCategories: { slug: string; name: string }[];
  sponsored?: React.ReactNode;
}) {
  const [w, setW] = useState<Record<string, number>>(defaults);
  const [sizes, setSizes] = useState<string[]>([]);
  const [must, setMust] = useState({ multi: false, free: false, eu: false });
  const [accounting, setAccounting] = useState("");
  const [budget, setBudget] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  const integrationNames = useMemo(() => [...new Set(tools.flatMap((t) => t.integrations))].filter((n) => !/api/i.test(n)).sort((a, b) => a.localeCompare(b, "fr")), [tools]);
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const mine = (t: ExplorerTool) => {
    const keys = criteria.map((c) => c.key).filter((k) => typeof t.criteria[k] === "number" && w[k] > 0);
    const sum = keys.reduce((a, k) => a + w[k], 0);
    return sum ? keys.reduce((a, k) => a + w[k] * t.criteria[k], 0) / sum : t.score;
  };
  const results = tools
    .filter((t) => !sizes.length || sizes.some((s) => t.targetSizes.includes(s)))
    .filter((t) => (!must.multi || t.multiEntity) && (!must.free || t.freePlan) && (!must.eu || /union européenne|\bue\b|france/i.test(t.hosting ?? "")))
    .filter((t) => !accounting || connectsTo(t.integrations, accounting))
    .filter((t) => !budget || (t.entry != null && t.entry <= budget))
    .map((t) => ({ t, s: mine(t) })).sort((a, b) => b.s - a.s);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const compareHref = `/comparer?${picked.map((p) => `l=${p}`).join("&")}`;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-7 items-start">
        <aside aria-label="Filtres et critères" className="flex-[1_1_300px] max-w-sm flex flex-col gap-5 rounded-3xl border border-line bg-page p-5">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-base font-bold">Vos critères de comparaison</h2>
            <p className="m-0 text-sm text-ink-3">Donnez plus ou moins de poids à chaque critère noté par la rédaction.</p>
            {criteria.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <label htmlFor={`w-${c.key}`} className="flex justify-between text-sm font-medium"><span>{c.label}</span><span className="font-bold">{Math.round(((w[c.key] ?? 0) / total) * 100)} %</span></label>
                <input id={`w-${c.key}`} type="range" min={0} max={10} step={1} value={w[c.key] ?? 0} onChange={(e) => setW({ ...w, [c.key]: Number(e.target.value) })} className="accent-ink" />
              </div>
            ))}
            <button type="button" onClick={() => setW(defaults)} className="self-start min-h-10 px-3.5 rounded-lg border border-line bg-white text-sm">Revenir à la pondération de la rédaction</button>
          </div>
          <hr className="border-line m-0" />
          <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
            <legend className="font-bold mb-2">Taille de votre entreprise</legend>
            {SIZES.map(([k, label]) => <label key={k} className="flex items-center gap-2.5 text-sm min-h-8"><input type="checkbox" checked={sizes.includes(k)} onChange={() => setSizes(toggle(sizes, k))} className="size-[18px] accent-ink" /> {label}</label>)}
          </fieldset>
          <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
            <legend className="font-bold mb-2">Indispensable pour moi</legend>
            <label className="flex items-center gap-2.5 text-sm min-h-8"><input type="checkbox" checked={must.multi} onChange={() => setMust({ ...must, multi: !must.multi })} className="size-[18px] accent-ink" /> Plusieurs sociétés (consolidation)</label>
            <label className="flex items-center gap-2.5 text-sm min-h-8"><input type="checkbox" checked={must.free} onChange={() => setMust({ ...must, free: !must.free })} className="size-[18px] accent-ink" /> Offre gratuite</label>
            <label className="flex items-center gap-2.5 text-sm min-h-8"><input type="checkbox" checked={must.eu} onChange={() => setMust({ ...must, eu: !must.eu })} className="size-[18px] accent-ink" /> Hébergement des données en UE</label>
          </fieldset>
          {integrationNames.length > 0 && (
            <label className="flex flex-col gap-1.5 font-bold">Connexion à mon logiciel
              <select value={accounting} onChange={(e) => setAccounting(e.target.value)} className="min-h-11 rounded-lg border border-line bg-white px-2.5 text-sm font-normal">
                <option value="">Peu importe</option>{integrationNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
          )}
          <label className="flex flex-col gap-1.5 font-bold">Budget mensuel maximum
            <select value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="min-h-11 rounded-lg border border-line bg-white px-2.5 text-sm font-normal">
              <option value={0}>Pas de limite</option><option value={50}>Jusqu&apos;à 50 € HT</option><option value={100}>Jusqu&apos;à 100 € HT</option><option value={250}>Jusqu&apos;à 250 € HT</option><option value={500}>Jusqu&apos;à 500 € HT</option>
            </select></label>
        </aside>

        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-[15px] text-ink-2"><strong>{results.length}</strong> solution{results.length > 1 ? "s" : ""} testée{results.length > 1 ? "s" : ""} correspond{results.length > 1 ? "ent" : ""} · classée{results.length > 1 ? "s" : ""} selon <strong>vos</strong> critères</p>
            <Link href={`/mise-en-relation?categorie=${categorySlug}`} className="text-sm font-semibold">Recevoir des propositions sans comparer →</Link>
          </div>
          {sponsored}
          {tools.length === 0 && <p className="m-0 rounded-2xl bg-surface-2 p-5">Aucune solution de cette catégorie n&apos;a encore terminé son test : pas de classement pour l&apos;instant.</p>}
          {tools.length > 0 && results.length === 0 && <p className="m-0 rounded-2xl bg-surface-2 p-5">Aucune solution testée ne remplit tous ces critères. Retirez un filtre pour élargir.</p>}
          {results.map(({ t, s }, i) => (
            <article key={t.slug} className="flex flex-wrap gap-4 rounded-3xl border border-line bg-white p-5">
              <div aria-hidden="true" className="size-14 shrink-0 rounded-2xl bg-lime-100 flex items-center justify-center font-display text-2xl font-bold">{i + 1}</div>
              <div className="flex-[999_1_300px] min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                  <h3 className="m-0 text-xl"><Link href={`/logiciels/${t.slug}`} className="no-underline">{t.name}</Link></h3>
                  <span className="text-[13px] text-green-800 bg-green-100 rounded-md px-2 py-0.5">Testé par la rédaction le {date(t.testedAt)}</span>
                </div>
                {t.tagline && <p className="m-0 text-sm text-ink-2 leading-relaxed">{t.tagline}</p>}
                <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
                  {[t.multiEntity && "Multi-sociétés", t.freePlan && "Offre gratuite", t.hosting && `Hébergement : ${t.hosting}`, t.bankConnections && `${t.bankConnections} banques`]
                    .filter(Boolean).map((tag) => <li key={tag as string} className="text-xs rounded-lg bg-surface-2 px-2.5 py-1">{tag}</li>)}
                </ul>
                <p className="m-0 text-[13px] text-ink-3">{t.entry == null ? "Prix sur devis" : t.entry === 0 ? "Offre gratuite disponible" : `Dès ${t.entry} € HT/mois`} · prix public relevé sur le site de l&apos;éditeur</p>
              </div>
              <div className="flex-[1_1_200px] flex flex-col gap-2.5">
                <div className="flex justify-between gap-4 rounded-xl bg-page px-3 py-2.5">
                  <div className="flex flex-col"><span className="text-xs text-ink-3">Votre score</span><span className="text-2xl font-bold">{fmt(s)}</span></div>
                  <div className="flex flex-col text-right"><span className="text-xs text-ink-3">Note rédaction</span><span className="text-lg font-bold">{fmt(t.score)}/10</span></div>
                </div>
                <label className="flex items-center gap-2 text-sm min-h-9"><input type="checkbox" checked={picked.includes(t.slug)} onChange={() => setPicked(toggle(picked, t.slug).slice(-4))} className="size-[18px] accent-ink" /> Ajouter au comparateur</label>
                <Link href={`/mise-en-relation?categorie=${categorySlug}&l=${t.slug}`} className="inline-flex items-center justify-center min-h-11 rounded-lg bg-ink text-white font-semibold text-sm no-underline">Demander une démo</Link>
              </div>
            </article>
          ))}
          {referenced.length > 0 && (
            <section aria-labelledby="references" className="flex flex-col gap-2 mt-2">
              <h2 id="references" className="m-0 text-base font-bold">Référencées, pas encore testées ({referenced.length})</h2>
              <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2">
                {referenced.map((r) => (
                  <li key={r.slug} className="rounded-2xl border border-line bg-page p-4">
                    <Link href={`/logiciels/${r.slug}`} className="font-bold">{r.name}</Link>
                    <span className="block text-[13px] text-ink-3">Référencé, non testé · sans note · faits en cours de vérification</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {providerCategories.length > 0 && (
            <section className="flex flex-wrap items-center gap-4 rounded-3xl bg-brand text-white p-5">
              <div className="flex-[999_1_360px] min-w-0">
                <h2 className="m-0 mb-1.5 text-xl">Plutôt un prestataire ?</h2>
                <p className="m-0 text-sm text-zinc-300">{providerCategories.map((c) => c.name).join(", ")} : annuaire factuel par ville, sans classement.</p>
              </div>
              <Link href={`/prestataires/${providerCategories[0].slug}`} className="inline-flex items-center min-h-11 px-4.5 rounded-lg bg-white text-ink font-semibold no-underline">Voir les prestataires</Link>
            </section>
          )}
        </div>
      </div>
      {tools.length > 0 && (
        <div className="sticky bottom-0 z-10 mt-6 -mx-4 bg-brand text-white">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[15px]"><strong>{picked.length}</strong> solution(s) dans le comparateur{picked.length ? ` : ${picked.map((p) => tools.find((t) => t.slug === p)?.name).join(", ")}` : " (cochez-en 2 à 4)"}</span>
            {picked.length >= 2
              ? <Link href={compareHref} className="inline-flex items-center min-h-11 px-5 rounded-lg bg-accent text-ink font-bold no-underline">Comparer côte à côte</Link>
              : <span className="inline-flex items-center min-h-11 px-5 rounded-lg bg-zinc-700 text-zinc-300 font-bold">Comparer côte à côte</span>}
          </div>
        </div>
      )}
    </div>
  );
}
