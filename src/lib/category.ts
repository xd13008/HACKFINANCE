import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { getCategory, getFacts, getPricing, listContent, type Category, type Criterion, type PricingPlan } from "@/lib/data";
import { listVerticals, loadToolCards, type ToolCard } from "@/lib/universe";

/**
 * Page catégorie à onglets (maquette, écrans 2, 13 et 14) : uniquement des données validées
 * (classement issu des tests, faits et prix sourcés). Aucune note pour une solution non testée.
 */

export type BlockLevel = "inclus" | "option" | "absent";
export type CategoryBlock = { code: string; label: string; why: string | null; advice: string | null };
export type BlockFact = { level: BlockLevel; how: string | null; plan: string | null; source_url: string; collected_at: string };

export type CategoryHub = {
  category: Category;
  vertical: { slug: string; name: string } | null;
  criteria: Criterion[];
  tools: ToolCard[];
  /** Logiciels publiés de la catégorie, pas encore testés : référencés, sans note. */
  referenced: { slug: string; name: string; tagline: string | null }[];
  plans: Map<string, PricingPlan[]>;
  setupFees: Map<string, number>;
  blocks: CategoryBlock[];
  blockFacts: Map<string, Map<string, BlockFact>>; // logiciel → code du bloc → constat
  duels: { path: string; h1: string }[];
  alternatives: { path: string; h1: string }[];
  providerCategories: { slug: string; name: string }[];
};

const db = () => publicClient();
/** Nombre de solutions testées à partir duquel un onglet est indexable (en dessous : page pauvre, noindex). */
export const MIN_TESTED_INDEXABLE = 3;

export const loadCategoryHub = cache(async (siteId: string, slug: string): Promise<CategoryHub | null> => {
  const category = await getCategory(siteId, slug);
  if (!category || category.kind !== "software") return null;
  const [verticals, tools, { data: links }, { data: blocks }, { data: provCats }, content] = await Promise.all([
    listVerticals(siteId),
    loadToolCards([category]),
    db().from("software_categories").select("software_id").eq("category_id", category.id),
    db().from("category_blocks").select("code,label,why,advice,sort").eq("category_id", category.id).order("sort"),
    category.vertical_id
      ? db().from("categories").select("slug,name").eq("site_id", siteId).eq("vertical_id", category.vertical_id).eq("kind", "provider").eq("status", "published").order("sort")
      : Promise.resolve({ data: [] as { slug: string; name: string }[] }),
    listContent(siteId, { types: ["duel", "alternatives"], limit: 500 }),
  ]);
  const testedIds = new Set(tools.map((t) => t.id));
  const otherIds = (links ?? []).map((l) => l.software_id).filter((id) => !testedIds.has(id));
  const { data: others } = otherIds.length
    ? await db().from("software").select("slug,name,tagline").in("id", otherIds).eq("status", "published").order("name")
    : { data: [] };
  const ids = tools.map((t) => t.id);
  const [plans, facts] = await Promise.all([getPricing(ids), getFacts(ids)]);
  const blockFacts = new Map<string, Map<string, BlockFact>>();
  const setupFees = new Map<string, number>();
  for (const [sid, m] of facts) {
    const bm = new Map<string, BlockFact>();
    for (const [type, f] of m) {
      if (type.startsWith("bloc_")) {
        const v = (f.value ?? {}) as { level?: BlockLevel; how?: string; plan?: string };
        if (v.level === "inclus" || v.level === "option" || v.level === "absent") {
          bm.set(type.slice(5), { level: v.level, how: v.how ?? null, plan: v.plan ?? null, source_url: f.source_url, collected_at: f.collected_at });
        }
      }
      if (type === "setup_fee" && typeof f.value === "number") setupFees.set(sid, f.value);
    }
    blockFacts.set(sid, bm);
  }
  const vertical = verticals.find((v) => v.id === category.vertical_id);
  const toolIds = new Set(ids);
  return {
    category, vertical: vertical ? { slug: vertical.slug, name: vertical.name } : null,
    criteria: (category.criteria ?? []) as Criterion[], tools, referenced: others ?? [], plans, setupFees,
    blocks: (blocks ?? []).map(({ code, label, why, advice }) => ({ code, label, why, advice })), blockFacts,
    duels: content.filter((c) => c.type === "duel" && (c.category_id === category.id || (c.software_id && toolIds.has(c.software_id)))).map((c) => ({ path: c.path!, h1: c.h1! })),
    alternatives: content.filter((c) => c.type === "alternatives" && c.software_id && toolIds.has(c.software_id)).map((c) => ({ path: c.path!, h1: c.h1! })),
    providerCategories: provCats ?? [],
  };
});

/** Note pondérée selon les poids choisis (0 à 10 par critère) ; repli sur la note de la rédaction. */
export function weightedScore(criteria: Record<string, number>, weights: Record<string, number>, fallback: number): number {
  const keys = Object.keys(weights).filter((k) => weights[k] > 0 && typeof criteria[k] === "number");
  const total = keys.reduce((a, k) => a + weights[k], 0);
  return total ? keys.reduce((a, k) => a + weights[k] * criteria[k], 0) / total : fallback;
}

/** Poids par défaut de la rédaction (pondération de la grille de la catégorie), sur 10. */
export function defaultWeights(criteria: Criterion[]): Record<string, number> {
  const max = Math.max(1, ...criteria.map((c) => c.weight));
  return Object.fromEntries(criteria.map((c) => [c.key, Math.max(1, Math.round((c.weight / max) * 10))]));
}

/** Phrase clé d'une catégorie (chiffres calculés sur les données validées, sans texte rédigé). */
export function categoryKeyFact(hub: CategoryHub, today = new Date()): string {
  const n = hub.tools.length;
  const date = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (!n) return `Au ${date}, aucune solution de cette catégorie n'a encore terminé son test : ${hub.referenced.length} solution(s) référencée(s), sans note.`;
  const best = hub.tools[0];
  const entries = hub.tools.map((t) => t.entry).filter((v): v is number => v != null);
  const price = entries.length ? ` Prix d'entrée de ${Math.min(...entries)} à ${Math.max(...entries)} € HT par mois.` : "";
  return `Au ${date}, ${n} solution(s) testée(s) par la rédaction. Meilleure note : ${best.name} (${best.score.toFixed(1).replace(".", ",")}/10).${price}`;
}
