import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { publicClient } from "@/lib/supabase/public";
import { siteKeyForHost } from "@/lib/sites";
import { serviceClient } from "@/lib/supabase/service";
import { getSite } from "@/lib/data";
import { CONSENT_COOKIE, personalisationAccepted, VISITOR_COOKIE } from "@/lib/members";

const BOT = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|python-requests|curl|wget/i;
const uuid = z.string().uuid().nullish();

const schema = z.object({
  site: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["pageview", "outbound_click", "sponsored_impression", "form_submit", "simulator_use", "resource_download", "scroll_depth"]),
  path: z.string().startsWith("/").max(500),
  pageType: z.string().max(50).nullish(),
  rubrique: z.string().max(100).nullish(),
  categoryId: uuid,
  entityId: uuid,
  placementId: uuid,
  linkKind: z.enum(["editorial", "affiliate", "sponsored"]).nullish(),
  referrer: z.string().max(1000).nullish(),
  utm: z.object({ source: z.string().max(100).nullish(), medium: z.string().max(100).nullish(), campaign: z.string().max(100).nullish() }).partial().nullish(),
  props: z.record(z.string(), z.unknown()).nullish(),
});

function device(ua: string) {
  if (BOT.test(ua)) return "bot";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Collecte d'audience sans cookie : identifiant de session = hachage (IP, user-agent, portail, jour, sel secret).
 * Ni l'IP ni l'user-agent ne sont stockés ; le hachage change chaque jour.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = JSON.parse(await req.text()); } catch { return new NextResponse(null, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;

  // Le portail déclaré doit correspondre au domaine appelant.
  if (siteKeyForHost(req.headers.get("host")) !== e.site) return new NextResponse(null, { status: 204 });

  const ua = req.headers.get("user-agent") ?? "";
  const dev = device(ua);
  if (dev === "bot" || req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return new NextResponse(null, { status: 204 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT ?? "";
  const session = createHash("sha256").update(`${salt}|${day}|${e.site}|${ip}|${ua}`).digest("hex").slice(0, 32);

  let referrerHost: string | null = null;
  try {
    if (e.referrer) {
      const h = new URL(e.referrer).hostname;
      if (h !== (req.headers.get("host") ?? "").split(":")[0]) referrerHost = h;
    }
  } catch { /* référent invalide ignoré */ }

  await publicClient().rpc("record_event", {
    p_site_key: e.site, p_session_hash: session, p_event_type: e.type, p_path: e.path,
    p_page_type: e.pageType ?? undefined, p_rubrique: e.rubrique ?? undefined, p_category_id: e.categoryId ?? undefined,
    p_entity_id: e.entityId ?? undefined, p_placement_id: e.placementId ?? undefined, p_link_kind: e.linkKind ?? undefined,
    p_referrer_host: referrerHost ?? undefined, p_utm_source: e.utm?.source ?? undefined, p_utm_medium: e.utm?.medium ?? undefined,
    p_utm_campaign: e.utm?.campaign ?? undefined, p_device: dev, p_props: (e.props ?? {}) as never,
  });

  // Personnalisation acceptée : la page vue est aussi rattachée au navigateur (et au compte s'il est inscrit).
  const vid = req.cookies.get(VISITOR_COOKIE)?.value;
  if (vid && /^[0-9a-f-]{36}$/.test(vid) && personalisationAccepted(req.cookies.get(CONSENT_COOKIE)?.value)
      && e.type !== "sponsored_impression" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = serviceClient();
    const site = await getSite(e.site);
    const { data: v } = site
      ? await db.from("visitors").update({ last_seen_at: new Date().toISOString() }).eq("id", vid).eq("site_id", site.id).select("id").maybeSingle()
      : { data: null };
    if (v) await db.from("visitor_events").insert({
      visitor_id: v.id, event_type: e.type, path: e.path, page_type: e.pageType ?? null,
      category_id: e.categoryId ?? null, entity_id: e.entityId ?? null,
      props: e.type === "outbound_click" ? { href: String((e.props as { href?: unknown } | null)?.href ?? "").slice(0, 300) } : {},
    });
  }
  return new NextResponse(null, { status: 204 });
}
