import Link from "next/link";
import { listIntegrationTools } from "@/lib/integrations";
import { staticMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const tools = await listIntegrationTools(site.id);
  return staticMetadata(site, "/integrations", "Intégrations : quels logiciels se connectent à vos outils ?",
    "Pennylane, Sage, Cegid, Odoo… : les logiciels finance qui s'y connectent et les intégrateurs qui les déploient.", { noindex: tools.length < 3 });
}

/** Maquette, écran 7 : index des outils (logiciels compatibles et intégrateurs référencés). */
export default async function Integrations({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const tools = await listIntegrationTools(site.id);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Tracker site={site.key} pageType="integrations" />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Intégrations", path: "/integrations" }]} />
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">Compatible avec mon outil</h1>
      <p className="mt-3 max-w-3xl text-ink-2">Vous utilisez déjà un logiciel comptable, un ERP ou une banque en ligne ? Voici les solutions qui s&apos;y connectent et les intégrateurs qui les déploient.</p>
      {tools.length === 0 ? <p className="mt-6">Aucune intégration référencée pour l&apos;instant.</p> : (
        <ul className="mt-6 m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <li key={t.slug}><Link href={`/integrations/${t.slug}`} className="flex flex-col gap-1 h-full rounded-2xl border border-line bg-white p-4 no-underline hover:border-ink">
              <strong className="text-lg">{t.name}</strong>
              <span className="text-sm text-ink-3">{[t.software && `${t.software} logiciel(s) compatible(s)`, t.integrators && `${t.integrators} intégrateur(s)`].filter(Boolean).join(" · ")}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
