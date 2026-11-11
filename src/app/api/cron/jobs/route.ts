import { NextResponse } from "next/server";
import { isAuthorizedCron, serviceClient } from "@/lib/supabase/service";
import { fetchFinanceOffers } from "@/lib/francetravail";
import { runJobReview } from "@/lib/agents";
import { settleJobDecisions } from "@/lib/jobs-settle";

export const maxDuration = 300;

/**
 * Tâche quotidienne : 1. import des offres finance de France Travail (univers finance seulement) ;
 * 2. vérification par l'agent des offres en attente (annonces payées et France Travail) ;
 * 3. remboursement des annonces payées refusées et e-mail au recruteur. ?jours=31 pour le premier import.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const days = Number(new URL(req.url).searchParams.get("jours") ?? 3);
  const db = serviceClient();
  const { data: site } = await db.from("sites").select("id").eq("key", "daf").maybeSingle();
  if (!site) return NextResponse.json({ error: "Portail daf introuvable" }, { status: 404 });
  const report: Record<string, unknown> = {};
  try {
    const { rows, fetched } = await fetchFinanceOffers(([1, 3, 7, 14, 31].includes(days) ? days : 3) as 1 | 3 | 7 | 14 | 31);
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
    const r = await runJobReview({ triggeredBy: null });
    report.agent = { status: r.status, summary: r.summary, costUsd: Number(r.costUsd.toFixed(4)) };
  } catch (e) {
    report.agent = { status: "failed", summary: (e as Error).message };
  }
  report.settle = await settleJobDecisions(db);
  return NextResponse.json(report, { status: report.importError && (report.agent as { status: string }).status === "failed" ? 500 : 200 });
}
