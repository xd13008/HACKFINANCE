import Link from "next/link";
import type { Metadata } from "next";
import { listContent } from "@/lib/data";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { JsonLd } from "@/components/public/JsonLd";
import { staticMetadata, ldBreadcrumb } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/lexique", `Lexique : définitions clés — ${site.name}`,
    `Les définitions des termes clés utilisés par ${site.name} : vocabulaire financier, juridique et fiscal expliqué simplement, avec exemples.`);
}

export default async function GlossaryIndex({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const terms = (await listContent(site.id, { types: ["glossary"], limit: 500 })).sort((a, b) => a.h1!.localeCompare(b.h1!, "fr"));
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <JsonLd data={[ldBreadcrumb(site, [{ name: "Accueil", path: "/" }, { name: "Lexique", path: "/lexique" }]),
        { "@context": "https://schema.org", "@type": "DefinedTermSet", name: `Lexique ${site.name}`, hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.h1 })) }]} />
      <Tracker site={site.key} pageType="glossary_index" />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Lexique", path: "/lexique" }]} />
      <h1 className="text-3xl font-extrabold mb-3">Lexique</h1>
      <p className="text-lg text-ink-2 mb-6">
        Les termes clés de {site.name}, définis simplement : chaque définition donne le sens du mot, un exemple chiffré quand c&apos;est utile,
        et renvoie vers les guides et comparatifs qui l&apos;utilisent. Les définitions sont rédigées à partir de sources officielles et
        relues par la rédaction ; elles constituent une information générale, pas un conseil personnalisé.
      </p>
      <ul className="divide-y divide-line">
        {terms.map((t) => (
          <li key={t.id} className="py-3"><Link href={t.path!} className="font-semibold text-brand underline">{t.h1}</Link><p className="text-sm text-ink-2">{t.meta_description}</p></li>
        ))}
      </ul>
    </div>
  );
}
