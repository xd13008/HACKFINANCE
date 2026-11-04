/** Résolution domaine → portail. Configuré par SITE_DOMAINS="domaine=clé,…". */
export function parseSiteDomains(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const [domain, key] = pair.split("=").map((s) => s?.trim().toLowerCase());
    if (domain && key) map.set(domain, key);
  }
  return map;
}

export function siteKeyForHost(host: string | null, raw = process.env.SITE_DOMAINS, fallback = process.env.DEFAULT_SITE_KEY): string {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  return parseSiteDomains(raw).get(hostname) ?? fallback ?? "daf";
}

export const SITE_KEY_PATTERN = /^[a-z0-9-]+$/;
