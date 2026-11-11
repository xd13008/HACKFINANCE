import { describe, expect, it } from "vitest";
import { hashToken, newToken, personalisationAccepted } from "@/lib/members";
import { parseFrom } from "@/lib/mail";
import { signupConsent } from "@/lib/member-text";

describe("comptes DAF", () => {
  it("le consentement n'est valable que pour la version en cours et l'accord explicite", () => {
    expect(personalisationAccepted("v1.1")).toBe(true);
    expect(personalisationAccepted("v1.0")).toBe(false);
    expect(personalisationAccepted("v0.1")).toBe(false);
    expect(personalisationAccepted(undefined)).toBe(false);
  });
  it("les jetons sont aléatoires et seul leur hachage est stocké", () => {
    const a = newToken(), b = newToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });
  it("l'expéditeur des e-mails se lit au format « Nom <adresse> »", () => {
    expect(parseFrom("Radar Finances <bonjour@radarfinances.com>")).toEqual({ name: "Radar Finances", email: "bonjour@radarfinances.com" });
    expect(parseFrom("bonjour@radarfinances.com")).toEqual({ email: "bonjour@radarfinances.com" });
    expect(parseFrom(undefined)).toBeNull();
  });
  it("le texte de consentement nomme le portail et exclut toute revente", () => {
    const t = signupConsent("Radar Finances");
    expect(t).toContain("Radar Finances");
    expect(t).toContain("ni vendues ni transmises");
  });
});
