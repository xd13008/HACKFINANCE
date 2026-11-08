import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];
export type Site = Tables["sites"]["Row"];
export type Category = Tables["categories"]["Row"];
export type Facet = Tables["facets"]["Row"];
export type Software = Tables["software"]["Row"];
export type PricingPlan = Tables["pricing_plans"]["Row"];
export type Fact = Tables["software_facts"]["Row"];
export type TestRun = Tables["test_runs"]["Row"];
export type Score = Tables["scores"]["Row"];
export type Content = Views["published_content"]["Row"];
export type ProviderPublic = Views["providers_public"]["Row"];
export type Sponsored = Views["active_sponsored_placements"]["Row"];
export type Criterion = { key: string; label: string; weight: number };
export type FaqItem = { q: string; a: string };
export type Source = { url: string; title: string | null; accessed_at: string };

const db = () => publicClient();

export const getSite = cache(async (key: string): Promise<Site | null> => {
  const { data } = await db().from("sites").select("*").eq("key", key).maybeSingle();
  return data;
});

export const getNav = cache(async (siteId: string) => {
  const [{ data: verticals }, { data: categories }, { data: pillars }, { data: pages }] = await Promise.all([
    db().from("verticals").select("*").eq("site_id", siteId).order("sort"),
    db().from("categories").select("*").eq("site_id", siteId).eq("status", "published").order("sort"),
    db().from("published_content").select("path,h1,type").eq("site_id", siteId).in("type", ["pillar", "simulator"]),
    db().from("published_content").select("path").eq("site_id", siteId).in("type", ["page", "glossary"]),
  ]);
  return {
    verticals: verticals ?? [], categories: categories ?? [], highlights: pillars ?? [],
    /** Pages institutionnelles publiées : le pied de page ne lie que celles-ci (aucun lien vers une 404). */
    publishedPaths: new Set((pages ?? []).map((p) => p.path!)),
    hasGlossary: (pages ?? []).some((p) => p.path!.startsWith("/lexique/")),
  };
});

export const getContentByPath = cache(async (siteId: string, path: string): Promise<Content | null> => {
  const { data } = await db().from("published_content").select("*").eq("site_id", siteId).eq("path", path).maybeSingle();
  return data;
});

export async function listContent(siteId: string, opts: { types?: string[]; categoryId?: string; cluster?: string; limit?: number } = {}) {
  let q = db().from("published_content").select("id,path,type,h1,summary,meta_description,published_at,category_id,software_id,software_b_id,cluster").eq("site_id", siteId);
  if (opts.types) q = q.in("type", opts.types as Content["type"][] as never);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.cluster) q = q.eq("cluster", opts.cluster);
  const { data } = await q.order("published_at", { ascending: false }).limit(opts.limit ?? 50);
  return data ?? [];
}

export const getSources = cache(async (versionId: string): Promise<Source[]> => {
  const { data } = await db().from("content_sources").select("url,title,accessed_at").eq("content_version_id", versionId);
  return data ?? [];
});

export const getCategory = cache(async (siteId: string, slug: string): Promise<Category | null> => {
  const { data } = await db().from("categories").select("*").eq("site_id", siteId).eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
});

export const getCategoryById = cache(async (id: string): Promise<Category | null> => {
  const { data } = await db().from("categories").select("*").eq("id", id).maybeSingle();
  return data;
});

export async function getFacet(categoryId: string, slug: string): Promise<Facet | null> {
  const { data } = await db().from("facets").select("*").eq("category_id", categoryId).eq("slug", slug).maybeSingle();
  return data;
}

export const getStaffNames = cache(async (ids: string[]) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, { name: string; title: string | null }>();
  const { data } = await db().from("staff_profiles").select("user_id,display_name,job_title").in("user_id", unique);
  return new Map((data ?? []).map((p) => [p.user_id, { name: p.display_name, title: p.job_title }]));
});

/** Faits validés, le plus récent par type. */
export async function getFacts(softwareIds: string[]) {
  if (!softwareIds.length) return new Map<string, Map<string, Fact>>();
  const { data } = await db().from("software_facts").select("*").in("software_id", softwareIds).eq("status", "validated").order("collected_at", { ascending: false });
  const out = new Map<string, Map<string, Fact>>();
  for (const f of data ?? []) {
    const m = out.get(f.software_id) ?? new Map<string, Fact>();
    if (!m.has(f.fact_type)) m.set(f.fact_type, f);
    out.set(f.software_id, m);
  }
  return out;
}

export async function getPricing(softwareIds: string[]) {
  if (!softwareIds.length) return new Map<string, PricingPlan[]>();
  const { data } = await db().from("pricing_plans").select("*").in("software_id", softwareIds).eq("status", "validated").order("sort");
  const out = new Map<string, PricingPlan[]>();
  for (const p of data ?? []) out.set(p.software_id, [...(out.get(p.software_id) ?? []), p]);
  return out;
}

export type RankedSoftware = {
  software: Software;
  overall: number;
  rank: number;
  criteria: Record<string, number>;
  testedAt: string;
  validatedAt: string | null;
  testRunId: string;
};

