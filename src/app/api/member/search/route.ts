import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { siteKeyForHost } from "@/lib/sites";
import { getSite } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/service";
import { consentingVisitor, learnStack, SIZES } from "@/lib/members";

const slug = z.string().regex(/^[a-z0-9-]{1,100}$/);
const schema = z.object({
  size: z.string().regex(/^[a-z0-9]{1,20}$/).nullish(),
  stack: z.array(z.string().trim().min(1).max(120)).max(40),
  universe: slug.nullish(),
  need: slug.nullish(),
  results: z.array(slug).max(20),
});

/** Recherche faite dans « Trouver » : enregistrée seulement si le cookie de personnalisation est accepté. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const site = await getSite(siteKeyForHost(req.headers.get("host")));
  const visitor = site ? await consentingVisitor(site.id) : null;
  if (!visitor) return new NextResponse(null, { status: 204 });
  const d = parsed.data;
  await serviceClient().from("visitor_searches").insert({
    visitor_id: visitor.id, company_size: d.size ?? null, stack: d.stack, universe_slug: d.universe ?? null,
    need_slug: d.need ?? null, result_slugs: d.results,
  });
  if (visitor.member_id) {
    await learnStack(visitor.member_id, d.stack);
    if (d.size && SIZES.some(([k]) => k === d.size)) await serviceClient().from("members").update({ company_size: d.size }).eq("id", visitor.member_id).is("company_size", null);
  }
  return new NextResponse(null, { status: 204 });
}
