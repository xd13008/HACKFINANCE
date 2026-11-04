import Link from "next/link";
import type { Metadata } from "next";
import { listContent } from "@/lib/data";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { absoluteUrl } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return { title: `Lexique — ${site.name}`, description: `Définitions des termes clés utilisés sur ${site.name}.`, alternates: { canonical: absoluteUrl(site, "/lexique") } };
}

export default async function GlossaryIndex({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const terms = (await listContent(site.id, { types: ["glossary"], limit: 500 })).sort((a, b) => a.h1!.localeCompare(b.h1!, "fr"));
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Tracker site={site.key} pageType="glossary_index" />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Lexique", path: "/lexique" }]} />
      <h1 className="text-3xl font-extrabold mb-6">Lexique</h1>
      <ul className="divide-y divide-line">
        {terms.map((t) => (
          <li key={t.id} className="py-3"><Link href={t.path!} className="font-semibold text-brand underline">{t.h1}</Link><p className="text-sm text-ink-2">{t.meta_description}</p></li>
        ))}
      </ul>
    </div>
  );
}
