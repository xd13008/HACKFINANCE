import { describe, expect, it } from "vitest";
import { charterCheck } from "@/lib/agents/charter";
import { QC_SYSTEM, REDACTION_SYSTEM } from "@/lib/agents/prompts";

const long = (n: number) => Array.from({ length: n }, () => "mot").join(" ");
const faq = (n: number) => Array.from({ length: n }, (_, i) => ({ q: `Q${i}`, a: "R" }));
const goodReview = `## Verdict\n${long(400)}\n## Connexions bancaires\n${long(400)}\n## Prévision\n${long(400)}\n## Prix\n${long(400)}\n## Matchs\nVoir [Trésoflux vs Cashpilot](/comparer/cashpilot-vs-tresoflux).\n${long(300)}`;

describe("charte de rédaction", () => {
  it("un test conforme ne lève aucun avertissement", () => {
    expect(charterCheck({ type: "software_review", summary: "Résumé.", body: goodReview, faq: faq(6) })).toEqual([]);
  });
  it("signale les mots interdits et le tutoiement", () => {
    const issues = charterCheck({ type: "guide", body: "Une solution innovante et incontournable. Si tu veux gagner du temps, choisis-la." });
    expect(issues.filter((i) => i.explanation.startsWith("Mot interdit"))).toHaveLength(2);
    expect(issues.some((i) => i.explanation.startsWith("Tutoiement"))).toBe(true);
  });
  it("ne confond pas « le ton » ni « tout » avec du tutoiement", () => {
    expect(charterCheck({ type: "guide", body: "Le ton est direct. Tout est vérifié, tant mieux." })).toEqual([]);
  });
  it("un test trop court, sans FAQ ni lien vers les comparatifs, est signalé", () => {
    const types = charterCheck({ type: "software_review", body: "## Verdict\nCourt.", faq: [] }).map((i) => i.excerpt);
    expect(types).toEqual(expect.arrayContaining(["aucun lien /comparer/ ni /alternatives", "0 question(s)", "1 intertitre(s)"]));
    expect(types.some((t) => /mots$/.test(t))).toBe(true);
  });
  it("le lien vers la page des alternatives suffit à ouvrir sur les comparatifs", () => {
    const body = goodReview.replace("(/comparer/cashpilot-vs-tresoflux)", "(/logiciels/tresoflux/alternatives)");
    expect(charterCheck({ type: "software_review", body, faq: faq(8) })).toEqual([]);
  });
  it("les avertissements de la charte ne sont jamais bloquants", () => {
    expect(charterCheck({ type: "alternatives", body: "tu", faq: [] }).every((i) => i.severity === "warning")).toBe(true);
  });
  it("les consignes des agents de rédaction et de contrôle intègrent la charte", () => {
    for (const p of [REDACTION_SYSTEM, QC_SYSTEM]) expect(p).toMatch(/Vouvoiement/);
    expect(REDACTION_SYSTEM).toMatch(/software_review \(1 800 à 2 500 mots\)/);
    expect(REDACTION_SYSTEM).toMatch(/matchs_a_proposer/);
  });
});
