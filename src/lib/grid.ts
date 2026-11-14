/**
 * Grille de lecture des cabinets (migration 2200, docs/GRILLE-LECTURE-CABINETS.md).
 * Fonctions pures : critères applicables à un annuaire, lecture des filtres d'URL, mise en forme des valeurs.
 * Un critère sans fait validé s'affiche « Non vérifié » et ne passe aucun filtre.
 */
export type GridCriterion = {
  code: string; label: string; question: string; kind: "multi" | "one" | "boolean" | "number" | "text" | "list";
  professions: string[] | null; options: { code: string; label: string }[]; unit: string | null; filterable: boolean; sort: number;
  axis?: string;
};
export type GridFact = {
  provider_id: string; criterion: string; value: unknown; source_url: string; source_kind: string; accessed_on: string; period?: string | null;
};
/** Axe de lecture (les 5 questions du dirigeant, puis « le cabinet en chiffres »). */
export type GridAxis = {
  code: string; scope: string; title: string; advice: string | null; source_url: string | null; source_label: string | null;
  accessed_on: string | null; sort: number;
};

/** Axes d'un annuaire : version propre au métier si elle existe, sinon version commune ; avec leurs critères. */
export function axesFor(axes: GridAxis[], criteria: GridCriterion[], categorySlug: string) {
  const codes = [...new Set(axes.map((a) => a.code))];
  return codes
    .map((code) => axes.find((a) => a.code === code && a.scope === categorySlug) ?? axes.find((a) => a.code === code && a.scope === "*"))
    .filter((a): a is GridAxis => !!a)
    .sort((a, b) => a.sort - b.sort)
    .map((axis) => ({ axis, criteria: criteriaFor(criteria, categorySlug).filter((c) => (c.axis ?? "cabinet") === axis.code).sort((a, b) => a.sort - b.sort) }))
    .filter((g) => g.criteria.length > 0);
}
export type FilterOption = { criterion: string; code: string; n: number };
export type Filters = Record<string, string[]>;

export const NOT_VERIFIED = "Non vérifié";
/** Ordre des axes : les 5 questions du dirigeant, puis le cabinet en chiffres. */
export const AXIS_ORDER = ["metier", "interlocuteur", "conseil", "perimetre_prix", "outils", "cabinet"];
export const SOURCE_KIND: Record<string, string> = {
  site_officiel: "site du cabinet", registre_public: "registre public des entreprises",
  annuaire_professionnel: "annuaire professionnel", declaration_cabinet: "déclaration du cabinet",
};
/** Nombre maximal de cabinets comparés côte à côte (lisible sur mobile). */
export const MAX_COMPARE = 4;

/** Critères d'un annuaire : communs à tous les métiers, puis propres au métier ; ordre du référentiel. */
export function criteriaFor(all: GridCriterion[], categorySlug: string): GridCriterion[] {
  const axis = (c: GridCriterion) => AXIS_ORDER.indexOf(c.axis ?? "cabinet");
  return all.filter((c) => !c.professions || c.professions.includes(categorySlug))
    .sort((a, b) => axis(a) - axis(b) || Number(!!b.professions) - Number(!!a.professions) || a.sort - b.sort);
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
    case "number":
      if (typeof value !== "number") return null;
      if (c.unit === "€") return formatEuros(value);
      if (!c.unit) return String(value);
      return `${value.toLocaleString("fr-FR")} ${c.unit}`;
    case "list": return Array.isArray(value) && value.length ? value.map(String).join(" · ") : null;
    default: return typeof value === "string" && value ? value : null;
  }
}

/** Montant en euros lisible : « 2,6 M€ », « 850 k€ ». */
export function formatEuros(n: number): string {
  const f = (x: number) => x.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  if (n >= 1_000_000) return `${f(n / 1_000_000)} M€`;
  if (n >= 10_000) return `${Math.round(n / 1000).toLocaleString("fr-FR")} k€`;
  return `${n.toLocaleString("fr-FR")} €`;
}

/** Libellé de la période d'une donnée (exercice ou année de l'effectif). */
export function periodLabel(c: GridCriterion, period?: string | null): string | null {
  if (!period) return null;
  return c.code === "chiffre_affaires" ? `exercice ${period}` : period;
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
