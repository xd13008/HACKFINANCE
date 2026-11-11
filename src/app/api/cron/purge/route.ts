import { NextResponse } from "next/server";
import { isAuthorizedCron, serviceClient } from "@/lib/supabase/service";

/** Tâche quotidienne : durées de conservation (audience 25 mois ; comptes, navigation et consentements : voir purge_member_data). */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const db = serviceClient();
  const [members, analytics] = await Promise.all([db.rpc("purge_member_data"), db.rpc("purge_analytics")]);
  return NextResponse.json({ members: members.data ?? members.error?.message, analytics: analytics.data ?? analytics.error?.message });
}
