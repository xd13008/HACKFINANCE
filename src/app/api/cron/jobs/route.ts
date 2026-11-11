import { NextResponse } from "next/server";
import { isAuthorizedCron, serviceClient } from "@/lib/supabase/service";
import { fetchFinanceOffers } from "@/lib/francetravail";

export const maxDuration = 300;

/**
 * Tâche quotidienne : import des offres finance de France Travail sur Radar Finances.
 * Nouvelles offres : en attente de relecture (publication par un éditeur, en masse possible). ?jours=31 pour le premier import.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const days = Number(new URL(req.url).searchParams.get("jours") ?? 3);
  const db = serviceClient();
  const { data: site } = await db.from("sites").select("id").eq("key", "daf").maybeSingle();
  if (!site) return NextResponse.json({ error: "Portail daf introuvable" }, { status: 404 });
  try {
    const { rows, fetched } = await fetchFinanceOffers(([1, 3, 7, 14, 31].includes(days) ? days : 3) as 1 | 3 | 7 | 14 | 31);
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await db.rpc("upsert_imported_jobs", { p_site: site.id, p_rows: rows.slice(i, i + 200) as never });
      if (error) throw new Error(error.message);
      upserted += data ?? 0;
    }
    return NextResponse.json({ fetched, finance: rows.length, upserted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
