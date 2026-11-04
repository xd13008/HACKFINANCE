import { notFound } from "next/navigation";
import { getCategory, getContentByPath, getFacet, getFacts, getPricing, getRanking } from "@/lib/data";
import type { Criterion, Fact } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { RankingTable } from "@/components/public/RankingTable";
import { ldItemList } from "@/lib/seo";
import { metadataFor, requireSite } from "../../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
type P = Promise<{ site: string; categorie: string; facette: string }>;

/** Application d'une règle de facette aux faits validés. */
function matches(rule: Record<string, unknown>, facts: Map<string, Fact> | undefined) {
  const v = facts?.get(String(rule.fact_type))?.value as unknown;
  if ("equals" in rule) return v === rule.equals;
  if ("contains" in rule) return Array.isArray(v) && v.includes(rule.contains);
  return false;
}

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/meilleurs-logiciels/${p.categorie}/${p.facette}`);
}

export default async function FacetPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const category = await getCategory(site.id, p.categorie);
  if (!category) notFound();
  const facet = await getFacet(category.id, p.facette);
  // Seules les facettes déclarées « landing » et dotées d'un contenu validé existent en URL indexable.
  if (!facet?.is_landing) notFound();
  const content = await getContentByPath(site.id, `/meilleurs-logiciels/${category.slug}/${facet.slug}`);
  if (!content) notFound();

  const all = await getRanking(category.id);
  const facts = await getFacts(all.map((r) => r.software.id));
  const ranking = all.filter((r) => matches(facet.rule as Record<string, unknown>, facts.get(r.software.id)))
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const pricing = await getPricing(ranking.map((r) => r.software.id));

  return (
    <ContentArticle
      site={site}
      content={content}
      rubrique={category.slug}
      article={false}
      crumbs={[{ name: "Accueil", path: "/" }, { name: category.name, path: `/meilleurs-logiciels/${category.slug}` }, { name: facet.name, path: content.path! }]}
      extraLd={[ldItemList(site, ranking.map((r) => ({ name: r.software.name, path: `/logiciels/${r.software.slug}` })))]}
      before={<RankingTable ranking={ranking} criteria={category.criteria as Criterion[]} pricing={pricing} facts={facts} />}
    />
  );
}
