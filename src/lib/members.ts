import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/service";

/**
 * DAF inscrits : sessions, consentement et rattachement de la navigation.
 * L'écriture passe par la clé de service, après contrôle du jeton : la base n'ouvre aucun droit à anon.
 */
export const CONSENT_COOKIE = "rf_consent";   // lisible par le navigateur : « v1.1 » (personnalisation acceptée) ou « v1.0 »
export const VISITOR_COOKIE = "rf_vid";       // identifiant du navigateur consentant (httpOnly)
export const SESSION_COOKIE = "rf_session";   // session du compte (httpOnly)
export const CONSENT_VERSION = "v1";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182;  // 6 mois, puis on redemande (recommandation CNIL)
const SESSION_DAYS = 90;

export const SIZES = [
  ["crea", "Création ou indépendant"], ["tpe", "TPE (1 à 9 salariés)"], ["pme1", "PME (10 à 49)"],
  ["pme2", "PME (50 à 249)"], ["eti", "ETI (250 à 4 999)"], ["ge", "Grande entreprise"],
] as const;
export const TEAM_SIZES = ["1", "2-5", "6-20", "21+"] as const;
export const HORIZONS = [["0-3", "Dans les 3 mois"], ["3-6", "3 à 6 mois"], ["6-12", "6 à 12 mois"], ["12+", "Plus tard"]] as const;
export const RELATIONS = [["uses", "Je l'utilise"], ["evaluating", "Je l'évalue"], ["knows", "Je le connais"], ["left", "Je l'ai quitté"]] as const;

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** « v1.1 » → true ; tout autre valeur (absente, ancienne version, refus) → false. */
export function personalisationAccepted(raw: string | undefined | null) {
  return raw === `${CONSENT_VERSION}.1`;
}

const secure = () => process.env.NODE_ENV === "production";
export const cookieOpts = (maxAge: number, httpOnly = true) =>
  ({ httpOnly, secure: secure(), sameSite: "lax" as const, path: "/", maxAge });

/** Crée un jeton à usage unique ou de session et renvoie sa valeur en clair (jamais stockée). */
export async function issueToken(memberId: string, kind: "confirm" | "login" | "session") {
  const token = newToken();
  const ttl = kind === "session" ? SESSION_DAYS * 86400 : kind === "confirm" ? 7 * 86400 : 30 * 60;
  const { error } = await serviceClient().from("member_tokens").insert({
    token_hash: hashToken(token), member_id: memberId, kind, expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return { token, maxAge: ttl };
}

/** Consomme un jeton de confirmation ou de connexion ; renvoie l'inscrit ou null. */
export async function consumeToken(token: string, kinds: ("confirm" | "login")[]) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const db = serviceClient();
  const { data } = await db.from("member_tokens").update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token)).in("kind", kinds).is("used_at", null).gt("expires_at", new Date().toISOString())
    .select("member_id").maybeSingle();
  return data?.member_id ?? null;
}

/** Inscrit connecté (cookie de session valide) ou null. */
export async function currentMember(siteId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const db = serviceClient();
  const { data: t } = await db.from("member_tokens").select("member_id")
    .eq("token_hash", hashToken(token)).eq("kind", "session").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!t) return null;
  const { data: m } = await db.from("members").select("*").eq("id", t.member_id).eq("site_id", siteId).neq("status", "pending").maybeSingle();
  return m;
}

/** Ouvre la session et rattache la navigation du navigateur consentant au compte. */
export async function openSession(memberId: string) {
  const jar = await cookies();
  const { token, maxAge } = await issueToken(memberId, "session");
  jar.set(SESSION_COOKIE, token, cookieOpts(maxAge));
  const db = serviceClient();
  await db.from("members").update({ last_seen_at: new Date().toISOString() }).eq("id", memberId);
  const vid = jar.get(VISITOR_COOKIE)?.value;
  if (vid && personalisationAccepted(jar.get(CONSENT_COOKIE)?.value) && /^[0-9a-f-]{36}$/.test(vid)) {
    await db.from("visitors").update({ member_id: memberId }).eq("id", vid).is("member_id", null);
    // Les recherches faites avant l'inscription complètent le profil : outils en place et taille d'entreprise.
    const { data: past } = await db.from("visitor_searches").select("stack,company_size").eq("visitor_id", vid).order("occurred_at", { ascending: false });
    await learnStack(memberId, [...new Set((past ?? []).flatMap((x) => x.stack))]);
    const size = (past ?? []).map((x) => x.company_size).find((k) => SIZES.some(([v]) => v === k));
    if (size) await db.from("members").update({ company_size: size }).eq("id", memberId).is("company_size", null);
  }
}

