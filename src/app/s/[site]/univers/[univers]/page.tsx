import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/public/JsonLd";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { UniverseExplorer } from "@/components/public/UniverseExplorer";
import { eur } from "@/lib/decision";
import { absoluteUrl, ldBreadcrumb, ldItemList, staticMetadata } from "@/lib/seo";
import { listVerticals, loadUniverse, type UniverseData } from "@/lib/universe";
import { requireSite, staticParams } from "../../_lib";
import { publicClient } from "@/lib/supabase/public";
import { formatDate } from "@/lib/format";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère les univers du portail. */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  const { data: site } = await publicClient().from("sites").select("id").eq("key", params.site).maybeSingle();
  return staticParams("univers", site ? (await listVerticals(site.id)).map((v) => v.slug) : []);
}
type P = Promise<{ site: string; univers: string }>;

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Titre tourné vers la recherche (mot-clé tête de l'univers), distinct de celui des catégories. */
const title = (u: UniverseData) => `${u.vertical.name} : logiciels et prestataires comparés`;

/** Phrase de chiffres clés, datée, calculée sur nos propres données (unique et citable). */
function keyFact(u: UniverseData) {
  const k = u.kpis;
  const parts = [`${k.tested} logiciel${k.tested > 1 ? "s" : ""} testé${k.tested > 1 ? "s" : ""} par la rédaction`, `${k.providers} prestataire${k.providers > 1 ? "s" : ""} référencé${k.providers > 1 ? "s" : ""}`];
  let s = `${parts.join(" et ")}.`;
  if (k.medianEntry != null && k.minEntry != null && k.maxEntry != null) s += ` Prix d'entrée médian : ${eur(k.medianEntry)} HT par mois (de ${eur(k.minEntry)} à ${eur(k.maxEntry)}).`;
  if (k.best) s += ` Meilleure note : ${k.best.name} (${fmt(k.best.score)}/10).`;
  return s;
}

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const u = await loadUniverse(site.id, p.univers);
  if (!u) return { robots: { index: false } };
  // Pas de page pauvre dans l'index : un univers sans test publié reste en noindex
  return staticMetadata(site, `/univers/${u.vertical.slug}`, title(u), keyFact(u).slice(0, 158), { noindex: u.tools.length === 0 });
}

