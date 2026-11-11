import { NextResponse } from "next/server";
import { getSite } from "@/lib/data";
import { currentMember, memberData } from "@/lib/members";

/** Droit d'accès et de portabilité : toutes les données du compte, au format JSON. */
export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  const m = site ? await currentMember(site.id) : null;
  if (!m) return new NextResponse("Connexion requise", { status: 401 });
  const data = await memberData(m.id);
  return new NextResponse(JSON.stringify({ exporte_le: new Date().toISOString(), ...data }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="mes-donnees-${site!.key}.json"`, "cache-control": "no-store" },
  });
}
