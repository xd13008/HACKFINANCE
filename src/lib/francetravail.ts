import { mapFtOffer, type FtOffer } from "@/lib/jobs";

/**
 * Import des offres finance depuis l'API « Offres d'emploi v2 » de France Travail (francetravail.io).
 * Identifiants FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET côté serveur ; application abonnée à l'API.
 */
const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
export const FT_KEYWORDS = [
  "comptable", "contrôleur de gestion", "directeur financier", "responsable administratif et financier", "trésorier",
  "auditeur", "analyste financier", "credit manager", "consolidation", "fiscaliste",
];

type Fetcher = typeof fetch;

export async function ftToken(fetcher: Fetcher = fetch) {
  const id = process.env.FRANCE_TRAVAIL_CLIENT_ID, secret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET non configurés");
  const res = await fetcher(TOKEN_URL, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: "api_offresdemploiv2 o2dsoffre" }),
  });
  if (!res.ok) throw new Error(`Jeton France Travail refusé (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Offres finance publiées depuis `days` jours (1, 3, 7, 14 ou 31), dédoublonnées et converties. */
export async function fetchFinanceOffers(days: 1 | 3 | 7 | 14 | 31, fetcher: Fetcher = fetch, maxPerKeyword = 1150) {
  const token = await ftToken(fetcher);
  const seen = new Map<string, NonNullable<ReturnType<typeof mapFtOffer>>>();
  let fetched = 0;
  for (const kw of FT_KEYWORDS) {
    for (let start = 0; start < maxPerKeyword; start += 150) {
      const end = Math.min(start + 149, maxPerKeyword - 1);
      const url = `${SEARCH_URL}?${new URLSearchParams({ motsCles: kw, publieeDepuis: String(days), range: `${start}-${end}` })}`;
      const res = await fetcher(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
      if (res.status === 204) break;                       // aucun résultat
      if (!res.ok) throw new Error(`Recherche France Travail « ${kw} » refusée (${res.status})`);
      const body = (await res.json()) as { resultats?: FtOffer[] };
      const list = body.resultats ?? [];
      fetched += list.length;
      for (const o of list) { const row = mapFtOffer(o); if (row) seen.set(row.external_id, row); }
      const total = Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? 0);
      if (list.length < 150 || end + 1 >= total) break;
      await new Promise((r) => setTimeout(r, 150));     // limite : 10 appels par seconde
    }
  }
  return { rows: [...seen.values()], fetched };
}
