import { ContentArticle } from "@/components/public/ContentArticle";
import { getContentById } from "@/lib/data";
import { loadPage, metadataFor, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "guide"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/guides/${p.slug}`);
}

export default async function GuidePage({ params }: { params: P }) {
  const p = await params;
  const { site, content } = await loadPage(p.site, `/guides/${p.slug}`);
  const pillar = content.pillar_id ? await getContentById(content.pillar_id) : null;
  const crumbs = [
    { name: "Accueil", path: "/" },
    ...(pillar ? [{ name: pillar.h1!, path: pillar.path! }] : []),
    { name: content.h1!, path: content.path! },
  ];
  return <ContentArticle site={site} content={content} crumbs={crumbs} />;
}
