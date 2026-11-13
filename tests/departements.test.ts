import { describe, expect, it } from "vitest";
import { departmentIndexing } from "@/lib/departements";

describe("pages département sans doublon", () => {
  it("Paris : une seule ville, la page département renvoie vers la page ville", () => {
    const r = departmentIndexing([{ city_slug: "paris", department: "75", providers: 4087 }], "75");
    expect(r).toMatchObject({ indexable: false, mainCity: "paris", mainCityIndexable: true });
  });
  it("ville principale à plus de 80 % : renvoi vers la ville", () => {
    const r = departmentIndexing([{ city_slug: "nantes", department: "44", providers: 90 }, { city_slug: "saint-nazaire", department: "44", providers: 10 }], "44");
    expect(r.indexable).toBe(false);
  });
  it("plusieurs villes significatives : la page département apporte un contenu propre", () => {
    const r = departmentIndexing([
      { city_slug: "nantes", department: "44", providers: 141 }, { city_slug: "saint-nazaire", department: "44", providers: 40 },
      { city_slug: "reze", department: "44", providers: 20 }, { city_slug: "lyon", department: "69", providers: 540 },
    ], "44");
    expect(r).toMatchObject({ indexable: true, total: 201 });
  });
});
