import { notFound } from "next/navigation";
import { getAffiliate, getContentByPath, getPricing, getPrimaryCategory, getSoftware } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { PricingTable, VisitCta } from "@/components/public/SoftwareParts";
import { metadataFor, requireSite, publishedSlugs, staticParams } from "../../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "pricing"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/logiciels/${p.slug}/prix`);
}

export default async function PricingPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const sw = await getSoftware(p.slug);
  if (!sw) notFound();
  const content = await getContentByPath(site.id, `/logiciels/${sw.slug}/prix`);
  if (!content) notFound();
  const [pricing, category, affiliate] = await Promise.all([getPricing([sw.id]), getPrimaryCategory(sw.id), getAffiliate(sw.id)]);
  return (
    <ContentArticle
      site={site} content={content} rubrique={category?.slug} article={false}
      crumbs={[{ name: "Accueil", path: "/" }, ...(category ? [{ name: category.name, path: `/meilleurs-logiciels/${category.slug}` }] : []),
               { name: sw.name, path: `/logiciels/${sw.slug}` }, { name: "Prix", path: content.path! }]}
      before={<><PricingTable plans={pricing.get(sw.id) ?? []} /><VisitCta name={sw.name} website={sw.website} affiliate={affiliate} softwareId={sw.id} /></>}
    />
  );
}
