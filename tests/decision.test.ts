import { describe, expect, it } from "vitest";
import { cheapestPlan, connectsTo, entryMonthlyPrice, eur, fitScore, median, planAnnualCost } from "@/lib/decision";

const essentiel = { plan_name: "Essentiel", price_eur: "89.00", billing_period: "month", per_unit: "par entité" };
const groupe = { plan_name: "Groupe", price_eur: "249.00", billing_period: "month", per_unit: "jusqu'à 5 entités" };
const gratuit = { plan_name: "Gratuit", price_eur: "0", billing_period: "free", per_unit: null };
const pro = { plan_name: "Pro", price_eur: "15.00", billing_period: "month", per_unit: null };
const devis = { plan_name: "ETI", price_eur: null, billing_period: "quote", per_unit: null };

describe("coût annuel", () => {
  it("facture par entité et respecte le plafond d'entités", () => {
    expect(planAnnualCost(essentiel, 3)).toBe(89 * 12 * 3);
    expect(planAnnualCost(groupe, 5)).toBe(249 * 12);
    expect(planAnnualCost(groupe, 6)).toBeNull();
    expect(planAnnualCost(devis, 1)).toBeNull();
  });
  it("retient l'offre la moins chère qui couvre le besoin", () => {
    expect(cheapestPlan([essentiel, groupe], 1)).toEqual({ kind: "price", plan: "Essentiel", annual: 1068 });
    expect(cheapestPlan([essentiel, groupe], 3)).toEqual({ kind: "price", plan: "Groupe", annual: 2988 });
    expect(cheapestPlan([essentiel, groupe], 6)).toEqual({ kind: "price", plan: "Essentiel", annual: 6408 });
  });
  it("gratuit pour une entité seulement ; exclut le mono-entité ; sur devis sinon", () => {
    expect(cheapestPlan([gratuit, pro], 1)).toEqual({ kind: "price", plan: "Gratuit", annual: 0 });
    expect(cheapestPlan([gratuit, pro], 2)).toEqual({ kind: "price", plan: "Pro", annual: 180 });
    expect(cheapestPlan([gratuit, pro], 2, false)).toEqual({ kind: "none" });
    expect(cheapestPlan([devis], 3)).toEqual({ kind: "quote", plan: "ETI" });
  });
  it("prix d'entrée mensuel", () => {
    expect(entryMonthlyPrice([essentiel, groupe])).toBe(89);
    expect(entryMonthlyPrice([gratuit, pro])).toBe(0);
    expect(entryMonthlyPrice([devis])).toBeNull();
  });
});

describe("profil et formats", () => {
  it("médiane paire et impaire", () => {
    expect(median([29, 49, 69, 89, 149, 390])).toBe(79);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([])).toBeNull();
  });
  it("compatibilité souple entre outil déclaré et intégration", () => {
    expect(connectsTo(["Sage 100", "Pennylane"], "Sage")).toBe(true);
    expect(connectsTo(["Qonto"], "Cegid")).toBe(false);
  });
  it("adéquation : taille et compatibilité, plafonnée à 10", () => {
    const sw = { score: 8.4, targetSizes: ["pme", "eti"], integrations: ["Pennylane", "Sage 100"] };
    expect(fitScore(sw, "pme2", ["Sage"])).toBeCloseTo(8.4 + 0.6 + 0.8);
    expect(fitScore(sw, "tpe", ["Cegid"])).toBeCloseTo(8.4);
    expect(fitScore({ ...sw, score: 9.8 }, "pme2", ["Sage"])).toBe(10);
  });
  it("format en euros", () => {
    expect(eur(2988)).toBe("2 988 €");
  });
});
