import { z } from "zod";
import type { Db, AgentResult } from "./runner";
import type { Llm } from "./llm";
import { asDocument, htmlToText, isAllowedUrl } from "./text";
import { VEILLE_SYSTEM } from "./prompts";

export const VeilleOutput = z.object({
  changes: z.array(z.object({
    fact_type: z.string().describe("Type de fait en snake_case, ex. free_plan, min_price_eur, bank_connections"),
    previous_value: z.string().describe("Valeur publiée actuellement (JSON), ou chaîne vide si nouveau fait"),
    new_value_json: z.string().describe("Nouvelle valeur au format JSON (true, 19, \"texte\", [...])"),
    source_url: z.string(),
    excerpt: z.string().describe("Extrait exact de la page qui prouve le changement"),
    confidence: z.enum(["high", "medium", "low"]),
  })),
});

export type Fetcher = (url: string) => Promise<string>;

export const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url, {
    headers: { "user-agent": "PortailsMediaVeille/1.0 (+veille éditoriale)", accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder().decode(buf.slice(0, 600_000));
};

/** Veille d'un logiciel : relit les pages sources de ses faits et propose des faits en brouillon + une alerte. */
export async function veilleSoftware(
  deps: { db: Db; llm: Llm; settings: { allowed_domains: string[] }; fetcher?: Fetcher },
  softwareId: string,
): Promise<AgentResult> {
  const { db, llm } = deps;
  const fetcher = deps.fetcher ?? defaultFetcher;
  const { data: sw } = await db.from("software").select("id,name,website,is_fictional").eq("id", softwareId).single();
  if (!sw) throw new Error("Logiciel introuvable");
  const [{ data: facts }, { data: plans }] = await Promise.all([
    db.from("software_facts").select("fact_type,value,source_url").eq("software_id", softwareId).eq("status", "validated"),
    db.from("pricing_plans").select("plan_name,price_eur,billing_period,source_url").eq("software_id", softwareId).eq("status", "validated"),
  ]);
  const urls = [...new Set([...(facts ?? []).map((f) => f.source_url), ...(plans ?? []).map((p) => p.source_url)])]
    .filter((u) => isAllowedUrl(u, deps.settings.allowed_domains, sw.website));
  if (!urls.length) return { summary: `${sw.name} : aucune source autorisée à surveiller`, output: { checked: 0 } };

  const pages: string[] = [];
  const failures: string[] = [];
  for (const u of urls.slice(0, 5)) {
    try { pages.push(asDocument(u, htmlToText(await fetcher(u), 15_000))); } catch (e) { failures.push(`${u} : ${(e as Error).message}`); }
  }
  if (!pages.length) return { summary: `${sw.name} : sources injoignables`, output: { failures } };

  const { data } = await llm({
    system: VEILLE_SYSTEM,
    effort: "low",
    maxTokens: 8000,
    schema: VeilleOutput,
    user: `Logiciel : ${sw.name}\n\nFaits publiés (JSON) :\n${JSON.stringify(facts)}\n\nOffres publiées :\n${JSON.stringify(plans)}\n\nPages relevées aujourd'hui :\n${pages.join("\n\n")}`,
  });

  const { data: { user } } = await db.auth.getUser();
  const accepted = data.changes.filter((c) => urls.includes(c.source_url) && c.excerpt.trim().length > 0 && /^[a-z0-9_]+$/.test(c.fact_type));
  for (const c of accepted) {
    let value: unknown;
    try { value = JSON.parse(c.new_value_json); } catch { value = c.new_value_json; }
    const { error } = await db.from("software_facts").insert({
      software_id: softwareId, fact_type: c.fact_type, value: value as never, source_url: c.source_url,
      status: "draft", author_kind: "agent", created_by: user!.id,
      note: `Veille (${c.confidence}) : « ${c.excerpt.slice(0, 300)} » — avant : ${c.previous_value || "∅"}`,
    });
    if (error) throw new Error(`Écriture du fait impossible : ${error.message}`);
  }
  if (accepted.length) {
    const { error } = await db.from("review_tasks").insert({
      kind: "veille", software_id: softwareId, created_by: user!.id,
      reason: `Veille : ${accepted.length} changement(s) détecté(s) sur ${sw.name}`,
      details: { changes: accepted, failures } as never,
    });
    if (error) throw new Error(`Création de l'alerte impossible : ${error.message}`);
  }
  return { summary: `${sw.name} : ${accepted.length} changement(s) proposé(s)`, output: { software_id: softwareId, changes: accepted.length, failures } };
}