/** Classement éditorial : calculé par la base à partir des seules notes publiées. */
export const getRanking = cache(async (categoryId: string): Promise<RankedSoftware[]> => {
  const { data: rows } = await db().from("editorial_rankings").select("*").eq("category_id", categoryId).order("editorial_rank");
  if (!rows?.length) return [];
  const { data: sw } = await db().from("software").select("*").in("id", rows.map((r) => r.software_id!));
  const byId = new Map((sw ?? []).map((s) => [s.id, s]));
  return rows
    .filter((r) => byId.has(r.software_id!))
    .map((r) => ({
      software: byId.get(r.software_id!)!,
      overall: Number(r.overall_score),
      rank: Number(r.editorial_rank),
      criteria: (r.criteria_scores ?? {}) as Record<string, number>,
      testedAt: r.tested_at!,
      validatedAt: r.validated_at,
      testRunId: r.test_run_id!,
    }));
});

export const getSoftware = cache(async (slug: string): Promise<Software | null> => {
  const { data } = await db().from("software").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
});

export async function getSoftwareByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await db().from("software").select("*").in("id", ids).eq("status", "published");
  return data ?? [];
}

export async function getPrimaryCategory(softwareId: string): Promise<Category | null> {
  const { data } = await db().from("software_categories").select("category_id,is_primary").eq("software_id", softwareId).order("is_primary", { ascending: false }).limit(1);
  return data?.[0] ? getCategoryById(data[0].category_id) : null;
}

/** Test validé (et ses notes) d'un logiciel dans une catégorie. */
export async function getValidatedTest(softwareId: string, categoryId: string) {
  const { data: tr } = await db().from("test_runs").select("*").eq("software_id", softwareId).eq("category_id", categoryId).eq("status", "validated").maybeSingle();
  if (!tr) return null;
  const { data: scores } = await db().from("scores").select("*").eq("test_run_id", tr.id).eq("status", "published");
  return { test: tr, scores: scores ?? [] };
}

export async function getIntegrations(softwareId: string) {
  const { data } = await db().from("integrations").select("*").eq("software_id", softwareId);
  return data ?? [];
}

export async function getAffiliate(softwareId: string) {
  const { data } = await db().from("affiliate_links").select("url").eq("software_id", softwareId).eq("active", true).maybeSingle();
  return data?.url ?? null;
}

export async function getSponsored(siteId: string, opts: { categoryId?: string; types: string[] }) {
  let q = db().from("active_sponsored_placements").select("*").eq("site_id", siteId).in("placement_type", opts.types as never);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  const { data } = await q.order("slot");
  const rows = data ?? [];
  const sw = await getSoftwareByIds(rows.map((r) => r.software_id!).filter(Boolean));
  const provIds = rows.map((r) => r.provider_id!).filter(Boolean);
  const { data: prov } = provIds.length ? await db().from("providers_public").select("*").in("id", provIds) : { data: [] as ProviderPublic[] };
  return rows.map((r) => ({
    ...r,
    software: sw.find((s) => s.id === r.software_id) ?? null,
    provider: (prov ?? []).find((p) => p.id === r.provider_id) ?? null,
  }));
}

export async function getProviders(categoryId: string, city?: string) {
  const { data: links } = await db().from("provider_categories").select("provider_id").eq("category_id", categoryId);
  const ids = (links ?? []).map((l) => l.provider_id);
  if (!ids.length) return [];
  let q = db().from("providers_public").select("*").in("id", ids);
  if (city) q = q.eq("city_slug", city);
  const { data } = await q.order("name");
  return data ?? [];
}

export async function getProvider(slug: string) {
  const { data } = await db().from("providers_public").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getProviderCategory(siteId: string, slug: string) {
  const { data } = await db().from("categories").select("*").eq("site_id", siteId).eq("slug", slug).eq("kind", "provider").eq("status", "published").maybeSingle();
  return data;
}

export async function getInventory(siteId: string) {
  const { data } = await db().from("placement_inventory_priced").select("*").eq("site_id", siteId).eq("active", true).order("placement_type");
  return data ?? [];
}

export async function listCategories(siteId: string, kind?: "software" | "provider") {
  let q = db().from("categories").select("*").eq("site_id", siteId).eq("status", "published");
  if (kind) q = q.eq("kind", kind);
  const { data } = await q.order("sort");
  return data ?? [];
}

export const getContentById = cache(async (id: string) => {
  const { data } = await db().from("published_content").select("id,path,h1,type").eq("id", id).maybeSingle();
  return data;
});

export type ReviewSource = Tables["review_sources"]["Row"];
export type ReviewQuote = Tables["review_quotes"]["Row"];
export type ReviewSummary = Tables["review_summaries"]["Row"];

/** Avis tiers cités (validés par un éditeur) : relevés de note par plateforme et courtes citations. */
export async function getPublicReviews(target: { softwareId?: string; providerId?: string }) {
  let q = db().from("review_sources").select("*").eq("status", "validated").order("captured_at", { ascending: false });
  q = target.softwareId ? q.eq("software_id", target.softwareId) : q.eq("provider_id", target.providerId!);
  const { data: sources } = await q;
  // Le relevé le plus récent par plateforme
  const latest = new Map<string, ReviewSource>();
  for (const s of sources ?? []) if (!latest.has(s.platform)) latest.set(s.platform, s);
  const ids = (sources ?? []).map((s) => s.id);
  const { data: quotes } = ids.length
    ? await db().from("review_quotes").select("*").in("review_source_id", ids).eq("status", "validated").order("review_date", { ascending: false })
    : { data: [] as ReviewQuote[] };
  let sq = db().from("review_summaries").select("*").eq("status", "validated").order("created_at", { ascending: false }).limit(1);
  sq = target.softwareId ? sq.eq("software_id", target.softwareId) : sq.eq("provider_id", target.providerId!);
  const { data: summary } = await sq;
  return { sources: [...latest.values()], quotes: quotes ?? [], summary: summary?.[0] ?? null };
}
