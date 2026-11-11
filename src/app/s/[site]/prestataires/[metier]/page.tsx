import { notFound } from "next/navigation";
import Link from "next/link";
import { getContentByPath, getProviderCategory, getProviderLocations, getProviders, getSponsored } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { SponsoredBlock } from "@/components/public/SponsoredBlock";
import { ProviderList } from "@/components/public/ProviderList";
import { LocationsIndex } from "@/components/public/LocalDirectory";
import { ldItemList } from "@/lib/seo";
import { metadataFor, requireSite, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("metier", await publishedSlugs(params.site, "provider_directory"));
}
type P = Promise<{ site: string; metier: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/prestataires/${p.metier}`);
}

/** Page d'un métier : présentation éditoriale, index des villes et départements, premières fiches (ordre alphabétique). */
export default async function DirectoryPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const category = await getProviderCategory(site.id, p.metier);
  if (!category) notFound();
  const content = await getContentByPath(site.id, `/prestataires/${category.slug}`);
  if (!content) notFound();
  const [list, locations, sponsored] = await Promise.all([
    getProviders(category.id, { size: 24 }), getProviderLocations(category.id),
    getSponsored(site.id, { categoryId: category.id, types: ["directory_featured"] }),
  ]);
  return (
    <ContentArticle site={site} content={content} rubrique={category.slug} article={false}
      crumbs={[{ name: "Accueil", path: "/" }, { name: category.name, path: content.path! }]}
      extraLd={[ldItemList(site, list.providers.map((pr) => ({ name: pr.name!, path: `/prestataires/${category.slug}/${pr.slug}` })))]}
      before={<>
        <SponsoredBlock placements={sponsored} title="Cabinets mis en avant" />
        <p className="text-sm text-ink-2">{list.total.toLocaleString("fr-FR")} fiches référencées, dans {locations.length.toLocaleString("fr-FR")} villes.</p>
        <LocationsIndex cat={category} locations={locations} />
        <ProviderList providers={list.providers} categorySlug={category.slug} />
        {list.total > list.providers.length && <p className="text-sm">Choisissez une ville ou un département ci-dessus pour voir toutes les fiches. <Link href="/referencer-mon-cabinet" className="underline">Référencer mon cabinet</Link></p>}
      </>} />
  );
}
