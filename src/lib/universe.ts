import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { getFacts, getPricing, getProviders, getRanking, listContent, type Category } from "@/lib/data";
import { entryMonthlyPrice, median, type PlanLike } from "@/lib/decision";

/**
 * Données d'un univers (rubrique) pour l'assistant et la page univers. Lecture publique uniquement :
 * catégories publiées, classements éditoriaux, faits et prix VALIDÉS, prestataires publics.
 */

export type ToolCard = {
  id: string; slug: string; name: string; tagline: string | null;
  categorySlug: string; categoryName: string; rank: number; score: number; criteria: Record<string, number>;
  targetSizes: string[]; multiEntity: boolean | null; freePlan: boolean | null; hosting: string | null; bankConnections: number | null;
  integrations: string[]; plans: PlanLike[]; entry: number | null; testedAt: string;
};

export type ProviderCard = {
  slug: string; name: string; city: string | null; metierSlug: string; metierName: string;
  regulated: boolean; verified: boolean; specialties: string[];
};

export type UniverseData = {
  vertical: { id: string; slug: string; name: string; description: string | null; sort: number };
  categories: Category[];
  tools: ToolCard[];
  providers: ProviderCard[];
  related: { path: string; h1: string; type: string }[];
  kpis: { tested: number; providers: number; medianEntry: number | null; minEntry: number | null; maxEntry: number | null; best: ToolCard | null };
};

const db = () => publicClient();

export const listVerticals = cache(async (siteId: string) => {
  const { data } = await db().from("verticals").select("id,slug,name,description,sort").eq("site_id", siteId).order("sort");
  return data ?? [];
});

async function integrationsBySoftware(ids: string[]) {
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const { data } = await db().from("integrations").select("software_id,name").in("software_id", ids);
  for (const i of data ?? []) out.set(i.software_id, [...(out.get(i.software_id) ?? []), i.name]);
  return out;
}

const factValue = <T,>(m: Map<string, { value: unknown }> | undefined, key: string): T | null => (m?.get(key)?.value as T) ?? null;

export const loadUniverse = cache(async (siteId: string, verticalSlug: string): Promise<UniverseData | null> => {
  const vertical = (await listVerticals(siteId)).find((v) => v.slug === verticalSlug);
  if (!vertical) return null;
  const { data: cats } = await db().from("categories").select("*").eq("site_id", siteId).eq("vertical_id", vertical.id).eq("status", "published").order("sort");
  const categories = cats ?? [];

  // Logiciels : classement éditorial de chaque catégorie (une solution n'apparaît qu'une fois, dans sa meilleure catégorie)
  const ranked = (await Promise.all(categories.filter((c) => c.kind === "software").map(async (c) => (await getRanking(c.id)).map((r) => ({ r, c })))))
    .flat()
    .sort((a, b) => b.r.overall - a.r.overall);
  const seen = new Set<string>();
  const unique = ranked.filter(({ r }) => (seen.has(r.software.id) ? false : (seen.add(r.software.id), true)));
  const ids = unique.map(({ r }) => r.software.id);
  const [facts, pricing, integ] = await Promise.all([getFacts(ids), getPricing(ids), integrationsBySoftware(ids)]);
  const tools: ToolCard[] = unique.map(({ r, c }) => {
    const f = facts.get(r.software.id);
    const plans = (pricing.get(r.software.id) ?? []).map((p) => ({ plan_name: p.plan_name, price_eur: p.price_eur, billing_period: p.billing_period, per_unit: p.per_unit }));
    return {
      id: r.software.id, slug: r.software.slug, name: r.software.name, tagline: r.software.tagline,
      categorySlug: c.slug, categoryName: c.name, rank: r.rank, score: r.overall, criteria: r.criteria,
      targetSizes: factValue<string[]>(f, "target_sizes") ?? [], multiEntity: factValue<boolean>(f, "multi_entity"),
      freePlan: factValue<boolean>(f, "free_plan"), hosting: factValue<string>(f, "hosting"), bankConnections: factValue<number>(f, "bank_connections"),
      integrations: integ.get(r.software.id) ?? [], plans, entry: entryMonthlyPrice(plans), testedAt: r.testedAt,
    };
  });

  // Prestataires : annuaires publiés de l'univers (sans classement)
  const providers = (await Promise.all(categories.filter((c) => c.kind === "provider").map(async (c) => (await getProviders(c.id)).map((p) => ({
    slug: p.slug, name: p.name, city: p.city, metierSlug: c.slug, metierName: c.name,
    regulated: p.regulated_profession, verified: p.verification_status === "verified", specialties: p.specialties ?? [],
  }))))).flat();

  // Contenus publiés rattachés aux catégories de l'univers
  const catIds = new Set(categories.map((c) => c.id));
  const content = await listContent(siteId, { types: ["pillar", "guide", "category_ranking", "duel", "alternatives", "pricing", "facet_landing"], limit: 200 });
  const related = content.filter((x) => x.category_id && catIds.has(x.category_id)).map((x) => ({ path: x.path!, h1: x.h1!, type: x.type! }));

  const entries = tools.map((t) => t.entry).filter((v): v is number => v != null);
  return {
    vertical, categories, tools, providers, related,
    kpis: {
      tested: tools.length, providers: providers.length, medianEntry: median(entries),
      minEntry: entries.length ? Math.min(...entries) : null, maxEntry: entries.length ? Math.max(...entries) : null,
      best: tools[0] ?? null,
    },
  };
});

/** Tous les univers et leurs catégories publiées (assistant « Trouver une solution »). */
export const loadAllUniverses = cache(async (siteId: string) => {
  const verticals = await listVerticals(siteId);
  return (await Promise.all(verticals.map((v) => loadUniverse(siteId, v.slug)))).filter((u): u is UniverseData => !!u);
});
