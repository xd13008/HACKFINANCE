/** Contrôles automatiques des demandes publiques (purs, testés unitairement). */

const FREE_MAIL = new Set(["gmail.com", "yahoo.fr", "yahoo.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.fr", "orange.fr", "free.fr", "sfr.fr", "laposte.net", "icloud.com", "proton.me", "protonmail.com", "wanadoo.fr"]);

/** Le SIREN est un numéro à 9 chiffres validé par l'algorithme de Luhn. */
export function isValidSiren(raw: string | null | undefined): boolean {
  const s = (raw ?? "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(s[8 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  return parts.slice(-2).join(".");
}

export function emailDomainMatches(email: string, website: string): boolean {
  try {
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    const siteDomain = new URL(website).hostname;
    return !!emailDomain && registrableDomain(emailDomain) === registrableDomain(siteDomain);
  } catch {
    return false;
  }
}

export function isFreeMail(email: string): boolean {
  return FREE_MAIL.has(email.split("@")[1]?.toLowerCase() ?? "");
}

export function listingChecks(input: { siren?: string | null; contact_email: string; website: string }) {
  return {
    siren_format: input.siren ? isValidSiren(input.siren) : null,
    email_domain_match: emailDomainMatches(input.contact_email, input.website),
    free_mail: isFreeMail(input.contact_email),
  };
}

export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
