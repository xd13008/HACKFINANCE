/**
 * Charte de rédaction (docs/CHARTE-REDACTION-TESTS.md) : consignes données aux agents et contrôles automatiques.
 * Les contrôles produisent des avertissements pour l'éditeur ; ils ne remplacent ni seo_check() ni la validation humaine.
 */

export const CHARTER_STYLE = `Charte de rédaction (niveau attendu : un test dense, vécu, avec un vrai avis) :
- Vouvoiement. Le lecteur est DAF, RAF ou dirigeant de PME. Ton d'un pair expérimenté : franc, précis, jamais commercial.
- Un verdict clair et assumé, puis « idéal pour » et « à éviter si ».
- Au moins 3 limites réelles, tirées du test fourni. Chaque critère : un constat et au moins un chiffre présent dans les données.
- Des chiffres plutôt que des adjectifs. Phrases courtes, une idée par phrase.
- Mots interdits : innovant, révolutionnaire, incontournable, game changer, leader du marché, numéro 1.
- Aucune phrase copiée du site de l'éditeur, d'un concurrent ou d'un avis. Les avis tiers ne sont jamais intégrés à la note.
- Chaque page est unique : son angle vient du cas testé, des chiffres mesurés et du verdict par profil.
- N'invente aucun chiffre, aucun temps mesuré, aucune preuve : si la donnée manque, écris-le.`;

export const CHARTER_PLANS = `Plans à suivre selon le type de page :
- software_review (1 800 à 2 500 mots) : verdict ; notre avis en résumé ; une section ## par critère de la grille (constat, chiffre, note, points forts, limites) ; prix décortiqués (coût pour 1, 3 et 5 sociétés si les offres le permettent, comparaison avec 2 ou 3 alternatives) ; matchs avec les solutions proches (liens /comparer/… fournis) et lien vers les alternatives ; « Vous cherchez quoi exactement ? » (alternatives, accompagnement, formation) ; FAQ de 6 à 10 questions ; méthode et sources.
- alternatives (1 200 à 1 800 mots) : pourquoi les équipes quittent la solution (4 à 6 raisons étayées) ; tableau des alternatives (idéal pour, avantage principal, note, prix d'entrée) ; choisir selon sa raison de partir ; une section courte par alternative avec lien vers son test et le match ; FAQ de 6 à 10 questions.
- duel (900 à 1 400 mots) : qui gagne pour quel profil ; tableau critère par critère ; verdict pour 3 à 4 profils de DAF ; les différences qui comptent ; liens vers les deux tests et les alternatives.`;

/** Longueur cible (mots) par gabarit, au-delà du minimum bloquant de seo_check(). */
export const TARGET_WORDS: Record<string, number> = { software_review: 1800, alternatives: 1200, duel: 900 };

const FORBIDDEN = /\b(innovante?s?|révolutionnaires?|incontournables?|game[- ]changers?|leader du marché|num[ée]ro 1|n°\s?1)\b/gi;
const TUTOIEMENT = /(^|[^\p{L}])(tu|toi|tes|ta|t['’](?:as|es))(?=[^\p{L}]|$)/giu;

export type CharterIssue = { type: "style" | "structure"; severity: "warning"; excerpt: string; explanation: string };

const words = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

function around(text: string, index: number, len: number) {
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, index - 30)));
  return text.slice(start, index + len + 30).trim();
}

/** Contrôles automatiques de la charte sur un brouillon. Fonction pure (tests/charter.test.ts). */
export function charterCheck(v: { type: string; summary?: string | null; body?: string | null; faq?: unknown }): CharterIssue[] {
  const body = v.body ?? "";
  const text = `${v.summary ?? ""}\n${body}`;
  const issues: CharterIssue[] = [];

  for (const m of text.matchAll(FORBIDDEN)) {
    issues.push({ type: "style", severity: "warning", excerpt: around(text, m.index ?? 0, m[0].length), explanation: `Mot interdit par la charte : « ${m[0]} ».` });
  }
  const tu = [...text.matchAll(TUTOIEMENT)];
  if (tu.length) {
    const m = tu[0];
    issues.push({ type: "style", severity: "warning", excerpt: around(text, m.index ?? 0, m[0].length), explanation: `Tutoiement détecté (${tu.length} fois) : la charte impose le vouvoiement.` });
  }

  const target = TARGET_WORDS[v.type];
  if (target) {
    const n = words(text);
    if (n < target) issues.push({ type: "structure", severity: "warning", excerpt: `${n} mots`, explanation: `Longueur cible de la charte : ${target} mots au moins pour ce type de page.` });
    const faq = Array.isArray(v.faq) ? v.faq.length : 0;
    if (faq < 6) issues.push({ type: "structure", severity: "warning", excerpt: `${faq} question(s)`, explanation: "La charte prévoit une FAQ de 6 à 10 questions réelles." });
  }

  if (v.type === "software_review") {
    const h2 = (body.match(/^## /gm) ?? []).length;
    if (h2 < 5) issues.push({ type: "structure", severity: "warning", excerpt: `${h2} intertitre(s)`, explanation: "Un test comporte au moins une section par critère, plus les prix, les matchs et la méthode." });
    if (!/\]\(\/(comparer|logiciels\/[^)]+\/alternatives)/.test(body)) {
      issues.push({ type: "structure", severity: "warning", excerpt: "aucun lien /comparer/ ni /alternatives", explanation: "Chaque test doit ouvrir sur des comparatifs : matchs avec les solutions proches et page des alternatives." });
    }
  }
  return issues;
}
