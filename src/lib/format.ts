const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("fr-FR");

export const formatDate = (d: string | Date) => dateFmt.format(typeof d === "string" ? new Date(d) : d);
export const formatEur = (n: number) => eur.format(n);
export const formatNum = (n: number) => num.format(n);

export const PERIOD_LABEL: Record<string, string> = { month: "/ mois", year: "/ an", one_time: "une fois", quote: "sur devis", free: "" };

export function priceLabel(p: { price_eur: number | null; billing_period: string; per_unit: string | null }) {
  if (p.billing_period === "quote" || p.price_eur == null) return "Sur devis";
  if (p.billing_period === "free" || Number(p.price_eur) === 0) return "Gratuit";
  return `${formatEur(Number(p.price_eur))} HT ${PERIOD_LABEL[p.billing_period] ?? ""}${p.per_unit ? ` ${p.per_unit}` : ""}`.trim();
}
