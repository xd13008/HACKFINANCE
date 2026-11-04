import { ContentArticle } from "@/components/public/ContentArticle";
import { getContentById } from "@/lib/data";
import { loadPage, metadataFor } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
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
