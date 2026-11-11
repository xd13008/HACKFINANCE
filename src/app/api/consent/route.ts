import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { siteKeyForHost } from "@/lib/sites";
import { getSite } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/service";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, CONSENT_VERSION, cookieOpts, VISITOR_COOKIE } from "@/lib/members";

const schema = z.object({ personalisation: z.boolean() });

/**
 * Choix du bandeau cookies. Accepté : un identifiant de navigateur (rf_vid) est créé pour 6 mois.
 * Refusé ou retiré : l'identifiant est supprimé, et la navigation non rattachée à un compte est effacée.
 * Chaque choix est journalisé sans donnée identifiante (preuve du consentement).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const site = await getSite(siteKeyForHost(req.headers.get("host")));
  if (!site) return new NextResponse(null, { status: 404 });

  const db = serviceClient();
  const on = parsed.data.personalisation;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CONSENT_COOKIE, `${CONSENT_VERSION}.${on ? 1 : 0}`, cookieOpts(CONSENT_MAX_AGE, false));
  const previous = req.cookies.get(VISITOR_COOKIE)?.value;
  const validPrevious = previous && /^[0-9a-f-]{36}$/.test(previous) ? previous : null;
  const now = new Date().toISOString();
  let visitorId: string | null = null;

  if (on) {
    const choices = { personalisation: true };
    const { data: kept } = validPrevious
      ? await db.from("visitors").update({ consent: choices, consent_version: CONSENT_VERSION, consented_at: now, last_seen_at: now })
          .eq("id", validPrevious).eq("site_id", site.id).select("id").maybeSingle()
      : { data: null };
    visitorId = kept?.id ?? null;
    if (!visitorId) {
      const { data } = await db.from("visitors").insert({ site_id: site.id, consent: choices, consent_version: CONSENT_VERSION, consented_at: now })
        .select("id").single();
      visitorId = data?.id ?? null;
    }
    if (visitorId) res.cookies.set(VISITOR_COOKIE, visitorId, cookieOpts(CONSENT_MAX_AGE));
  } else {
    if (validPrevious) {
      // Sans compte : tout est effacé. Avec compte : on arrête la collecte, l'historique reste visible et supprimable dans « Mon espace ».
      await db.from("visitors").delete().eq("id", validPrevious).is("member_id", null);
      await db.from("visitors").update({ consent: { personalisation: false }, consented_at: now }).eq("id", validPrevious);
    }
    res.cookies.set(VISITOR_COOKIE, "", cookieOpts(0));
  }
  await db.from("consent_log").insert({ site_id: site.id, visitor_id: visitorId, choices: { personalisation: on }, version: CONSENT_VERSION });
  return res;
}
