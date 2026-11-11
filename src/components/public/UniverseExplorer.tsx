"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cheapestPlan, eur, type PlanCost } from "@/lib/decision";
import type { ProviderCard, ToolCard } from "@/lib/universe";

type Must = "multi" | "free" | "eu";
const MUSTS: [Must, string][] = [["multi", "Plusieurs sociétés (consolidation)"], ["free", "Offre gratuite"], ["eu", "Données hébergées en UE"]];

const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const costLabel = (c: PlanCost) => (c.kind === "price" ? (c.annual === 0 ? "Gratuit" : `${eur(c.annual)} HT/an`) : c.kind === "quote" ? "Sur devis" : "Non adapté");

/**
 * Étape « Comparer » d'un univers : onglets Logiciels / Prestataires, coût annuel estimé pour le profil
 * (prix publics validés), écart avec la solution actuelle. Classement non sponsorisé.
 */
export function UniverseExplorer({ tools, providers }: { tools: ToolCard[]; providers: ProviderCard[] }) {
  const [view, setView] = useState<"tools" | "firms">(tools.length ? "tools" : "firms");
  const [entities, setEntities] = useState(1);
  const [current, setCurrent] = useState("excel");
  const [must, setMust] = useState<Record<Must, boolean>>({ multi: false, free: false, eu: false });
  const [sort, setSort] = useState<"cost" | "score">("cost");

  const result = useMemo(() => {
    const excluded: string[] = [];
    const rows = tools
      .filter((t) => (t.slug === current ? false : true))
      .filter((t) => (!must.multi || t.multiEntity) && (!must.free || t.freePlan) && (!must.eu || /union européenne|ue\b|france/i.test(t.hosting ?? "")))
      .map((t) => ({ t, cost: cheapestPlan(t.plans, entities, t.multiEntity) }))
      .filter(({ t, cost }) => (cost.kind === "none" ? (excluded.push(`${t.name} : non adapté à ${entities} sociétés.`), false) : true));
    const annual = (c: PlanCost) => (c.kind === "price" ? c.annual : Number.POSITIVE_INFINITY);
    rows.sort(sort === "score" ? (a, b) => b.t.score - a.t.score : (a, b) => annual(a.cost) - annual(b.cost) || b.t.score - a.t.score);
    const priced = rows.filter((r) => r.cost.kind === "price");
    const minCost = Math.min(...priced.map((r) => annual(r.cost)));
    const maxScore = Math.max(...rows.map((r) => r.t.score));
    const bestValue = [...priced].sort((a, b) => b.t.score / Math.log(annual(b.cost) + 10) - a.t.score / Math.log(annual(a.cost) + 10))[0];
    const curTool = tools.find((t) => t.slug === current);
    const curCost = curTool ? cheapestPlan(curTool.plans, entities, curTool.multiEntity) : null;
    return { rows, excluded, minCost, maxScore, bestValue, curTool, curCost };
  }, [tools, entities, current, must, sort]);

  const delta = (c: PlanCost) => {
    if (c.kind !== "price") return null;
    if (!result.curTool && c.annual === 0) return current === "excel" ? "Remplace votre tableur, sans coût" : "Première solution, sans coût";
    if (!result.curTool) return current === "excel" ? `Remplace votre tableur : ${eur(c.annual / 12)} HT par mois` : `Première solution : ${eur(c.annual / 12)} HT par mois`;
    if (result.curCost?.kind !== "price") return null;
    const d = c.annual - result.curCost.annual;
    return d < 0 ? `Économie de ${eur(-d)} HT/an vs ${result.curTool.name}` : d === 0 ? `Même coût que ${result.curTool.name}` : `+${eur(d)} HT/an vs ${result.curTool.name}`;
  };

  const tab = (on: boolean) => `flex items-center justify-between gap-4 min-h-20 px-5 py-4 rounded-2xl border border-line shadow-sm text-left ${on ? "bg-ink text-white" : "bg-white text-ink"}`;

  return (
    <div>
      <div role="tablist" aria-label="Logiciels ou prestataires" className="grid gap-3 sm:grid-cols-2 mb-6">
        <button type="button" role="tab" aria-selected={view === "tools"} onClick={() => setView("tools")} className={tab(view === "tools")}>
          <span><span className="block font-display font-extrabold text-2xl">Logiciels</span><span className="text-sm opacity-80">Testés par la rédaction · coût estimé pour vous</span></span>
          <span className="font-display font-extrabold text-3xl">{tools.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "firms"} onClick={() => setView("firms")} className={tab(view === "firms")}>
          <span><span className="block font-display font-extrabold text-2xl">Prestataires</span><span className="text-sm opacity-80">Annuaire factuel, sans classement</span></span>
          <span className="font-display font-extrabold text-3xl">{providers.length}</span>
        </button>
      </div>

      {view === "tools" && (
        tools.length === 0 ? <p className="rounded-xl bg-surface-2 p-5">Tests en cours dans cet univers : les premiers résultats seront publiés après validation par la rédaction.</p> : (
        <div className="flex flex-wrap gap-6 items-start">
          <aside aria-label="Votre profil" className="flex-1 basis-64 max-w-xs flex flex-col gap-5 p-5 rounded-2xl border border-line bg-white">
            <label className="flex flex-col gap-2 text-sm font-semibold">Nombre de sociétés : <span className="text-xl">{entities}</span>
              <input type="range" min={1} max={8} value={entities} onChange={(e) => setEntities(Number(e.target.value))} className="accent-ink" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">Votre solution actuelle
              <select value={current} onChange={(e) => setCurrent(e.target.value)} className="min-h-11 rounded-lg border border-line px-2 bg-white font-normal">
                <option value="excel">Excel / tableur</option>
                <option value="none">Aucune solution</option>
                {tools.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold mb-1">Indispensable</legend>
              {MUSTS.map(([k, label]) => (
                <label key={k} className="flex gap-2 items-center text-sm min-h-8">
                  <input type="checkbox" checked={must[k]} onChange={() => setMust({ ...must, [k]: !must[k] })} className="size-4 accent-ink" /> {label}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-2 text-sm font-semibold">Trier par
              <select value={sort} onChange={(e) => setSort(e.target.value as "cost" | "score")} className="min-h-11 rounded-lg border border-line px-2 bg-white font-normal">
                <option value="cost">Coût pour vous</option><option value="score">Note de la rédaction</option>
              </select>
            </label>
          </aside>

          <div className="flex-[999_1_32rem] min-w-0 flex flex-col gap-3">
            <p className="text-sm text-ink-2" aria-live="polite">{result.rows.length} solution(s) pour {entities} société(s){result.curTool ? `, à la place de ${result.curTool.name}` : ""}</p>
            {result.rows.map(({ t, cost }) => {
              const badges = [
                result.bestValue?.t.slug === t.slug && "Meilleur rapport qualité-prix",
                cost.kind === "price" && cost.annual === result.minCost && "Le moins cher",
                t.score === result.maxScore && "Le mieux noté",
              ].filter(Boolean) as string[];
              const d = delta(cost);
              return (
                <article key={t.slug} className={`flex flex-wrap gap-5 items-center p-5 rounded-2xl bg-white border ${result.bestValue?.t.slug === t.slug ? "border-ink shadow-md" : "border-line shadow-sm"}`}>
                  <div className="flex-[999_1_18rem] min-w-0 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold"><Link href={`/logiciels/${t.slug}`}>{t.name}</Link></h3>
                      {badges.map((b) => <span key={b} className={`text-xs font-bold rounded-lg px-2.5 py-1 ${b === "Meilleur rapport qualité-prix" ? "bg-accent text-ink" : "bg-surface-2"}`}>{b}</span>)}
                    </div>
                    {t.tagline && <p className="text-sm text-ink-2">{t.tagline}</p>}
                    <ul className="text-sm text-ink-2 flex flex-wrap gap-x-4 gap-y-1">
                      <li>{t.categoryName}</li>
                      {t.multiEntity != null && <li>{t.multiEntity ? "Multi-sociétés" : "Une seule société"}</li>}
                      {t.bankConnections != null && <li>{t.bankConnections} banques connectées</li>}
                      {t.freePlan && <li>Offre gratuite</li>}
                    </ul>
                    <p className="text-sm">Note de la rédaction : <strong>{fmt(t.score)}/10</strong></p>
                  </div>
                  <div className="flex-1 basis-52 flex flex-col gap-2">
                    <span className="text-xs text-ink-3">Coût estimé pour vous{cost.kind === "price" ? ` · offre ${cost.plan}` : ""}</span>
                    <span className="font-display font-extrabold text-3xl leading-none">{costLabel(cost)}</span>
                    {d && <span className={`self-start text-sm font-bold rounded-md px-2 py-1 ${(d.startsWith("Économie") || d.includes("sans coût")) ? "bg-lime-100 text-lime-900" : "bg-surface-2"}`}>{d}</span>}
                    <Link href={`/logiciels/${t.slug}`} className="inline-flex items-center justify-center min-h-11 rounded-lg bg-ink text-white font-semibold text-sm">Voir le test détaillé</Link>
                    <Link href={`/meilleurs-logiciels/${t.categorySlug}`} className="inline-flex items-center justify-center min-h-11 rounded-lg border border-line shadow-sm font-semibold text-sm">Comparer la catégorie</Link>
                  </div>
                </article>
              );
            })}
            {result.rows.length === 0 && <p className="rounded-xl bg-surface-2 p-5">Aucune solution ne coche tous vos critères. Retirez un critère « indispensable ».</p>}
            {result.excluded.map((x) => <p key={x} className="text-sm text-ink-3">{x}</p>)}
            <p className="text-xs text-ink-3">Coût annuel HT calculé à partir des prix publics validés et de votre nombre de sociétés, hors frais de mise en place. Classement non sponsorisé.</p>
          </div>
        </div>
      ))}

      {view === "firms" && (
        providers.length === 0 ? <p className="rounded-xl bg-surface-2 p-5">Aucun prestataire référencé pour l’instant. <Link href="/referencer-mon-cabinet" className="underline">Référencer mon cabinet</Link></p> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface-2 text-left"><tr><th scope="col" className="p-3">Prestataire</th><th scope="col" className="p-3">Métier</th><th scope="col" className="p-3">Ville</th><th scope="col" className="p-3">Statut</th></tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={`${p.metierSlug}/${p.slug}`} className="border-t border-line">
                  <th scope="row" className="p-3 text-left"><Link href={`/prestataires/${p.metierSlug}/${p.slug}`} className="underline">{p.name}</Link></th>
                  <td className="p-3">{p.metierName}</td>
                  <td className="p-3">{p.city ?? "—"}</td>
                  <td className="p-3">{p.regulated ? "Profession réglementée · fiche factuelle" : p.verified ? "Fiche vérifiée" : "Référencé"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
