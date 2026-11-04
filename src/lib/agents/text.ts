/** Utilitaires purs (testés) : extraction de texte, domaines autorisés, filtrage des sources. */

export function htmlToText(html: string, maxChars = 40_000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&euro;/g, "€").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

export function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

/** Une URL est autorisée si son domaine est dans la liste, ou — liste vide — s'il correspond au site de l'éditeur. */
export function isAllowedUrl(url: string, allowed: string[], vendorWebsite?: string | null): boolean {
  const h = hostOf(url);
  if (!h || !/^https?:/.test(url)) return false;
  const list = allowed.length ? allowed : vendorWebsite ? [hostOf(vendorWebsite) ?? ""] : [];
  return list.filter(Boolean).some((d) => h === d.toLowerCase() || h.endsWith(`.${d.toLowerCase()}`));
}

/** Ne garde que les sources fournies à l'agent : un agent ne peut pas inventer une source. */
export function keepKnownSources<T extends { url: string }>(used: T[], known: string[]): T[] {
  const set = new Set(known.map((u) => u.replace(/\/+$/, "")));
  const seen = new Set<string>();
  return used.filter((s) => {
    const k = s.url.replace(/\/+$/, "");
    if (!set.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Délimite un contenu non fiable (page web, brouillon) pour qu'il soit traité comme donnée, jamais comme instruction. */
export function asDocument(label: string, content: string): string {
  const safe = content.replace(/<\/?document[^>]*>/gi, "");
  return `<document source="${label.replace(/"/g, "")}">\n${safe}\n</document>`;
}
