import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { slugify } from "@/lib/jobs";

/**
 * Maquette, écran 7 : « Compatible avec mon outil ». Connecteurs référencés (table integrations, avec source),
 * logiciels publiés, intégrateurs (spécialités déclarées) et cabinets dont la grille de lecture vérifiée cite l'outil.
 */
export type IntegrationTool = { slug: string; name: string; software: number; integrators: number };
export const KIND_LABEL: Record<string, string> = { native: "Connexion native", api: "API à paramétrer", connector: "Via connecteur" };
const GENERIC = /^(api|api rest|api publique|webhooks?|sftp|csv|export csv|erp link)$/i;
const db = () => publicClient();

export const listIntegrationTools = cache(async (siteId: string): Promise<IntegrationTool[]> => {
  const [{ data: integ }, { data: integrators }] = await Promise.all([
    db().from("integrations").select("software_id,name"),
    integratorsQuery(siteId),
  ]);
  const { data: sw } = await db().from("software").select("id").eq("status", "published").in("id", [...new Set((integ ?? []).map((i) => i.software_id))]);
  const published = new Set((sw ?? []).map((s) => s.id));
  const tools = new Map<string, IntegrationTool>();
  const add = (name: string, k: "software" | "integrators") => {
    if (GENERIC.test(name.trim())) return;
    const slug = slugify(name);
    const t = tools.get(slug) ?? { slug, name, software: 0, integrators: 0 };
    t[k]++;
    tools.set(slug, t);
  };
  for (const i of integ ?? []) if (published.has(i.software_id)) add(i.name, "software");
  for (const p of integrators ?? []) for (const s of p.specialties ?? []) add(s, "integrators");
  return [...tools.values()].sort((a, b) => b.software + b.integrators - (a.software + a.integrators) || a.name.localeCompare(b.name, "fr"));
});

async function integratorsQuery(siteId: string) {
  const { data: cat } = await db().from("categories").select("id").eq("site_id", siteId).eq("slug", "integrateurs-comptables").eq("status", "published").maybeSingle();
  return cat ? db().from("providers_by_category").select("slug,name,city,specialties,verification_status").eq("category_id", cat.id) : { data: [] as { slug: string | null; name: string | null; city: string | null; specialties: string[] | null; verification_status: string | null }[] };
}

export async function loadIntegrationTool(siteId: string, slug: string) {
  const tools = await listIntegrationTools(siteId);
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return null;
  const [{ data: integ }, { data: integrators }, { data: cats }] = await Promise.all([
    db().from("integrations").select("software_id,name,kind,source_url"),
    integratorsQuery(siteId),
    db().from("categories").select("id,slug,name").eq("site_id", siteId).eq("kind", "software").eq("status", "published"),
  ]);
  const matching = (integ ?? []).filter((i) => slugify(i.name) === slug);
  const ids = [...new Set(matching.map((m) => m.software_id))];
  const [{ data: sw }, { data: links }, { data: ranks }] = await Promise.all([
    ids.length ? db().from("software").select("id,slug,name,tagline").in("id", ids).eq("status", "published") : Promise.resolve({ data: [] }),
    ids.length ? db().from("software_categories").select("software_id,category_id").in("software_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db().from("editorial_rankings").select("software_id,overall_score").in("software_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const catById = new Map((cats ?? []).map((c) => [c.id, c]));
  const software = (sw ?? []).map((s) => {
    const m = matching.find((x) => x.software_id === s.id)!;
    const cat = (links ?? []).map((l) => (l.software_id === s.id ? catById.get(l.category_id) : undefined)).find(Boolean);
    const score = (ranks ?? []).filter((r) => r.software_id === s.id).map((r) => Number(r.overall_score)).sort((a, b) => b - a)[0];
    return { ...s, kind: m.kind, source: m.source_url, category: cat ?? null, score: score ?? null };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "fr"));
  const experts = (integrators ?? []).filter((p) => (p.specialties ?? []).some((s) => slugify(s) === slug))
    .sort((a, b) => Number(b.verification_status === "verified") - Number(a.verification_status === "verified") || (a.name ?? "").localeCompare(b.name ?? "", "fr"));
  // Cabinets dont la grille de lecture vérifiée cite l'outil (critère « logiciels maîtrisés »)
  const { data: firms } = await db().from("provider_facts").select("provider_id").eq("criterion", "logiciels").eq("status", "validated").contains("value", JSON.stringify([slug]));
  const firmIds = (firms ?? []).map((f) => f.provider_id);
  const { data: firmRows } = firmIds.length ? await db().from("providers_by_category").select("slug,name,city,category_id").in("id", firmIds) : { data: [] };
  const firmCats = new Map((await db().from("categories").select("id,slug,name").in("id", [...new Set((firmRows ?? []).map((f) => f.category_id!))])).data?.map((c) => [c.id, c]) ?? []);
  const seen = new Set<string>();
  const cabinets = (firmRows ?? []).filter((f) => (seen.has(f.slug!) ? false : (seen.add(f.slug!), true))).map((f) => ({ slug: f.slug!, name: f.name!, city: f.city, category: firmCats.get(f.category_id!) }));
  return { tool, software, experts, cabinets };
}
