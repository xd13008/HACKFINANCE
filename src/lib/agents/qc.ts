import { z } from "zod";
import type { Db, AgentResult } from "./runner";
import type { Llm } from "./llm";
import { asDocument } from "./text";
import { QC_SYSTEM } from "./prompts";

export const QcOutput = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    type: z.enum(["missing_source", "contradiction", "forbidden_advice", "unsupported_test", "commercial_bias"]),
    severity: z.enum(["blocking", "warning"]),
    excerpt: z.string(),
    explanation: z.string(),
  })),
});

const ALWAYS_BLOCKING = new Set(["forbidden_advice", "unsupported_test"]);

/** Relit une version et joint un rapport à la décision humaine. Un problème bloquant empêche l'approbation tant qu'il est ouvert. */
export async function qualityCheck(deps: { db: Db; llm: Llm }, versionId: string): Promise<AgentResult> {
  const { db, llm } = deps;
  const { data: v } = await db.from("content_versions").select("*").eq("id", versionId).single();
  if (!v) throw new Error("Version introuvable");
  const { data: item } = await db.from("content_items").select("id,site_id,type,path,software_id,software_b_id").eq("id", v.content_item_id).single();
  const ids = [item?.software_id, item?.software_b_id].filter(Boolean) as string[];
  const [{ data: sources }, { data: facts }, { data: tests }] = await Promise.all([
    db.from("content_sources").select("url,title,accessed_at,excerpt").eq("content_version_id", v.id),
    ids.length ? db.from("software_facts").select("software_id,fact_type,value,source_url").in("software_id", ids).eq("status", "validated") : Promise.resolve({ data: [] }),
    ids.length ? db.from("test_runs").select("software_id,tested_at,verdict").in("software_id", ids).eq("status", "validated") : Promise.resolve({ data: [] }),
  ]);

  const { data } = await llm({
    system: QC_SYSTEM,
    effort: "medium",
    maxTokens: 8000,
    schema: QcOutput,
    user: [
      asDocument("brouillon", `# ${v.h1}\n\nTitle : ${v.meta_title}\nDescription : ${v.meta_description}\n\n${v.summary}\n\n${v.body}\n\nFAQ : ${JSON.stringify(v.faq)}`),
      asDocument("sources-declarees", JSON.stringify(sources ?? [])),
      asDocument("faits-valides", JSON.stringify(facts ?? [])),
      asDocument("tests-valides", JSON.stringify(tests ?? [])),
      `Type de page : ${item?.type}. Rédigé par : ${v.author_kind}.`,
    ].join("\n\n"),
  });

  const issues = data.issues.map((i) => ({ ...i, severity: ALWAYS_BLOCKING.has(i.type) ? "blocking" : i.severity }));
  const blocking = issues.some((i) => i.severity === "blocking");
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from("review_tasks").insert({
    site_id: item?.site_id, kind: "qa_report", content_item_id: item?.id, content_version_id: v.id, created_by: user!.id,
    blocking,
    reason: issues.length ? `Contrôle qualité : ${issues.length} point(s)${blocking ? ", dont bloquant(s)" : ""}` : "Contrôle qualité : aucun problème détecté",
    details: { summary: data.summary, issues } as never,
  });
  if (error) throw new Error(`Écriture du rapport impossible : ${error.message}`);
  return { summary: `${item?.path} : ${issues.length} point(s), ${blocking ? "bloquant" : "non bloquant"}`, output: { version_id: v.id, issues: issues.length, blocking } };
}
