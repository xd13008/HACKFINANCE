/**
 * Calculs d'aide à la décision, partagés par l'assistant, les pages univers et les fiches.
 * Fonctions pures (testées dans tests/decision.test.ts) : aucune donnée inventée, uniquement
 * des prix publics validés (pricing_plans) et des faits validés (software_facts).
 */

export type PlanLike = { plan_name: string; price_eur: number | string | null; billing_period: string; per_unit: string | null };

export type PlanCost =
  | { kind: "price"; plan: string; annual: number }
  | { kind: "quote"; plan: string }
  | { kind: "none" };

/** Nombre d'entités maximum couvert par une offre (« jusqu'à 5 entités »), ou null si non précisé. */
function entityCap(perUnit: string | null): number | null {
  const m = perUnit?.match(/jusqu.{0,3}\s*(\d+)\s*(entit|soci)/i);
  return m ? Number(m[1]) : null;
}

/** L'offre est-elle facturée par entité ou par société ? */
function perEntity(perUnit: string | null): boolean {
  return /par\s+(entit|soci)/i.test(perUnit ?? "");
}

/** Coût annuel HT d'une offre pour un nombre d'entités, ou null si l'offre ne couvre pas ce cas. */
export function planAnnualCost(plan: PlanLike, entities: number): number | null {
  if (plan.billing_period === "quote" || plan.price_eur == null) return null;
  const cap = entityCap(plan.per_unit);
  if (cap != null && entities > cap) return null;
  const price = Number(plan.price_eur);
  if (plan.billing_period === "free") return 0;
  const yearly = plan.billing_period === "year" ? price : plan.billing_period === "month" ? price * 12 : price;
  return perEntity(plan.per_unit) ? yearly * entities : yearly;
}

/**
 * Offre la moins chère qui couvre le besoin. Une offre gratuite n'est retenue que pour une seule entité
 * (ses limites ne sont pas modélisées). Sans prix public applicable : « sur devis » si une offre existe sur devis.
 */
export function cheapestPlan(plans: PlanLike[], entities: number, multiEntity: boolean | null = null): PlanCost {
  if (entities > 1 && multiEntity === false) return { kind: "none" };
  const priced = plans
    .filter((p) => !(p.billing_period === "free" && entities > 1))
    .map((p) => ({ p, c: planAnnualCost(p, entities) }))
    .filter((x): x is { p: PlanLike; c: number } => x.c != null)
    .sort((a, b) => a.c - b.c);
  if (priced.length) return { kind: "price", plan: priced[0].p.plan_name, annual: priced[0].c };
  const quote = plans.find((p) => p.billing_period === "quote");
  return quote ? { kind: "quote", plan: quote.plan_name } : { kind: "none" };
}

/** Prix d'entrée mensuel HT (offre payante la moins chère, une entité), 0 si une offre gratuite existe, null sinon. */
export function entryMonthlyPrice(plans: PlanLike[]): number | null {
  if (plans.some((p) => p.billing_period === "free")) return 0;
  const monthly = plans
    .map((p) => (p.price_eur == null ? null : p.billing_period === "month" ? Number(p.price_eur) : p.billing_period === "year" ? Number(p.price_eur) / 12 : null))
    .filter((v): v is number => v != null);
  return monthly.length ? Math.min(...monthly) : null;
}

/** Médiane (null si liste vide). */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Correspondance entre un outil déclaré (« Sage ») et une intégration référencée (« Sage 100 »). */
export function connectsTo(integrations: string[], tool: string): boolean {
  const t = tool.toLowerCase();
  return integrations.some((i) => i.toLowerCase().includes(t) || t.includes(i.toLowerCase()));
}

export type SizeKey = "tpe" | "pme1" | "pme2" | "eti" | "crea" | "growth";
const SIZE_TO_TARGET: Record<SizeKey, string> = { tpe: "tpe", pme1: "pme", pme2: "pme", eti: "eti", crea: "tpe", growth: "pme" };

/**
 * Adéquation au profil (sur 10) : note de la rédaction, ajustée par la taille cible (+0,6)
 * et la part des outils déclarés auxquels la solution se connecte (+0,8 au plus). Plafonnée à 10.
 */
export function fitScore(input: { score: number; targetSizes: string[]; integrations: string[] }, size: SizeKey | null, declared: string[]): number {
  const sizeFit = size && input.targetSizes.includes(SIZE_TO_TARGET[size]) ? 0.6 : 0;
  const hits = declared.filter((d) => connectsTo(input.integrations, d)).length;
  const compat = declared.length ? (hits / declared.length) * 0.8 : 0.4;
  return Math.min(10, input.score + sizeFit + compat);
}

/** Montant en euros, sans décimales, espaces insécables normalisés (« 2 988 € »). */
export function eur(v: number): string {
  return `${Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
}
