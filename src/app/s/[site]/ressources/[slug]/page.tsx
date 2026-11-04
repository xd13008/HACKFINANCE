import { ContentArticle } from "@/components/public/ContentArticle";
import { ResourceForm } from "@/components/public/Forms";
import { loadPage, metadataFor } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/ressources/${p.slug}`);
}

export default async function ResourcePage({ params }: { params: P }) {
  const p = await params;
  const { site, content } = await loadPage(p.site, `/ressources/${p.slug}`);
  return (
    <ContentArticle site={site} content={content} crumbs={[{ name: "Accueil", path: "/" }, { name: content.h1!, path: content.path! }]}
      before={<ResourceForm site={site.key} resourceId={content.id!} path={content.path!} />} />
  );
}
