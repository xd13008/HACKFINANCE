import { describe, expect, it } from "vitest";
import { postalLabel } from "@/lib/postal";

describe("codes postaux des pages ville", () => {
  it("nomme les arrondissements de Paris, Lyon et Marseille", () => {
    expect(postalLabel("75001")).toBe("1er arrondissement (75001)");
    expect(postalLabel("75008")).toBe("8e arrondissement (75008)");
    expect(postalLabel("75116")).toBe("16e arrondissement (75116)");
    expect(postalLabel("69003")).toBe("3e arrondissement (69003)");
    expect(postalLabel("13016")).toBe("16e arrondissement (13016)");
  });
  it("laisse les autres codes postaux tels quels", () => {
    expect(postalLabel("44300")).toBe("44300");
    expect(postalLabel("13100")).toBe("13100");
    expect(postalLabel("75099")).toBe("75099");
  });
});
