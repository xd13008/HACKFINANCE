import { notFound } from "next/navigation";
import { getContentByPath, getFacts, getPricing, getPrimaryCategory, getRanking, getSoftware, listContent } from "@/lib/data";
import type { Criterion } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { RankingTable } from "@/components/public/RankingTable";
import { metadataFor, requireSite, publishedSlugs, staticParams } from "../../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "alternatives"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/logiciels/${p.slug}/alternatives`);
}

export default async function AlternativesPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const sw = await getSoftware(p.slug);
  if (!sw) notFound();
  const content = await getContentByPath(site.id, `/logiciels/${sw.slug}/alternatives`);
  if (!content) notFound();
  const category = await getPrimaryCategory(sw.id);
  const ranking = category ? (await getRanking(category.id)).filter((r) => r.software.id !== sw.id).map((r, i) => ({ ...r, rank: i + 1 })) : [];
  const ids = ranking.map((r) => r.software.id);
  const [pricing, facts] = await Promise.all([getPricing(ids), getFacts(ids)]);
  return (
    <ContentArticle
      site={site} content={content} rubrique={category?.slug} article={false}
      crumbs={[{ name: "Accueil", path: "/" }, ...(category ? [{ name: category.name, path: `/meilleurs-logiciels/${category.slug}` }] : []),
               { name: sw.name, path: `/logiciels/${sw.slug}` }, { name: "Alternatives", path: content.path! }]}
      before={category && <RankingTable pricingPages={new Set((await listContent(site.id, { types: ["pricing"], limit: 500 })).map((c) => c.path!))} ranking={ranking} criteria={category.criteria as Criterion[]} pricing={pricing} facts={facts} />}
    />
  );
}
