import Link from "next/link";
import type { Metadata } from "next";
import { getFacts, getPrimaryCategory, getPublicReviews, getRanking, getSoftware, getSite, type Criterion, type Fact } from "@/lib/data";
import { entryMonthlyPrice } from "@/lib/decision";
import { getPricing } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { formatDate } from "@/lib/format";
import { staticMetadata } from "@/lib/seo";
import { PLATFORM, Stars } from "@/components/public/PublicReviews";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { requireSite, type SiteParams } from "../_lib";

type SP = Promise<{ l?: string | string[] }>;
const slugsOf = (l: string | string[] | undefined) => [...new Set((Array.isArray(l) ? l : l ? [l] : []).flatMap((x) => x.split(",")).filter((x) => /^[a-z0-9-]{1,120}$/.test(x)))].slice(0, 4);
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Comparaison à la demande (combinaisons infinies) : jamais indexée ; les matchs rédigés vivent sous /comparer/a-vs-b. */
export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await getSite((await params).site);
  if (!site) return { robots: { index: false } };
  return staticMetadata(site, "/comparer", "Comparateur de logiciels finance", "Notes des tests, faits sourcés et prix côte à côte.", { noindex: true });
}

/** Maquette, écran 3 : comparateur côte à côte (2 à 4 logiciels), sur les seules données validées. */
export default async function Comparer({ params, searchParams }: { params: SiteParams; searchParams: SP }) {
  const site = await requireSite((await params).site);
  const slugs = slugsOf((await searchParams).l);
  const tools = (await Promise.all(slugs.map((s) => getSoftware(s)))).filter((s) => !!s);
  const category = tools[0] ? await getPrimaryCategory(tools[0].id) : null;
  const ranking = category ? await getRanking(category.id) : [];
  const ids = tools.map((t) => t.id);
  const [facts, pricing, reviews, { data: integ }] = await Promise.all([
    getFacts(ids), getPricing(ids), Promise.all(tools.map((t) => getPublicReviews({ softwareId: t.id }))),
    ids.length ? publicClient().from("integrations").select("software_id,name").in("software_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const criteria = (category?.criteria ?? []) as Criterion[];
  const totalW = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const rank = (id: string) => ranking.find((r) => r.software.id === id);
  const fact = (id: string, k: string): Fact | undefined => facts.get(id)?.get(k);
  const show = (f: Fact | undefined) => {
    const v = f?.value;
    if (v == null) return null;
    if (v === true) return "Oui";
    if (v === false) return "Non";
    if (Array.isArray(v)) return v.map((x) => ({ tpe: "TPE", pme: "PME", eti: "ETI" } as Record<string, string>)[String(x)] ?? String(x)).join(", ");
    return String(v);
  };
  const crumbs = [{ name: "Accueil", path: "/" }, ...(category ? [{ name: category.name, path: `/meilleurs-logiciels/${category.slug}` }] : []), { name: "Comparateur", path: "/comparer" }];
  const FACT_ROWS: [string, string][] = [["target_sizes", "Tailles d'entreprise"], ["multi_entity", "Plusieurs sociétés"], ["free_plan", "Offre gratuite"], ["hosting", "Hébergement des données"], ["bank_connections", "Banques connectées"]];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Tracker site={site.key} pageType="comparator" rubrique={category?.slug} />
      <Breadcrumbs items={crumbs} />
      {tools.length < 2 ? (
        <>
          <h1 className="font-display font-extrabold text-4xl">Comparateur</h1>
          <p className="text-ink-2">Choisissez de 2 à 4 logiciels testés depuis une catégorie (case « Ajouter au comparateur ») pour les comparer côte à côte.</p>
          <p><Link href="/trouver" className="underline">Trouver une solution</Link> · <Link href="/challenger" className="underline">Challenger ma solution actuelle</Link></p>
        </>
      ) : (
        <>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight leading-tight">{tools.map((t) => t.name).join(", ").replace(/, ([^,]*)$/, " ou $1")} ?</h1>
          <p className="mt-3 max-w-3xl text-ink-2">Comparaison sans texte rédigé : notes des tests de la rédaction, faits sourcés et datés vérifiés par un éditeur, prix publics HT. Chaque fait renvoie à sa source (survol de la cellule).</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead><tr className="bg-brand text-white">
                <th scope="col" className="p-3 text-left w-56">Critère{criteria.length ? " (poids de la rédaction)" : ""}</th>
                {tools.map((t) => { const r = rank(t.id); return (
                  <th key={t.id} scope="col" className="p-3 text-left align-bottom"><Link href={`/logiciels/${t.slug}`} className="text-white text-base">{t.name}</Link>
                    <span className="block text-xs font-normal text-zinc-400">{r ? `Testé le ${formatDate(r.testedAt)}` : "Pas encore testé"}</span></th>); })}
              </tr></thead>
              <tbody>
                <tr className="border-t border-line bg-surface-2"><th scope="row" className="p-3 text-left">Note de la rédaction</th>
                  {tools.map((t) => { const r = rank(t.id); return <td key={t.id} className="p-3 text-xl font-extrabold">{r ? `${fmt(r.overall)}/10` : "—"}</td>; })}</tr>
                {criteria.map((c) => (
                  <tr key={c.key} className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">{c.label} <span className="text-ink-3">({Math.round((c.weight / totalW) * 100)} %)</span></th>
                    {tools.map((t) => { const v = rank(t.id)?.criteria[c.key]; return <td key={t.id} className="p-3">{typeof v === "number" ? fmt(v) : "—"}</td>; })}</tr>
                ))}
                <tr className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">Prix d&apos;entrée</th>
                  {tools.map((t) => { const e = entryMonthlyPrice((pricing.get(t.id) ?? []).map((p) => ({ plan_name: p.plan_name, price_eur: p.price_eur, billing_period: p.billing_period, per_unit: p.per_unit })));
                    return <td key={t.id} className="p-3 font-semibold">{e == null ? (pricing.get(t.id)?.length ? "Sur devis" : "—") : e === 0 ? "Gratuit" : `${e} € HT/mois`}</td>; })}</tr>
                {FACT_ROWS.map(([k, label]) => (
                  <tr key={k} className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">{label}</th>
                    {tools.map((t) => { const f = fact(t.id, k); const v = show(f); return <td key={t.id} className="p-3" title={f ? `Source : ${f.source_url} (relevé le ${formatDate(f.collected_at)})` : undefined}>{v ?? <span className="text-ink-3">Non vérifié</span>}</td>; })}</tr>
                ))}
                <tr className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">Intégrations</th>
                  {tools.map((t) => { const n = (integ ?? []).filter((i) => i.software_id === t.id).map((i) => i.name); return <td key={t.id} className="p-3">{n.length ? n.slice(0, 6).join(", ") + (n.length > 6 ? ` (+${n.length - 6})` : "") : <span className="text-ink-3">Non vérifié</span>}</td>; })}</tr>
                <tr className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">Avis publics cités<span className="block text-xs font-normal text-ink-3">non vérifiés par la rédaction, hors note</span></th>
                  {reviews.map((r, i) => <td key={tools[i].id} className="p-3">{r.sources.length ? r.sources.filter((s) => s.rating != null).map((s) => (
                    <span key={s.id} className="block"><Stars value={Number(s.rating)} scale={s.rating_scale} /> {String(s.rating).replace(".", ",")}/{s.rating_scale} · {PLATFORM[s.platform] ?? s.platform}{s.review_count ? ` (${s.review_count} avis)` : ""}, {formatDate(s.captured_at)}</span>)) : <span className="text-ink-3">—</span>}</td>)}</tr>
                <tr className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">Passer à l&apos;action</th>
                  {tools.map((t) => <td key={t.id} className="p-3"><div className="flex flex-col gap-2">
                    <Link href={`/mise-en-relation?l=${t.slug}${category ? `&categorie=${category.slug}` : ""}`} className="inline-flex items-center justify-center min-h-10 rounded-lg bg-ink text-white font-semibold no-underline">Demander une démo</Link>
                    <Link href={`/logiciels/${t.slug}`} className="text-center underline">Voir le test</Link></div></td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-3">Notes sur 10 issues des tests (même protocole pour toutes les solutions de la catégorie). Prix publics hors taxes relevés sur le site de l&apos;éditeur. Les avis publics cités n&apos;entrent jamais dans la note de la rédaction. Aucun résultat sponsorisé.</p>
          {tools.length === 2 && <p className="mt-2 text-sm"><Link href={`/comparer/${[tools[0].slug, tools[1].slug].sort().join("-vs-")}`} className="underline">Voir le match {tools[0].name} vs {tools[1].name}</Link></p>}
        </>
      )}
    </div>
  );
}