export async function closeSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await serviceClient().from("member_tokens").delete().eq("token_hash", hashToken(token));
  jar.delete(SESSION_COOKIE);
}

/** Navigateur consentant (cookie rf_vid + consentement en cours de validité) ou null. */
export async function consentingVisitor(siteId: string) {
  const jar = await cookies();
  if (!personalisationAccepted(jar.get(CONSENT_COOKIE)?.value)) return null;
  const vid = jar.get(VISITOR_COOKIE)?.value;
  if (!vid || !/^[0-9a-f-]{36}$/.test(vid)) return null;
  const { data } = await serviceClient().from("visitors").select("id,member_id").eq("id", vid).eq("site_id", siteId).maybeSingle();
  return data;
}

/** Toutes les données d'un inscrit (affichage « Mon espace » et export RGPD). */
export async function memberData(memberId: string) {
  const db = serviceClient();
  const [{ data: member }, { data: software }, { data: projects }, { data: visitors }] = await Promise.all([
    db.from("members").select("*").eq("id", memberId).single(),
    db.from("member_software").select("id,software_name,software_id,relation,satisfaction,source,created_at").eq("member_id", memberId).order("software_name"),
    db.from("member_projects").select("category_id,horizon,created_at,categories(name,slug)").eq("member_id", memberId),
    db.from("visitors").select("id,consented_at").eq("member_id", memberId),
  ]);
  const vids = (visitors ?? []).map((v) => v.id);
  const [{ data: searches }, { data: events }] = vids.length
    ? await Promise.all([
        db.from("visitor_searches").select("occurred_at,company_size,stack,universe_slug,need_slug,result_slugs").in("visitor_id", vids).order("occurred_at", { ascending: false }).limit(200),
        db.from("visitor_events").select("occurred_at,event_type,path,page_type").in("visitor_id", vids).order("occurred_at", { ascending: false }).limit(500),
      ])
    : [{ data: [] }, { data: [] }];
  return { member, software: software ?? [], projects: projects ?? [], searches: searches ?? [], events: events ?? [] };
}

/** Rattache les outils déclarés dans « Trouver » aux logiciels connus du DAF (sans écraser une déclaration). */
export async function learnStack(memberId: string, stack: string[]) {
  if (!stack.length) return;
  const db = serviceClient();
  const { data: known } = await db.from("software").select("id,name").in("name", stack).eq("is_fictional", false);
  const { data: mine } = await db.from("member_software").select("software_name").eq("member_id", memberId);
  const have = new Set((mine ?? []).map((m) => m.software_name.toLowerCase()));
  const rows = [...new Set(stack.map((n) => n.trim().slice(0, 120)).filter(Boolean))]
    .filter((name) => !have.has(name.toLowerCase()))
    .map((name) => ({
      member_id: memberId, software_name: name, relation: "uses", source: "search",
      software_id: known?.find((k) => k.name.toLowerCase() === name.toLowerCase())?.id ?? null,
    }));
  if (rows.length) await db.from("member_software").insert(rows);
}

/** Lien de confirmation ou de connexion valide : active le compte du portail et ouvre la session. */
export async function signInWithLink(token: string, siteId: string, kinds: ("confirm" | "login")[]) {
  const memberId = await consumeToken(token, kinds);
  if (!memberId) return false;
  const db = serviceClient();
  const { data: m } = await db.from("members").select("id,status").eq("id", memberId).eq("site_id", siteId).maybeSingle();
  if (!m) return false;
  if (m.status === "pending") await db.from("members").update({ status: "active", confirmed_at: new Date().toISOString() }).eq("id", m.id);
  await openSession(m.id);
  return true;
}
