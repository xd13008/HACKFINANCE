import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/supabase/service";
import { runJobsPipeline } from "@/lib/jobs-pipeline";

export const maxDuration = 300;

/** Tâche quotidienne : import France Travail, vérification par l'agent, remboursements et e-mails. ?jours=31 possible. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const days = Number(new URL(req.url).searchParams.get("jours") ?? 3);
  const report = await runJobsPipeline(([1, 3, 7, 14, 31].includes(days) ? days : 3) as 1 | 3 | 7 | 14 | 31);
  return NextResponse.json(report, { status: report.importError && report.agent?.status === "failed" ? 500 : 200 });
}
