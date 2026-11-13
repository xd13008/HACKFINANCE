import { serviceClient } from "@/lib/supabase/service";
import { fetchFinanceOffers } from "@/lib/francetravail";
import { runJobReview } from "@/lib/agents";
import { settleJobDecisions } from "@/lib/jobs-settle";

export type JobsReport = {
  fetched?: number; finance?: number; upserted?: number; importError?: string;
  agent?: { status: string; summary: string; costUsd?: number };
  settle?: Awaited<ReturnType<typeof settleJobDecisions>>;
};

/**
 * Chaîne des offres d'emploi (tâche de nuit et bouton du back-office) :
 * 1. import France Travail (univers finance seulement) ; 2. vérification par l'agent ;
 * 3. remboursement des annonces payées refusées et e-mail unique au recruteur.
 */
export async function runJobsPipeline(days: 1 | 3 | 7 | 14 | 31, triggeredBy: string | null = null): Promise<JobsReport> {
  const db = serviceClient();
  const report: JobsReport = {};
  const { data: site } = await db.from("sites").select("id").eq("key", "daf").maybeSingle();
  if (!site) return { importError: "Portail daf introuvable" };
  try {
    const { rows, fetched } = await fetchFinanceOffers(days);
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await db.rpc("upsert_imported_jobs", { p_site: site.id, p_rows: rows.slice(i, i + 200) as never });
      if (error) throw new Error(error.message);
      upserted += data ?? 0;
    }
    Object.assign(report, { fetched, finance: rows.length, upserted });
  } catch (e) {
    report.importError = (e as Error).message;                 // l'agent vérifie quand même les annonces payées en attente
  }
  try {
    const r = await runJobReview({ triggeredBy });
    report.agent = { status: r.status, summary: r.summary, costUsd: Number(r.costUsd.toFixed(4)) };
  } catch (e) {
    report.agent = { status: "failed", summary: (e as Error).message };
  }
  report.settle = await settleJobDecisions(db);
  return report;
}
