import { ContentArticle } from "@/components/public/ContentArticle";
import { loadPage, metadataFor, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "pillar"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/dossiers/${p.slug}`);
}

export default async function PillarPage({ params }: { params: P }) {
  const p = await params;
  const { site, content } = await loadPage(p.site, `/dossiers/${p.slug}`);
  return <ContentArticle site={site} content={content} crumbs={[{ name: "Accueil", path: "/" }, { name: content.h1!, path: content.path! }]} />;
}
