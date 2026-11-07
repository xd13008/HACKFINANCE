import { notFound } from "next/navigation";
import { getContentByPath, getSite } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";
import { SITE_KEY_PATTERN } from "@/lib/sites";

export type SiteParams = Promise<{ site: string }>;

export async function requireSite(key: string) {
  if (!SITE_KEY_PATTERN.test(key)) notFound();
  const site = await getSite(key);
  if (!site) notFound();
  return site;
}

export async function loadPage(key: string, path: string) {
  const site = await requireSite(key);
  const content = await getContentByPath(site.id, path);
  if (!content) notFound();
  return { site, content };
}

export async function metadataFor(key: string, path: string, opts: { noindex?: boolean } = {}) {
  const site = await getSite(key);
  if (!site) return {};
  const content = await getContentByPath(site.id, path);
  if (!content) return { title: "Page introuvable", robots: { index: false } };
  return contentMetadata(site, content, opts);
}


/**
 * Slugs publiés d'un type de contenu pour un portail : sert à pré-générer les pages au build
 * (pages mises en cache et servies depuis le CDN). Les pages publiées ensuite restent servies à la demande.
 */
export async function publishedSlugs(siteKey: string, type: string): Promise<string[]> {
  const { publicClient } = await import("@/lib/supabase/public");
  const db = publicClient();
  const { data: site } = await db.from("sites").select("id").eq("key", siteKey).maybeSingle();
  if (!site) return [];
  const { data } = await db.from("published_content").select("slug").eq("site_id", site.id).eq("type", type as never);
  const out = (data ?? []).map((p) => p.slug!).filter(Boolean);
  return out;
}

/**
 * Paramètres pré-générés d'un segment. Next.js abandonne la pré-génération de toute la route
 * si l'un des portails renvoie une liste vide : on renvoie alors un paramètre de repli, rendu en 404.
 */
export function staticParams<K extends string>(key: K, values: string[]): Record<K, string>[] {
  return (values.length ? values : ["-"]).map((v) => ({ [key]: v }) as Record<K, string>);
}
