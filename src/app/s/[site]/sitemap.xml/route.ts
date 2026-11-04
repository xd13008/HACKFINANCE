import { publicClient } from "@/lib/supabase/public";
import { getSite } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Sitemap : uniquement les pages publiées et indexables. */
export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  if (!site) return new Response("Not found", { status: 404 });
  const db = publicClient();
  const [{ data: pages }, { data: cats }] = await Promise.all([
    db.from("published_content").select("path,type,content_updated_at,published_at,robots").eq("site_id", site.id).eq("robots", "index"),
    db.from("categories").select("id,slug").eq("site_id", site.id).eq("kind", "provider").eq("status", "published"),
  ]);
  const urls: { loc: string; lastmod: string | null }[] = (pages ?? []).map((p) => ({ loc: absoluteUrl(site, p.path!), lastmod: p.content_updated_at ?? p.published_at }));
  const catSlug = new Map((cats ?? []).map((c) => [c.id, c.slug]));
  if (catSlug.size) {
    const { data: links } = await db.from("provider_categories").select("provider_id,category_id").in("category_id", [...catSlug.keys()]);
    const ids = [...new Set((links ?? []).map((l) => l.provider_id))];
    // Seules les fiches vérifiées sont indexables.
    const { data: providers } = ids.length
      ? await db.from("providers_public").select("id,slug,updated_at").in("id", ids).eq("verification_status", "verified")
      : { data: [] };
    for (const l of links ?? []) {
      const pr = (providers ?? []).find((x) => x.id === l.provider_id);
      if (pr) urls.push({ loc: absoluteUrl(site, `/prestataires/${catSlug.get(l.category_id)}/${pr.slug}`), lastmod: pr.updated_at });
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
