import { NextResponse } from "next/server";
import { runScheduled } from "@/lib/agents";
import { isAuthorizedCron } from "@/lib/supabase/service";

export const maxDuration = 300;

/** Tâche hebdomadaire : veille des logiciels réels et contrôle qualité des versions soumises. Plafonds appliqués par agent. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ skipped: "ANTHROPIC_API_KEY non configurée" });
  return NextResponse.json(await runScheduled());
}
