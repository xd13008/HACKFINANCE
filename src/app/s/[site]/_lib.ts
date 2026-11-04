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

