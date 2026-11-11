import { publicClient } from "@/lib/supabase/public";
import { getSite } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";
import { loadAllUniverses } from "@/lib/universe";
import { MIN_INDEXABLE } from "@/lib/departements";

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
  // Pages fixes indexables (hors contenus éditoriaux)
  urls.push({ loc: absoluteUrl(site, "/publicite"), lastmod: null });
  if ((pages ?? []).some((p) => p.type === "glossary")) urls.push({ loc: absoluteUrl(site, "/lexique"), lastmod: null });
  // Univers : indexables seulement s'ils présentent au moins un logiciel testé (sinon noindex, cf. la page)
  const universes = (await loadAllUniverses(site.id)).filter((u) => u.tools.length);
  if (universes.length) urls.push({ loc: absoluteUrl(site, "/trouver"), lastmod: null });
  for (const u of universes) urls.push({ loc: absoluteUrl(site, `/univers/${u.vertical.slug}`), lastmod: u.tools.map((t) => t.testedAt).sort().at(-1) ?? null });
  // Annuaires publiés : fiches vérifiées et pages locales (ville, département) d'au moins MIN_INDEXABLE fiches publiées
  const directories = new Set((pages ?? []).filter((p) => p.type === "provider_directory").map((p) => p.path!.split("/")[2]));
  for (const c of (cats ?? []).filter((x) => directories.has(x.slug))) {
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await db.from("providers_by_category").select("slug,updated_at")
        .eq("category_id", c.id).eq("verification_status", "verified").order("slug").range(from, from + 999);
      for (const pr of rows ?? []) urls.push({ loc: absoluteUrl(site, `/prestataires/${c.slug}/${pr.slug}`), lastmod: pr.updated_at });
      if ((rows ?? []).length < 1000) break;
    }
    const { data: locations } = await db.rpc("provider_locations", { p_category: c.id });
    const deps = new Map<string, number>();
    for (const l of locations ?? []) {
      if (l.city_slug && l.providers >= MIN_INDEXABLE) urls.push({ loc: absoluteUrl(site, `/prestataires/${c.slug}/${l.city_slug}`), lastmod: null });
      if (l.department) deps.set(l.department, (deps.get(l.department) ?? 0) + l.providers);
    }
    for (const [d, n] of deps) if (n >= MIN_INDEXABLE) urls.push({ loc: absoluteUrl(site, `/prestataires/${c.slug}/departement/${d.toLowerCase()}`), lastmod: null });
  }
  // Offres d'emploi en ligne (expirées exclues par la RLS)
  const { count: jobCount } = await db.from("job_offers").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  if (jobCount) urls.push({ loc: absoluteUrl(site, "/emplois"), lastmod: null });
  for (let from = 0; jobCount && from < jobCount; from += 1000) {
    const { data: jobs } = await db.from("job_offers").select("slug,updated_at").eq("site_id", site.id).order("slug").range(from, from + 999);
    for (const j of jobs ?? []) urls.push({ loc: absoluteUrl(site, `/emplois/${j.slug}`), lastmod: j.updated_at });
    if ((jobs ?? []).length < 1000) break;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
