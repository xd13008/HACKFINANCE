import { NextResponse, type NextRequest } from "next/server";
import { getSite } from "@/lib/data";
import { search, type SearchHit } from "@/lib/search";

/** Suggestions de recherche (parcours Challenger, recherche complète) : lecture publique, réponses mises en cache 5 minutes. */
export async function GET(req: NextRequest) {
  const site = await getSite(req.nextUrl.searchParams.get("site") ?? process.env.DEFAULT_SITE_KEY ?? "daf");
  if (!site) return NextResponse.json({ hits: [] }, { status: 404 });
  const kinds = req.nextUrl.searchParams.get("types")?.split(",").filter((k): k is SearchHit["kind"] => ["software", "provider", "category", "content"].includes(k));
  const hits = await search(site.id, req.nextUrl.searchParams.get("q") ?? "", { kinds, limit: 8 });
  return NextResponse.json({ hits }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
