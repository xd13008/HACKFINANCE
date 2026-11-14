/**
 * Grille de lecture des cabinets (migration 2200, docs/GRILLE-LECTURE-CABINETS.md).
 * Fonctions pures : critères applicables à un annuaire, lecture des filtres d'URL, mise en forme des valeurs.
 * Un critère sans fait validé s'affiche « Non vérifié » et ne passe aucun filtre.
 */
export type GridCriterion = {
  code: string; label: string; question: string; kind: "multi" | "one" | "boolean" | "number" | "text";
  professions: string[] | null; options: { code: string; label: string }[]; unit: string | null; filterable: boolean; sort: number;
};
export type GridFact = { provider_id: string; criterion: string; value: unknown; source_url: string; source_kind: string; accessed_on: string };
export type FilterOption = { criterion: string; code: string; n: number };
export type Filters = Record<string, string[]>;

export const NOT_VERIFIED = "Non vérifié";
export const SOURCE_KIND: Record<string, string> = {
  site_officiel: "site du cabinet", registre_public: "registre public des entreprises",
  annuaire_professionnel: "annuaire professionnel", declaration_cabinet: "déclaration du cabinet",
};
/** Nombre maximal de cabinets comparés côte à côte (lisible sur mobile). */
export const MAX_COMPARE = 4;

/** Critères d'un annuaire : communs à tous les métiers, puis propres au métier ; ordre du référentiel. */
export function criteriaFor(all: GridCriterion[], categorySlug: string): GridCriterion[] {
  return all.filter((c) => !c.professions || c.professions.includes(categorySlug))
    .sort((a, b) => Number(!!b.professions) - Number(!!a.professions) || a.sort - b.sort);
}

/** Filtres lus dans l'URL : seuls les critères filtrables et les codes du référentiel sont retenus. */
export function parseFilters(sp: Record<string, string | string[] | undefined>, criteria: GridCriterion[]): Filters {
  const out: Filters = {};
  for (const c of criteria) {
    if (!c.filterable) continue;
    const raw = sp[c.code];
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","));
    const allowed = c.kind === "boolean" ? ["oui"] : c.options.map((o) => o.code);
    const kept = [...new Set(values.filter((v) => allowed.includes(v)))];
    if (kept.length) out[c.code] = kept;
  }
  return out;
}

export function filtersToQuery(f: Filters): string {
  const q = new URLSearchParams();
  for (const [k, vs] of Object.entries(f)) for (const v of vs) q.append(k, v);
  return q.toString();
}

/** Libellé d'une valeur ; null si le fait est absent (affiché « Non vérifié »). */
export function formatValue(c: GridCriterion, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const label = (code: string) => c.options.find((o) => o.code === code)?.label ?? code;
  switch (c.kind) {
    case "multi": return Array.isArray(value) && value.length ? value.map((v) => label(String(v))).join(", ") : null;
    case "one": return label(String(value));
    case "boolean": return value === true ? "Oui" : value === false ? "Non" : null;
    case "number": return typeof value === "number" ? `${value}${c.unit ? ` ${c.unit}` : ""}` : null;
    default: return typeof value === "string" && value ? value : null;
  }
}

/** Options de filtre d'une page, groupées par critère, dans l'ordre du référentiel. */
export function groupOptions(criteria: GridCriterion[], options: FilterOption[]) {
  return criteria.filter((c) => c.filterable).map((c) => ({
    criterion: c,
    values: options.filter((o) => o.criterion === c.code).map((o) => ({
      code: o.code, n: o.n, label: c.kind === "boolean" ? "Oui" : c.options.find((x) => x.code === o.code)?.label ?? o.code,
    })),
  })).filter((g) => g.values.length > 0);
}

export function hostOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}
