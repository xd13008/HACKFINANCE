import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/data";
import { KIND_LABEL, loadIntegrationTool } from "@/lib/integrations";
import { staticMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { requireSite } from "../../_lib";

export const revalidate = 300;
type P = Promise<{ site: string; outil: string }>;
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  const site = await getSite(p.site);
  const d = site ? await loadIntegrationTool(site.id, p.outil) : null;
  if (!site || !d) return { robots: { index: false } };
  return staticMetadata(site, `/integrations/${d.tool.slug}`, `Logiciels compatibles avec ${d.tool.name} et intégrateurs`,
    `${d.software.length} logiciel(s) finance qui se connectent à ${d.tool.name}, type de connexion et source ; ${d.experts.length} intégrateur(s) référencé(s).`,
    { noindex: d.software.length + d.experts.length + d.cabinets.length < 3 });
}

/** Maquette, écran 7 : logiciels compatibles avec un outil, intégrateurs et cabinets qui le maîtrisent. */
export default async function IntegrationPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const d = await loadIntegrationTool(site.id, p.outil);
  if (!d) notFound();
  const { tool, software, experts, cabinets } = d;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-10">
      <Tracker site={site.key} pageType="integration" rubrique={tool.slug} />
      <div>
        <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Intégrations", path: "/integrations" }, { name: tool.name, path: `/integrations/${tool.slug}` }]} />
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">Logiciels compatibles avec {tool.name}</h1>
        <p className="mt-3 max-w-3xl text-ink-2">Vous utilisez déjà {tool.name} ? Voici les solutions qui s&apos;y connectent, avec le type de connexion et sa source.</p>
      </div>
      <section>
        {software.length === 0 ? <p className="m-0 text-ink-2">Aucun logiciel publié ne déclare encore de connexion à {tool.name}.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead><tr className="bg-brand text-white text-left"><th scope="col" className="p-3">Solution</th><th scope="col" className="p-3">Catégorie</th><th scope="col" className="p-3">Connexion</th><th scope="col" className="p-3">Note rédaction</th><th scope="col" className="p-3">Source</th></tr></thead>
              <tbody>
                {software.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <th scope="row" className="p-3 text-left"><Link href={`/logiciels/${s.slug}`}>{s.name}</Link></th>
                    <td className="p-3">{s.category ? <Link href={`/meilleurs-logiciels/${s.category.slug}`}>{s.category.name}</Link> : "—"}</td>
                    <td className="p-3">{KIND_LABEL[s.kind] ?? s.kind}</td>
                    <td className="p-3 font-bold">{s.score != null ? `${fmt(s.score)}/10` : <span className="font-normal text-ink-3">Non testé</span>}</td>
                    <td className="p-3">{s.source ? <a href={s.source} rel="nofollow noopener" target="_blank" className="underline">documentation</a> : <span className="text-ink-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 mt-2 text-xs text-ink-3">Connexion native : intégrée par l&apos;éditeur · API : à paramétrer · Via connecteur : passe par un outil tiers.</p>
      </section>
      {experts.length > 0 && (
        <section>
          <h2 className="m-0 mb-1 text-2xl font-extrabold">Intégrateurs {tool.name}</h2>
          <p className="m-0 mb-3 text-sm text-ink-3">Annuaire factuel, sans classement : spécialités déclarées, fiches vérifiées en premier.</p>
          <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {experts.slice(0, 30).map((e) => <li key={e.slug}><Link href={`/prestataires/integrateurs-comptables/${e.slug}`} className="block rounded-xl border border-line bg-white p-3 no-underline hover:border-ink"><strong>{e.name}</strong><span className="block text-sm text-ink-3">{e.city ?? ""}{e.verification_status === "verified" ? " · fiche vérifiée" : ""}</span></Link></li>)}
          </ul>
          {experts.length > 30 && <p className="m-0 mt-2 text-sm"><Link href="/prestataires/integrateurs-comptables" className="underline">Voir les {experts.length} intégrateurs</Link></p>}
        </section>
      )}
      {cabinets.length > 0 && (
        <section>
          <h2 className="m-0 mb-1 text-2xl font-extrabold">Cabinets qui travaillent avec {tool.name}</h2>
          <p className="m-0 mb-3 text-sm text-ink-3">D&apos;après leur grille de lecture vérifiée par la rédaction (source datée sur chaque fiche).</p>
          <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cabinets.map((c) => <li key={c.slug}><Link href={`/prestataires/${c.category?.slug}/${c.slug}`} className="block rounded-xl border border-line bg-white p-3 no-underline hover:border-ink"><strong>{c.name}</strong><span className="block text-sm text-ink-3">{[c.category?.name, c.city].filter(Boolean).join(" · ")}</span></Link></li>)}
          </ul>
        </section>
      )}
      <p className="m-0 text-sm text-ink-3">Éditeur ou intégrateur ? Déclarez vos connecteurs et certifications depuis l&apos;<Link href="/espace-pro" className="underline">espace pro</Link> : la rédaction les vérifie avant publication.</p>
    </div>
  );
}
