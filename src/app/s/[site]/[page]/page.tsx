import { ContentArticle } from "@/components/public/ContentArticle";
import { loadPage, metadataFor, publishedSlugs, staticParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("page", await publishedSlugs(params.site, "page"));
}
type P = Promise<{ site: string; page: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/${p.page}`);
}

/** Pages institutionnelles (méthode, à propos, mentions…) : contenus de type « page ». */
export default async function StaticPage({ params }: { params: P }) {
  const p = await params;
  const { site, content } = await loadPage(p.site, `/${p.page}`);
  return <ContentArticle site={site} content={content} article={false} crumbs={[{ name: "Accueil", path: "/" }, { name: content.h1!, path: content.path! }]} />;
}
