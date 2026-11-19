import { notFound } from "next/navigation";
import { getContentByPath, getSponsored } from "@/lib/data";
import { defaultWeights, loadCategoryHub } from "@/lib/category";
import { ContentArticle } from "@/components/public/ContentArticle";
import { CategoryExplorer } from "@/components/public/CategoryExplorer";
import { CategoryTabs } from "@/components/public/CategoryHero";
import { SponsoredBlock } from "@/components/public/SponsoredBlock";
import { ldItemList } from "@/lib/seo";
import { metadataFor, requireSite, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("categorie", await publishedSlugs(params.site, "category_ranking"));
}
type P = Promise<{ site: string; categorie: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/meilleurs-logiciels/${p.categorie}`);
}

/** Maquette, écran 2 : onglet « Test de la rédaction » (critères pondérés, filtres, comparateur) sous le texte validé de la catégorie. */
export default async function CategoryPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const hub = await loadCategoryHub(site.id, p.categorie);
  if (!hub) notFound();
  const content = await getContentByPath(site.id, `/meilleurs-logiciels/${hub.category.slug}`);
  if (!content) notFound();
  const sponsored = await getSponsored(site.id, { categoryId: hub.category.id, types: ["category_sponsored"] });

  return (
    <ContentArticle
      site={site}
      content={content}
      rubrique={hub.category.slug}
      wide
      crumbs={[{ name: "Accueil", path: "/" }, ...(hub.vertical ? [{ name: hub.vertical.name, path: `/univers/${hub.vertical.slug}` }] : []), { name: hub.category.name, path: content.path! }]}
      about={hub.tools.map((t) => t.name)}
      extraLd={[ldItemList(site, hub.tools.map((t) => ({ name: t.name, path: `/logiciels/${t.slug}` })))]}
      before={
        <>
          <CategoryTabs slug={hub.category.slug} current="" dark={false} />
          <CategoryExplorer
            categorySlug={hub.category.slug}
            criteria={hub.criteria.map((c) => ({ key: c.key, label: c.label }))}
            defaults={defaultWeights(hub.criteria)}
            tools={hub.tools.map((t) => ({ slug: t.slug, name: t.name, tagline: t.tagline, score: t.score, criteria: t.criteria, targetSizes: t.targetSizes,
              multiEntity: t.multiEntity, freePlan: t.freePlan, hosting: t.hosting, bankConnections: t.bankConnections, integrations: t.integrations, entry: t.entry, testedAt: t.testedAt }))}
            referenced={hub.referenced}
            providerCategories={hub.providerCategories}
            sponsored={sponsored.length ? <SponsoredBlock placements={sponsored} title="Sponsorisé · hors classement éditorial" /> : undefined}
          />
        </>
      }
    />
  );
}
