/**
 * Avis G2 via l'API officielle de syndication (clé délivrée par G2, variable G2_API_TOKEN, jamais dans le dépôt).
 * Les avis arrivent en BROUILLON et respectent la règle 6 : courte citation (≤ 300 caractères), lien vers l'avis,
 * date, fonction de l'auteur sans nom. Un éditeur humain valide ensuite chaque note et chaque citation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const BASE = "https://data.g2.com/api/2018-01-01/syndication/reviews";

export type G2Answer = { text?: string; value?: string };
export type G2Review = {
  id?: string | number;
  attributes?: G2Review;
  title?: string; star_rating?: number | string; url?: string; is_public?: boolean;
  published_at?: string; submitted_at?: string;
  answers?: Record<string, G2Answer> | G2Answer[];
  user?: { name?: string; title?: string; job_title?: string; company_segment?: string };
  company_segment?: string;
};
export type G2Page = { data?: G2Review[]; meta?: { record_count?: number; rating?: number | string; product?: { url?: string; name?: string } }; links?: { next?: string | null } };

export function g2ReviewsUrl(productId: string, token: string, page = 1, size = 25): string {
  const u = new URL(BASE);
  u.searchParams.set("filter[product_id]", productId);
  u.searchParams.set("page[size]", String(size));
  u.searchParams.set("page[number]", String(page));
  u.searchParams.set("api_token", token);
  return u.toString();
}

/** Coupe un texte à 300 caractères au plus, sur une fin de phrase ou de mot, avec « … » si coupé. */
export function shortQuote(text: string, max = 300): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = cut.lastIndexOf(". ");
  const end = sentence >= 120 ? sentence + 1 : cut.lastIndexOf(" ");
  return `${cut.slice(0, end > 0 ? end : max - 1).trim()}…`;
}

export function sentimentOf(stars: number): "positive" | "negative" | "mixed" {
  return stars >= 4 ? "positive" : stars <= 2 ? "negative" : "mixed";
}

const SEGMENT: Record<string, string> = { "179": "petite entreprise", "180": "entreprise moyenne", "181": "grande entreprise",
  small: "petite entreprise", "small-business": "petite entreprise", "mid-market": "entreprise moyenne", enterprise: "grande entreprise" };

/** Fonction de l'auteur, sans nom (règle 6) : 3 à 80 caractères. */
export function authorLabel(r: G2Review): string {
  const role = (r.user?.title ?? r.user?.job_title ?? "").replace(/\s+/g, " ").trim();
  const seg = SEGMENT[String(r.user?.company_segment ?? r.company_segment ?? "").toLowerCase()];
  const label = [role || "Utilisateur vérifié G2", seg].filter(Boolean).join(", ");
  return label.length > 80 ? `${label.slice(0, 79)}…` : label;
}

/** Réponse libre à citer : « ce que vous aimez » pour un avis positif, « ce que vous n'aimez pas » sinon. */
function pickAnswer(r: G2Review, positive: boolean): string | null {
  const list = Array.isArray(r.answers) ? r.answers : Object.values(r.answers ?? {});
  const like = list.find((a) => /like best|aimez le plus|apprécie/i.test(a.text ?? ""));
  const dislike = list.find((a) => /dislike|aimez le moins|n.aimez pas/i.test(a.text ?? ""));
  const chosen = positive ? like ?? dislike : dislike ?? like;
  return (chosen ?? list.find((a) => (a.value ?? "").trim().length >= 20))?.value ?? null;
}

export type QuoteDraft = { quote: string; review_url: string; author_label: string; review_date: string; sentiment: "positive" | "negative" | "mixed"; rating: number };

/** Transforme un avis G2 en citation conforme, ou null s'il n'est pas utilisable (non public, sans lien, trop court). */
export function toQuote(raw: G2Review): QuoteDraft | null {
  const r = raw.attributes ? { ...raw.attributes, id: raw.id } : raw;
  if (r.is_public === false || !r.url?.startsWith("https://")) return null;
  const stars = Number(r.star_rating);
  if (!Number.isFinite(stars)) return null;
  const text = pickAnswer(r, stars >= 4);
  if (!text) return null;
  const quote = shortQuote(text);
  const date = (r.published_at ?? r.submitted_at ?? "").slice(0, 10);
  if (quote.length < 20 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { quote, review_url: r.url, author_label: authorLabel(r), review_date: date, sentiment: sentimentOf(stars), rating: stars };
}

type Db = SupabaseClient<Database>;
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Importe la note G2 et jusqu'à `maxQuotes` citations récentes d'un logiciel, en brouillon.
 * N'efface ni ne modifie rien de validé ; les citations déjà connues (même lien) sont ignorées.
 */
export async function importG2Reviews(db: Db, softwareId: string, productId: string, token: string, fetcher: Fetcher = fetch, maxQuotes = 10) {
  const res = await fetcher(g2ReviewsUrl(productId, token));
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "G2 refuse la clé : vérifiez qu'il s'agit d'une clé de syndication." : `G2 a répondu ${res.status}`);
  const page = (await res.json()) as G2Page;
  const today = new Date().toISOString().slice(0, 10);
  const rating = page.meta?.rating == null ? null : Number(page.meta.rating);
  const sourceUrl = page.meta?.product?.url?.startsWith("https://") ? page.meta.product.url : `https://www.g2.com/products/${productId}/reviews`;

  const { data: existing } = await db.from("review_sources").select("id,status").eq("software_id", softwareId).eq("platform", "g2").eq("status", "draft").maybeSingle();
  const fields = { url: sourceUrl, rating, rating_scale: 5, review_count: page.meta?.record_count ?? null, captured_at: today };
  const source = existing
    ? (await db.from("review_sources").update(fields).eq("id", existing.id).select("id").single()).data
    : (await db.from("review_sources").insert({ software_id: softwareId, platform: "g2", status: "draft", author_kind: "agent", ...fields }).select("id").single()).data;
  if (!source) throw new Error("Écriture de la note G2 impossible");

  const quotes = (page.data ?? []).map(toQuote).filter((q): q is QuoteDraft => !!q);
  const { data: known } = await db.from("review_quotes").select("review_url").in("review_url", quotes.map((q) => q.review_url).concat("-"));
  const knownUrls = new Set((known ?? []).map((k) => k.review_url));
  const fresh = quotes.filter((q) => !knownUrls.has(q.review_url)).slice(0, maxQuotes);
  if (fresh.length) {
    const { error } = await db.from("review_quotes").insert(fresh.map((q) => ({ ...q, review_source_id: source.id, status: "draft" as const, author_kind: "agent" })));
    if (error) throw new Error(`Écriture des citations impossible : ${error.message}`);
  }
  return { rating, reviewCount: page.meta?.record_count ?? null, quotesAdded: fresh.length, quotesSkipped: quotes.length - fresh.length, ignored: (page.data ?? []).length - quotes.length };
}
