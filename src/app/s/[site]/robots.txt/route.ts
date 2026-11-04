import { getSite } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  if (!site) return new Response("Not found", { status: 404 });
  const live = site.status === "live" && process.env.NODE_ENV === "production" && process.env.ALLOW_INDEXING === "true";
  const body = live
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /signaler-une-erreur\n\nSitemap: ${siteUrl(site)}/sitemap.xml\n`
    : `# Indexation désactivée hors production (ALLOW_INDEXING=true pour l'activer)\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
