import { NextResponse } from "next/server";
import { importGsc } from "@/lib/gsc";
import { isAuthorizedCron, serviceClient } from "@/lib/supabase/service";

export const maxDuration = 300;

/** Tâche quotidienne : import Search Console de tous les portails. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const db = serviceClient();
  const { data: sites } = await db.from("sites").select("id,key,gsc_property").not("gsc_property", "is", null);
  const results: Record<string, unknown> = {};
  for (const s of sites ?? []) {
    try { results[s.key] = await importGsc(db, s); } catch (e) { results[s.key] = { error: (e as Error).message }; }
  }
  return NextResponse.json(results);
}
