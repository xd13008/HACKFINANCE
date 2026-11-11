import { claudeLlm, type Llm } from "./llm";
import { agentDb, runAgent, type Db } from "./runner";
import { veilleSoftware, type Fetcher } from "./veille";
import { draftContent } from "./redaction";
import { qualityCheck } from "./qc";
import { reviewJobs } from "./offres";

export type AgentDeps = { db?: Db; llm?: Llm; fetcher?: Fetcher; triggeredBy?: string | null };

async function deps(d: AgentDeps) {
  return { db: d.db ?? (await agentDb()), llm: d.llm ?? claudeLlm };
}

export async function runVeille(softwareId: string, d: AgentDeps = {}) {
  const { db, llm } = await deps(d);
  return runAgent("veille", { db, llm, targetId: softwareId, triggeredBy: d.triggeredBy, input: { software_id: softwareId } },
    (w) => veilleSoftware({ ...w, fetcher: d.fetcher }, softwareId));
}

export async function runRedaction(contentItemId: string, d: AgentDeps = {}) {
  const { db, llm } = await deps(d);
  return runAgent("redaction", { db, llm, targetId: contentItemId, triggeredBy: d.triggeredBy, input: { content_item_id: contentItemId } },
    (w) => draftContent(w, contentItemId));
}

export async function runQualityCheck(versionId: string, d: AgentDeps = {}) {
  const { db, llm } = await deps(d);
  return runAgent("controle_qualite", { db, llm, targetId: versionId, triggeredBy: d.triggeredBy, input: { version_id: versionId } },
    (w) => qualityCheck(w, versionId));
}

/** Tâche planifiée : veille de tous les logiciels publiés (réels), contrôle qualité des versions soumises sans rapport. */
export async function runScheduled(d: AgentDeps = {}) {
  const { db, llm } = await deps(d);
  const results: { agent: string; target: string; status: string; summary: string }[] = [];
  const { data: sw } = await db.from("software").select("id,name").eq("status", "published").eq("is_fictional", false);
  for (const s of sw ?? []) {
    const r = await runVeille(s.id, { db, llm, fetcher: d.fetcher });
    results.push({ agent: "veille", target: s.name, status: r.status, summary: r.summary });
    if (r.summary.startsWith("Plafond")) break;
  }
  const { data: pending } = await db.from("content_versions").select("id").eq("status", "submitted");
  const { data: reports } = await db.from("review_tasks").select("content_version_id").eq("kind", "qa_report");
  const done = new Set((reports ?? []).map((r) => r.content_version_id));
  for (const v of (pending ?? []).filter((x) => !done.has(x.id))) {
    const r = await runQualityCheck(v.id, { db, llm });
    results.push({ agent: "controle_qualite", target: v.id, status: r.status, summary: r.summary });
    if (r.summary.startsWith("Plafond")) break;
  }
  return results;
}

/** Vérification des offres d'emploi en attente (annonces payantes et France Travail). */
export async function runJobReview(d: AgentDeps & { limit?: number } = {}) {
  const { db, llm } = await deps(d);
  return runAgent("verification_offres", { db, llm, triggeredBy: d.triggeredBy, input: { limit: d.limit ?? 200 } },
    (w) => reviewJobs(w, d.limit ?? 200));
}