export default async function UniversePage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const u = await loadUniverse(site.id, p.univers);
  if (!u) notFound();
  const path = `/univers/${u.vertical.slug}`;
  const crumbs = [{ name: "Accueil", path: "/" }, { name: u.vertical.name, path }];
  const lastTest = u.tools.map((t) => t.testedAt).sort().at(-1);
  const guides = u.related.filter((r) => r.type === "pillar" || r.type === "guide");
  const duels = u.related.filter((r) => r.type === "duel");
  const alternatives = u.related.filter((r) => r.type === "alternatives");
  const profiles = [["tpe", "TPE"], ["pme", "PME"], ["eti", "ETI et groupes"]]
    .map(([k, label]) => ({ label, tool: u.tools.find((t) => t.targetSizes.includes(k)) }))
    .filter((x) => x.tool);
  const matrixTools = u.tools.slice(0, 6);
  const yes = (v: boolean | null) => (v == null ? "—" : v ? "✓" : "—");

  return (
    <div>
      <JsonLd data={[
        ldBreadcrumb(site, crumbs),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: title(u), description: keyFact(u), url: absoluteUrl(site, path), inLanguage: "fr-FR",
          isPartOf: { "@id": `${absoluteUrl(site, "/")}#website` } },
        u.tools.length ? ldItemList(site, u.tools.map((t) => ({ name: t.name, path: `/logiciels/${t.slug}` }))) : null,
      ]} />
      <Tracker site={site.key} pageType="universe" rubrique={u.vertical.slug} />

      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4"><Breadcrumbs items={crumbs} /></div>
        <div className="max-w-6xl mx-auto px-4 pb-8 pt-6 flex flex-col gap-5">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">Univers · le tableau de bord du DAF</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-none tracking-tight">{title(u)}</h1>
          <p className="text-lg text-white/80 max-w-3xl">{keyFact(u)}{lastTest ? ` Dernier test : ${formatDate(lastTest)}.` : ""}</p>
          <nav aria-label="Étapes de décision" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[["comprendre", "A", "Comprendre", "De quoi ai-je besoin ?"], ["comparer", "B", "Comparer", "Qui est le meilleur, à quel prix ?"],
              ["choisir", "C", "Choisir", "Laquelle pour mon entreprise ?"], ["changer", "D", "Changer", "Comment quitter mon outil ?"]].map(([id, l, n, q]) => (
              <a key={id} href={`#${id}`} className="flex flex-col gap-1 p-4 rounded-2xl bg-white/10 border-t-4 border-accent">
                <span className="text-xs font-bold text-accent">Étape {l}</span><span className="font-extrabold">{n}</span><span className="text-sm text-white/70">{q}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="comprendre" className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-wider text-ink-3">Étape A · Comprendre</p>
        <h2 className="font-display font-extrabold text-3xl mt-1 mb-4">De quoi ai-je vraiment besoin ?</h2>
        {u.vertical.description && <p className="text-ink-2 max-w-3xl mb-4">{u.vertical.description}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {u.categories.map((c) => (
            <Link key={c.id} href={c.kind === "software" ? `/meilleurs-logiciels/${c.slug}` : `/prestataires/${c.slug}`} className="p-5 rounded-2xl bg-white border border-line hover:border-ink">
              <span className="text-xs font-bold uppercase text-ink-3">{c.kind === "software" ? "Logiciels" : "Prestataires"}</span>
              <span className="block font-extrabold text-lg mt-1">{c.name}</span>
              {c.description && <span className="block text-sm text-ink-2 mt-1">{c.description}</span>}
            </Link>
          ))}
          {guides.map((g) => (
            <Link key={g.path} href={g.path} className="p-5 rounded-2xl bg-surface-2 hover:bg-white border border-transparent hover:border-ink">
              <span className="text-xs font-bold uppercase text-ink-3">{g.type === "pillar" ? "Dossier" : "Guide"}</span>
              <span className="block font-extrabold text-lg mt-1">{g.h1}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="comparer" className="bg-white border-y border-line">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-3">Étape B · Comparer</p>
          <h2 className="font-display font-extrabold text-3xl mt-1 mb-5">Combien vous coûterait chaque solution ?</h2>
          <UniverseExplorer tools={u.tools} providers={u.providers} />

          {matrixTools.length > 1 && (
            <div className="mt-10">
              <h3 className="font-extrabold text-lg mb-2">Qui fait quoi</h3>
              <div className="overflow-x-auto rounded-2xl border border-line shadow-sm">
                <table className="w-full min-w-[40rem] text-sm text-center">
                  <thead className="bg-surface-2"><tr><th scope="col" className="p-3 text-left">Fonction</th>{matrixTools.map((t) => <th key={t.slug} scope="col" className="p-3">{t.name}</th>)}</tr></thead>
                  <tbody>
                    <tr className="border-t border-line"><th scope="row" className="p-3 text-left">Plusieurs sociétés</th>{matrixTools.map((t) => <td key={t.slug} className="p-3 font-bold">{yes(t.multiEntity)}</td>)}</tr>
                    <tr className="border-t border-line"><th scope="row" className="p-3 text-left">Offre gratuite</th>{matrixTools.map((t) => <td key={t.slug} className="p-3 font-bold">{yes(t.freePlan)}</td>)}</tr>
                    <tr className="border-t border-line"><th scope="row" className="p-3 text-left">Hébergement des données</th>{matrixTools.map((t) => <td key={t.slug} className="p-3">{t.hosting ?? "—"}</td>)}</tr>
                    <tr className="border-t border-line"><th scope="row" className="p-3 text-left">Banques connectées</th>{matrixTools.map((t) => <td key={t.slug} className="p-3">{t.bankConnections ?? "—"}</td>)}</tr>
                    <tr className="border-t border-line"><th scope="row" className="p-3 text-left">Intégrations</th>{matrixTools.map((t) => <td key={t.slug} className="p-3 text-xs">{t.integrations.join(", ") || "—"}</td>)}</tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-3 mt-2">Faits validés par la rédaction, sources datées sur chaque fiche.</p>
            </div>
          )}
        </div>
      </section>

      {(profiles.length > 0 || duels.length > 0) && (
        <section id="choisir" className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-3">Étape C · Choisir pour mon profil</p>
          <h2 className="font-display font-extrabold text-3xl mt-1 mb-4">Laquelle pour mon entreprise ?</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {profiles.map(({ label, tool }) => (
              <Link key={label} href={`/logiciels/${tool!.slug}`} className="p-5 rounded-2xl bg-white border border-line hover:border-ink">
                <span className="text-sm text-ink-3">{label}</span>
                <span className="block font-extrabold text-lg">→ {tool!.name}</span>
                <span className="text-sm text-ink-2">Note {fmt(tool!.score)}/10 · {tool!.categoryName}</span>
              </Link>
            ))}
          </div>
          {duels.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {duels.map((d) => <Link key={d.path} href={d.path} className="p-4 rounded-2xl bg-ink text-white font-bold">{d.h1} →</Link>)}
            </div>
          )}
          <Link href="/trouver" className="inline-flex mt-6 items-center min-h-11 px-5 rounded-lg bg-accent text-ink font-bold">Trouver la solution pour mon profil →</Link>
        </section>
      )}

      {alternatives.length > 0 && (
        <section id="changer" className="max-w-6xl mx-auto px-4 pb-14">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-3">Étape D · Changer</p>
          <h2 className="font-display font-extrabold text-3xl mt-1 mb-4">Je veux quitter mon outil</h2>
          <div className="flex flex-col gap-2">
            {alternatives.map((a) => <Link key={a.path} href={a.path} className="p-4 rounded-xl bg-white border border-line shadow-sm font-bold">{a.h1} →</Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
