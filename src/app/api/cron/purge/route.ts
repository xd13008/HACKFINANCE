import { NextResponse } from "next/server";
import { isAuthorizedCron, serviceClient } from "@/lib/supabase/service";

/** Tâche quotidienne : durées de conservation (audience 25 mois ; comptes, navigation et consentements : voir purge_member_data ; Challenger et mises en relation : 3 ans). */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const db = serviceClient();
  const [members, analytics, jobs, leads] = await Promise.all([db.rpc("purge_member_data"), db.rpc("purge_analytics"), db.rpc("expire_jobs"), db.rpc("purge_lead_data")]);
  return NextResponse.json({ members: members.data ?? members.error?.message, analytics: analytics.data ?? analytics.error?.message, expiredJobs: jobs.data ?? jobs.error?.message, leads: leads.data ?? leads.error?.message });
}
