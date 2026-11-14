import { describe, expect, it } from "vitest";
import { criteriaFor, filtersToQuery, formatValue, groupOptions, parseFilters, type GridCriterion } from "@/lib/grid";

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
