import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Import Google Search Console (API Search Analytics) via un compte de service Google.
 * GSC_SERVICE_ACCOUNT = JSON du compte de service (ajouté comme utilisateur « lecture » de chaque propriété).
 */
type ServiceAccount = { client_email: string; private_key: string };
type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

function b64url(s: string | Buffer) {
  return Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { return JSON.parse(raw) as ServiceAccount; } catch { throw new Error("GSC_SERVICE_ACCOUNT : JSON invalide"); }
}

export async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const signature = b64url(createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Jeton Google refusé (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export function toPath(page: string): string {
  try { return new URL(page).pathname.replace(/\/+$/, "") || "/"; } catch { return page; }
}

export async function fetchSearchAnalytics(token: string, property: string, startDate: string, endDate: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let startRow = 0; startRow < 250_000; startRow += 25_000) {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: ["date", "page", "query"], rowLimit: 25_000, startRow, dataState: "final" }),
    });
    if (!res.ok) throw new Error(`Search Console ${property} : HTTP ${res.status}`);
    const batch = ((await res.json()) as { rows?: Row[] }).rows ?? [];
    rows.push(...batch);
    if (batch.length < 25_000) break;
  }
  return rows;
}

/** Importe les N derniers jours d'un portail puis met à jour la position des mots-clés suivis. */
export async function importGsc(db: SupabaseClient<Database>, site: { id: string; gsc_property: string | null }, days = 5) {
  const sa = serviceAccount();
  if (!sa) throw new Error("GSC_SERVICE_ACCOUNT non configuré");
  if (!site.gsc_property) throw new Error("Propriété Search Console non renseignée pour ce portail");
  const end = new Date(Date.now() - 2 * 86400000); // données finales à J-2
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const token = await googleAccessToken(sa);
  const rows = await fetchSearchAnalytics(token, site.gsc_property, iso(start), iso(end));

  // Agrégation page × requête × jour (plusieurs URL peuvent donner le même chemin)
  const agg = new Map<string, { date: string; page: string; query: string; clicks: number; impressions: number; posw: number }>();
  for (const r of rows) {
    const [date, page, query] = r.keys;
    const key = `${date}|${toPath(page)}|${query}`;
    const a = agg.get(key) ?? { date, page: toPath(page), query, clicks: 0, impressions: 0, posw: 0 };
    a.clicks += r.clicks; a.impressions += r.impressions; a.posw += r.position * r.impressions;
    agg.set(key, a);
  }
  const records = [...agg.values()].map((a) => ({
    site_id: site.id, date: a.date, page: a.page, query: a.query.slice(0, 500), clicks: a.clicks, impressions: a.impressions,
    ctr: a.impressions ? Number((a.clicks / a.impressions).toFixed(4)) : 0, position: a.impressions ? Number((a.posw / a.impressions).toFixed(2)) : 0,
  }));
  for (let i = 0; i < records.length; i += 1000) {
    const { error } = await db.from("gsc_metrics").upsert(records.slice(i, i + 1000), { onConflict: "site_id,date,page,query" });
    if (error) throw new Error(error.message);
  }
  const { data: updated } = await db.rpc("refresh_keyword_positions", { p_site: site.id, p_days: 28 });
  return { rows: records.length, keywordsUpdated: Number(updated ?? 0), from: iso(start), to: iso(end) };
}
