import { describe, expect, it } from "vitest";
import { emailDomainMatches, isFreeMail, isValidSiren, listingChecks, normalizeUrl } from "@/lib/checks";
import { parseSiteDomains, siteKeyForHost } from "@/lib/sites";
import { diffLines } from "@/lib/diff";

describe("contrôles des demandes de référencement", () => {
  it("valide un SIREN par l'algorithme de Luhn", () => {
    expect(isValidSiren("732829320")).toBe(true);   // SIREN valide (clé de Luhn correcte)
    expect(isValidSiren("123456789")).toBe(false);
    expect(isValidSiren("12345")).toBe(false);
  });
  it("vérifie que l'e-mail est sur le domaine du site", () => {
    expect(emailDomainMatches("ceo@acme.fr", "https://www.acme.fr/produit")).toBe(true);
    expect(emailDomainMatches("ceo@app.acme.fr", "https://acme.fr")).toBe(true);
    expect(emailDomainMatches("ceo@gmail.com", "https://acme.fr")).toBe(false);
  });
  it("repère les messageries grand public", () => {
    expect(isFreeMail("x@gmail.com")).toBe(true);
    expect(isFreeMail("x@acme.fr")).toBe(false);
    expect(listingChecks({ siren: null, contact_email: "x@acme.fr", website: "https://acme.fr" })).toEqual({ siren_format: null, email_domain_match: true, free_mail: false });
  });
  it("normalise les URL", () => {
    expect(normalizeUrl("acme.fr")).toBe("https://acme.fr");
    expect(normalizeUrl("http://acme.fr")).toBe("http://acme.fr");
  });
});

describe("résolution domaine → portail", () => {
  const raw = "radarfinances.com=daf,cedermasociete.com=cession,radarfinances.localhost=daf";
  it("lit la configuration", () => expect(parseSiteDomains(raw).get("cedermasociete.com")).toBe("cession"));
  it("ignore le port et la casse", () => expect(siteKeyForHost("RadarFinances.localhost:3000", raw, "x")).toBe("daf"));
  it("retombe sur le portail par défaut", () => expect(siteKeyForHost("inconnu.fr", raw, "daf")).toBe("daf"));
});

describe("diff de la file de validation", () => {
  it("signale ajouts et suppressions", () => {
    const d = diffLines("a\nb\nc", "a\nB\nc\nd");
    expect(d.filter((l) => l.kind === "del").map((l) => l.text)).toEqual(["b"]);
    expect(d.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["B", "d"]);
  });
});
