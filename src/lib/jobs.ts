/**
 * Jobs : métiers de la finance, contrôles légaux d'une offre (Code du travail), conversion des offres France Travail.
 * Module pur (sans accès réseau ni base) : testé par tests/jobs.test.ts.
 */

export const FAMILIES = [
  ["direction-financiere", "Direction financière"],
  ["controle-gestion", "Contrôle de gestion"],
  ["comptabilite", "Comptabilité"],
  ["audit", "Audit et contrôle interne"],
  ["tresorerie", "Trésorerie et crédit management"],
  ["analyse-financiere", "Analyse financière et consolidation"],
  ["fiscalite", "Fiscalité"],
] as const;
export type Family = (typeof FAMILIES)[number][0];

export const CONTRACTS = [
  ["cdi", "CDI"], ["cdd", "CDD"], ["interim", "Intérim"], ["stage", "Stage"], ["alternance", "Alternance"],
  ["freelance", "Indépendant"], ["autre", "Autre"],
] as const;
export type Contract = (typeof CONTRACTS)[number][0];
export const REMOTES = [["non", "Sur site"], ["partiel", "Télétravail partiel"], ["total", "Télétravail complet"]] as const;

export const familyLabel = (k: string | null) => FAMILIES.find(([v]) => v === k)?.[1] ?? "Finance";
export const contractLabel = (k: string | null) => CONTRACTS.find(([v]) => v === k)?.[1] ?? "—";

/** Métier déduit de l'intitulé ; null = hors finance (offre écartée à l'import). L'ordre compte : le plus spécifique d'abord. */
const RULES: [Family, RegExp][] = [
  ["direction-financiere", /\b(daf|raf|cfo|directeur|directrice)\b.*\b(financ|administratif)|\bdirect(eur|rice) (administratif|administrative) et financi|\bresponsable administratif et financier|\bdirection financi/i],
  ["controle-gestion", /contr[ôo]l(eur|euse|e) de gestion|\bfp&?a\b|business partner financ|\bcontr[ôo]leur financier|\bcontr[ôo]leuse financi/i],
  ["audit", /\baudit|commissaire aux comptes|contr[ôo]le interne|\bconformit[ée] financ/i],
  ["tresorerie", /tr[ée]sori(er|[èe]re|erie)|cash manag|credit manag|recouvrement|poste clients?\b/i],
  ["analyse-financiere", /analyste financ|consolid|reporting financ|ing[ée]nieur financ/i],
  ["fiscalite", /fiscalist|juriste fiscal|\bfiscalit[ée]/i],
  ["comptabilite", /comptab|\bcomptable|aide[- ]comptable|collaborat(eur|rice) (comptable|cabinet)|gestionnaire comptable|r[ée]viseur comptable/i],
];
export function familyOf(title: string): Family | null {
  for (const [f, re] of RULES) if (re.test(title)) return f;
  return null;
}

// ---------------------------------------------------------------------------
// Univers de Radar Finances : une offre n'est retenue que si elle relève de l'un des 8 univers
// ---------------------------------------------------------------------------
export const UNIVERSES = [
  ["comptabilite-conformite", "Comptabilité, clôture & conformité", "comptabilité générale, clôture, consolidation, audit et contrôle interne, fiscalité, facturation électronique"],
  ["tresorerie-cash", "Trésorerie & cash", "trésorerie, cash management, relations bancaires côté entreprise, prévention de la fraude aux paiements"],
  ["depenses-achats", "Dépenses & achats", "comptabilité fournisseurs, notes de frais, procure-to-pay, contrôle des dépenses"],
  ["encaissement", "Encaissement (Order-to-Cash)", "comptabilité clients, facturation, recouvrement, credit management"],
  ["pilotage-performance", "Pilotage & performance", "contrôle de gestion, FP&A, budget, reporting, business intelligence financière"],
  ["equipe-expertise", "Équipe finance & expertise", "direction financière (DAF, RAF, CFO), cabinets d'expertise comptable et de commissariat aux comptes, management de transition"],
  ["financement-aides-risques", "Financement, aides & risques", "CIR/CII, subventions, gestion des risques de l'entreprise (jamais la vente de crédit, d'assurance ou de placements)"],
  ["rse-performance-durable", "RSE & performance durable", "reporting extra-financier, CSRD, bilan carbone, contrôle de gestion RSE"],
] as const;
export type Universe = (typeof UNIVERSES)[number][0];
export const universeLabel = (k: string | null) => UNIVERSES.find(([v]) => v === k)?.[1] ?? "—";

