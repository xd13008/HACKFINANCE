import { notFound } from "next/navigation";
import { getCategory, getFacts, getPricing, getRanking, getSponsored, getContentByPath } from "@/lib/data";
import type { Criterion } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { RankingTable } from "@/components/public/RankingTable";
import { SponsoredBlock } from "@/components/public/SponsoredBlock";
import { ldItemList } from "@/lib/seo";
import { metadataFor, requireSite } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
type P = Promise<{ site: string; categorie: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/meilleurs-logiciels/${p.categorie}`);
}

export default async function CategoryPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const category = await getCategory(site.id, p.categorie);
  if (!category || category.kind !== "software") notFound();
  const content = await getContentByPath(site.id, `/meilleurs-logiciels/${category.slug}`);
  if (!content) notFound();

  const ranking = await getRanking(category.id);
  const ids = ranking.map((r) => r.software.id);
  const [pricing, facts, sponsored] = await Promise.all([
    getPricing(ids), getFacts(ids), getSponsored(site.id, { categoryId: category.id, types: ["category_sponsored"] }),
  ]);

  return (
    <ContentArticle
      site={site}
      content={content}
      rubrique={category.slug}
      crumbs={[{ name: "Accueil", path: "/" }, { name: category.name, path: content.path! }]}
      article={false}
      extraLd={[ldItemList(site, ranking.map((r) => ({ name: r.software.name, path: `/logiciels/${r.software.slug}` })))]}
      before={
        <>
          <SponsoredBlock placements={sponsored} title="Partenaires de la catégorie" />
          <RankingTable ranking={ranking} criteria={category.criteria as Criterion[]} pricing={pricing} facts={facts} />
        </>
      }
    />
  );
}
