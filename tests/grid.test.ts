import { describe, expect, it } from "vitest";
import { axesFor, criteriaFor, filtersToQuery, formatEuros, formatValue, groupOptions, parseFilters, periodLabel, type GridCriterion } from "@/lib/grid";

const C = (o: Partial<GridCriterion> & { code: string }): GridCriterion => ({
  label: o.code, question: "?", kind: "multi", professions: null, options: [], unit: null, filterable: true, sort: 0, ...o,
});
const clients = C({ code: "clients", options: [{ code: "pme", label: "PME" }, { code: "eti", label: "ETI" }], sort: 10 });
const efact = C({ code: "facturation_electronique", kind: "boolean", sort: 40 });
const tarif = C({ code: "tarif", kind: "text", filterable: false, sort: 70 });
const missions = C({ code: "missions_comptables", professions: ["experts-comptables"], options: [{ code: "paie", label: "Paie" }], sort: 5 });
const all = [tarif, efact, clients, missions];

describe("grille de lecture", () => {
  it("garde les critères communs et ceux du métier, métier d'abord", () => {
    expect(criteriaFor(all, "experts-comptables").map((c) => c.code)).toEqual(["missions_comptables", "clients", "facturation_electronique", "tarif"]);
    expect(criteriaFor(all, "cabinets-recrutement-finance").map((c) => c.code)).not.toContain("missions_comptables");
  });
  it("ne retient que les codes du référentiel dans l'URL", () => {
    expect(parseFilters({ clients: ["pme", "grandes-surfaces"], facturation_electronique: "oui", tarif: "x", page: "2" }, all))
      .toEqual({ clients: ["pme"], facturation_electronique: ["oui"] });
    expect(parseFilters({ clients: "pme,eti,pme" }, all)).toEqual({ clients: ["pme", "eti"] });
    expect(parseFilters({ facturation_electronique: "non" }, all)).toEqual({});
  });
  it("reconstruit la requête des filtres pour la pagination", () => {
    expect(filtersToQuery({ clients: ["pme", "eti"] })).toBe("clients=pme&clients=eti");
  });
  it("affiche un libellé, ou null (« Non vérifié ») sans fait", () => {
    expect(formatValue(clients, ["pme", "eti"])).toBe("PME, ETI");
    expect(formatValue(efact, true)).toBe("Oui");
    expect(formatValue(clients, undefined)).toBeNull();
    expect(formatValue(clients, [])).toBeNull();
    expect(formatValue(C({ code: "annee", kind: "number", filterable: false }), 1998)).toBe("1998");
  });
  it("ne propose que les filtres portés par au moins une fiche", () => {
    const g = groupOptions(all, [{ criterion: "clients", code: "pme", n: 3 }]);
    expect(g).toHaveLength(1);
    expect(g[0].values).toEqual([{ code: "pme", n: 3, label: "PME" }]);
  });
});

describe("grille de lecture : axes du dirigeant", () => {
  const axes = [
    { code: "metier", scope: "*", title: "Métier", advice: null, source_url: null, source_label: null, accessed_on: null, sort: 1 },
    { code: "metier", scope: "experts-comptables", title: "La connaissance de votre métier", advice: "Demandez-lui combien.", source_url: null, source_label: null, accessed_on: null, sort: 1 },
    { code: "outils", scope: "*", title: "Les outils", advice: null, source_url: null, source_label: null, accessed_on: null, sort: 5 },
    { code: "cabinet", scope: "*", title: "Le cabinet en chiffres", advice: null, source_url: null, source_label: null, accessed_on: null, sort: 6 },
  ];
  const crits = [
    C({ code: "logiciels", axis: "outils", options: [{ code: "pennylane", label: "Pennylane" }], sort: 20 }),
    C({ code: "secteurs", axis: "metier", options: [{ code: "btp", label: "BTP" }], sort: 10 }),
    C({ code: "chiffre_affaires", axis: "cabinet", kind: "number", unit: "€", filterable: false, sort: 5 }),
  ];
  it("prend le texte propre au métier, sinon le texte commun, dans l'ordre des axes", () => {
    const ec = axesFor(axes, crits, "experts-comptables");
    expect(ec.map((g) => g.axis.title)).toEqual(["La connaissance de votre métier", "Les outils", "Le cabinet en chiffres"]);
    expect(axesFor(axes, crits, "cabinets-recrutement-finance")[0].axis.title).toBe("Métier");
  });
  it("range les filtres dans l'ordre des axes", () => {
    expect(criteriaFor(crits, "experts-comptables").map((c) => c.code)).toEqual(["secteurs", "logiciels", "chiffre_affaires"]);
  });
  it("met en forme montants, listes et périodes", () => {
    expect(formatEuros(2_580_811)).toBe("2,6 M€");
    expect(formatEuros(265_310)).toBe("265 k€");
    expect(formatValue(C({ code: "references", kind: "list", filterable: false }), ["A", "B"])).toBe("A · B");
    expect(formatValue(C({ code: "tarif_min_mensuel", kind: "number", unit: "€ HT par mois" }), 55)).toBe("55 € HT par mois");
    expect(periodLabel(crits[2], "2025")).toBe("exercice 2025");
  });
});