/** Postes hors finance d'entreprise : vente de produits bancaires, d'assurance ou de crédit (règle 5), commerce, immobilier. */
const OUT_OF_SCOPE = /\b(banque|bancaire|agence|conseill(er|[èe]re) (client|financier|financi[èe]re|patrimon|commercial|bancaire|en (gestion de )?patrimoine|en investissement)|charg[ée]e? de client[èe]le|gestionnaire de patrimoine|courti(er|[èe]re)|assurances?|souscript|cr[ée]dit (immobilier|conso)|commercial|vendeu(r|se)|caissi(er|[èe]re)|t[ée]l[ée]conseill|immobili|gestionnaire locati|syndic|trader|actuaire)\b/i;

const UNIVERSE_RULES: [Universe, RegExp][] = [
  ["rse-performance-durable", /\b(csrd|esg|rse|extra[- ]financ|bilan carbone|durabilit[ée]|climat)\b/i],
  ["financement-aides-risques", /\b(cir|cii|cr[ée]dit d['’]imp[ôo]t recherche|subventions?|risk manag|gestion des risques|responsable des risques)\b/i],
  ["depenses-achats", /comptable (fournisseurs?|achats?)|comptabilit[ée] fournisseurs?|accounts? payable|\bp2p\b|procure[- ]to[- ]pay|notes? de frais/i],
  ["encaissement", /comptable clients?|comptabilit[ée] clients?|credit manag|recouvrement|cash collect|poste clients?|gestionnaire (de )?facturation|charg[ée]e? de facturation|assistant(e)? facturation|order[- ]to[- ]cash/i],
  ["tresorerie-cash", /tr[ée]sori(er|[èe]re|erie)|cash manag|front office tr[ée]so/i],
  ["pilotage-performance", /contr[ôo]l(eur|euse|e) de gestion|\bfp&?a\b|business partner|analyste financ|contr[ôo]leu(r|se) financ|reporting financ|responsable budget/i],
  ["equipe-expertise", /\b(daf|raf|cfo)\b|direct(eur|rice) (administratif|administrative|financ)|responsable administratif et financier|expert[- ]comptable|commissaire aux comptes|collaborat(eur|rice) (comptable|cabinet|expert)|mission comptable|auditeur (externe|financier)|management de transition/i],
  ["comptabilite-conformite", /comptab|\bcomptable|consolid|cl[ôo]ture|audit|contr[ôo]le interne|fiscal|r[ée]viseur/i],
];

/** Univers de l'offre d'après son intitulé ; null = hors des univers finance (offre écartée). */
export function universeOf(title: string): Universe | null {
  if (OUT_OF_SCOPE.test(title)) return null;
  for (const [u, re] of UNIVERSE_RULES) if (re.test(title)) return u;
  return null;
}
const FAMILY_OF_UNIVERSE: Record<Universe, Family> = {
  "comptabilite-conformite": "comptabilite", "tresorerie-cash": "tresorerie", "depenses-achats": "comptabilite", encaissement: "tresorerie",
  "pilotage-performance": "controle-gestion", "equipe-expertise": "direction-financiere", "financement-aides-risques": "analyse-financiere",
  "rse-performance-durable": "analyse-financiere",
};
export const familyFor = (title: string, universe: Universe): Family => familyOf(title) ?? FAMILY_OF_UNIVERSE[universe];

// ---------------------------------------------------------------------------
// Contrôles légaux (Code du travail, art. L1132-1, L5331-1 à L5331-6)
// ---------------------------------------------------------------------------
export type JobDraft = {
  title: string; description: string; company_name?: string | null; company_siren?: string | null;
  city?: string | null; contract?: string | null; salary_min?: number | null; salary_max?: number | null;
  apply_url?: string | null; apply_email?: string | null;
};
export type CheckResult = { errors: string[]; warnings: string[] };

const BLOCKING: [RegExp, string][] = [
  [/\b[âa]g[ée]e?s?\s+(de|entre|d['’]au moins|de moins|de plus)\b|\b(moins|plus) de \d{2}\s*ans(?!\s*d['’]exp)|\b\d{2}\s*[-à]\s*\d{2}\s*ans\b(?!\s*d['’]exp)|\blimite d['’][âa]ge\b/i,
    "L'offre ne peut pas fixer d'âge (art. L5331-2 du Code du travail)."],
  [/\bnationalit[ée] fran[çc]aise (exig|requis|obligatoire)|\bde nationalit[ée]\b/i, "L'offre ne peut pas exiger une nationalité (art. L1132-1)."],
  [/\b(homme|femme)s? (uniquement|exclusivement|seulement)\b|\b(r[ée]serv[ée]e? aux|exclusivement aux?) (hommes|femmes)\b/i,
    "L'offre ne peut pas être réservée à un sexe (art. L1142-1)."],
  [/\b(physique|apparence) (agr[ée]able|avenant)|\bbonne pr[ée]sentation physique\b/i, "Critère d'apparence physique interdit (art. L1132-1)."],
  [/\b(religion|orientation sexuelle|situation de famille|enceinte|origine ethnique)\b/i, "Critère discriminatoire interdit (art. L1132-1)."],
];
const WARNINGS: [RegExp, string][] = [
  [/\bjeunes?\b(?! entreprise| soci[ée]t[ée]| [ée]quipe| start)/i, "« Jeune » peut être lu comme un critère d'âge : préférez « débutant accepté »."],
];
const FRENCH = /\b(le|la|les|des|du|une|et|est|pour|avec|vous|nous|dans|sur|votre|poste)\b/gi;

export function checkJobOffer(d: JobDraft): CheckResult {
  const errors: string[] = [], warnings: string[] = [];
  const title = d.title.trim(), body = `${title}\n${d.description}`;
  if (title.length < 5 || title.length > 120) errors.push("L'intitulé doit faire entre 5 et 120 caractères.");
  if (!/\b(h\s*\/\s*f|f\s*\/\s*h)\b/i.test(title)) errors.push("Ajoutez « H/F » à l'intitulé : l'offre doit être ouverte aux femmes et aux hommes.");
  if (d.description.trim().length < 300) errors.push("La description doit faire au moins 300 caractères (missions, profil, conditions).");
  if (d.description.length > 10000) errors.push("La description ne doit pas dépasser 10 000 caractères.");
  for (const [re, msg] of BLOCKING) if (re.test(body)) errors.push(msg);
  for (const [re, msg] of WARNINGS) if (re.test(body)) warnings.push(msg);
  const words = d.description.split(/\s+/).filter(Boolean).length;
  if (words > 50 && (d.description.match(FRENCH)?.length ?? 0) / words < 0.04)
    errors.push("L'offre doit être rédigée en français (art. L5331-4).");
  if (!universeOf(title)) errors.push("L'intitulé doit relever d'un des univers finance du site (comptabilité, trésorerie, dépenses, encaissement, contrôle de gestion, direction financière, aides et risques, RSE). Les postes de vente de produits bancaires, d'assurance ou de crédit sont exclus.");
  if (d.company_siren != null && !/^[0-9]{9}$/.test(d.company_siren)) errors.push("Le SIREN doit compter 9 chiffres.");
  if (d.salary_min != null && d.salary_max != null && d.salary_min > d.salary_max) errors.push("Le salaire minimum dépasse le maximum.");
  if (!d.apply_url && !d.apply_email) errors.push("Indiquez un lien ou un e-mail de candidature.");
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/g, "");
}
export function jobSlug(title: string, city: string | null | undefined, suffix: string) {
  const base = slugify(`${title.replace(/\(?\s*[hf]\s*\/\s*[hf]\s*\)?/gi, "")} ${city ?? ""}`) || "offre";
  return `${base}-${slugify(suffix).slice(0, 12)}`;
}
export function departmentOf(postal: string | null | undefined): string | null {
  if (!postal || !/^[0-9]{5}$/.test(postal)) return null;
  if (postal.startsWith("97") || postal.startsWith("98")) return postal.slice(0, 3);
  if (postal.startsWith("20")) return Number(postal) < 20200 ? "2A" : "2B";
  return postal.slice(0, 2);
}
/** « Annuel de 38000.0 Euros à 45000.0 Euros sur 12.0 mois » → { min: 38000, max: 45000 } (annuel uniquement). */
export function parseSalary(libelle: string | null | undefined): { min: number | null; max: number | null } {
  const m = /^Annuel de ([\d.]+) Euros(?: à ([\d.]+) Euros)?/i.exec(libelle ?? "");
  if (!m) return { min: null, max: null };
  const min = Math.round(Number(m[1])), max = m[2] ? Math.round(Number(m[2])) : null;
  return { min: Number.isFinite(min) && min > 0 && min < 1_000_000 ? min : null, max: max && max < 1_000_000 ? max : null };
}

// ---------------------------------------------------------------------------
// France Travail : offre de l'API « Offres d'emploi v2 » → ligne job_offers
// ---------------------------------------------------------------------------
export type FtOffer = {
  id?: string; intitule?: string; description?: string; dateCreation?: string;
  lieuTravail?: { libelle?: string; latitude?: number; longitude?: number; codePostal?: string };
  entreprise?: { nom?: string };
  typeContrat?: string; alternance?: boolean; experienceLibelle?: string;
  salaire?: { libelle?: string };
  contact?: { urlPostulation?: string };
  origineOffre?: { urlOrigine?: string };
};
const FT_CONTRACT: Record<string, Contract> = { CDI: "cdi", CDD: "cdd", MIS: "interim", DIN: "interim", LIB: "freelance" };

export function mapFtOffer(o: FtOffer) {
  const title = (o.intitule ?? "").trim().slice(0, 160);
  const universe = universeOf(title);
  const description = (o.description ?? "").trim();
  if (!o.id || !/^[A-Za-z0-9]{3,40}$/.test(o.id) || !universe || title.length < 5 || description.length < 50) return null;
  const family = familyFor(title, universe);
  const libelle = o.lieuTravail?.libelle ?? "";
  const city = (libelle.includes(" - ") ? libelle.split(" - ").slice(1).join(" - ") : libelle).trim().slice(0, 120) || null;
  const postal = /^[0-9]{5}$/.test(o.lieuTravail?.codePostal ?? "") ? o.lieuTravail!.codePostal! : null;
  const salary = parseSalary(o.salaire?.libelle);
  const https = (u?: string) => (u && /^https?:\/\//.test(u) ? u.slice(0, 1000) : null);
  const coord = (n?: number) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null);
  return {
    external_id: o.id, slug: jobSlug(title, city, o.id), title, company_name: o.entreprise?.nom?.slice(0, 200) ?? null,
    city, postal_code: postal, department: departmentOf(postal) ?? (/^(\d{2}|2A|2B|97\d) - /.exec(libelle)?.[1] ?? null),
    latitude: coord(o.lieuTravail?.latitude), longitude: coord(o.lieuTravail?.longitude), family, universe_slug: universe,
    contract: o.alternance ? "alternance" : (FT_CONTRACT[o.typeContrat ?? ""] ?? "autre"),
    experience: o.experienceLibelle?.slice(0, 100) ?? null, salary_min: salary.min, salary_max: salary.max,
    salary_text: o.salaire?.libelle?.slice(0, 200) ?? null, description: description.slice(0, 15000),
    apply_url: https(o.contact?.urlPostulation) ?? https(o.origineOffre?.urlOrigine),
    source_url: https(o.origineOffre?.urlOrigine), source_created_at: o.dateCreation ?? null,
  };
}

/** Données structurées JobPosting (Google pour l'emploi). */
export function jobPostingLd(j: {
  title: string; description: string; published_at: string | null; expires_at: string | null; company_name: string | null;
  city: string | null; postal_code: string | null; contract: string; remote: string | null;
  salary_min: number | null; salary_max: number | null; apply_url: string | null;
}, url: string) {
  const type: Record<string, string> = { cdi: "FULL_TIME", cdd: "TEMPORARY", interim: "TEMPORARY", stage: "INTERN", alternance: "INTERN", freelance: "CONTRACTOR", autre: "OTHER" };
  return {
    "@context": "https://schema.org", "@type": "JobPosting", title: j.title, description: j.description.replace(/\n/g, "<br>"),
    datePosted: j.published_at, validThrough: j.expires_at, employmentType: type[j.contract] ?? "OTHER", url,
    hiringOrganization: { "@type": "Organization", name: j.company_name ?? "Entreprise confidentielle" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.city ?? undefined, postalCode: j.postal_code ?? undefined, addressCountry: "FR" } },
    ...(j.remote === "total" ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "France" } } : {}),
    ...(j.salary_min ? { baseSalary: { "@type": "MonetaryAmount", currency: "EUR", value: { "@type": "QuantitativeValue", minValue: j.salary_min, maxValue: j.salary_max ?? j.salary_min, unitText: "YEAR" } } } : {}),
    ...(j.apply_url ? { directApply: false } : {}),
  };
}
