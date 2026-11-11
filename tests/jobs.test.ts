import { afterEach, describe, expect, it, vi } from "vitest";
import { checkJobOffer, departmentOf, familyOf, jobPostingLd, jobSlug, mapFtOffer, parseSalary, universeOf } from "@/lib/jobs";
import { fetchFinanceOffers } from "@/lib/francetravail";
import { checkoutParams, createCheckout, signStripePayload, verifyStripeSignature } from "@/lib/stripe";

const desc = "Au sein de la direction financière d'une PME industrielle, vous êtes responsable de la clôture mensuelle, du reporting et du budget. "
  + "Vous travaillez avec les opérationnels pour analyser les écarts et proposer des actions. Vous maîtrisez Excel et un ERP. "
  + "Poste en CDI basé à Lyon, télétravail deux jours par semaine, rémunération selon profil et expérience.";
const ok = { title: "Contrôleur de gestion H/F", description: desc, apply_url: "https://exemple.test/postuler", company_siren: "552100554" };

describe("métiers", () => {
  it("classe les intitulés finance et écarte le reste", () => {
    expect(familyOf("Directeur Administratif et Financier H/F")).toBe("direction-financiere");
    expect(familyOf("RAF - Responsable administratif et financier")).toBe("direction-financiere");
    expect(familyOf("Contrôleur de gestion industriel (H/F)")).toBe("controle-gestion");
    expect(familyOf("Comptable fournisseurs H/F")).toBe("comptabilite");
    expect(familyOf("Auditeur interne H/F")).toBe("audit");
    expect(familyOf("Credit manager H/F")).toBe("tresorerie");
    expect(familyOf("Développeur backend Python H/F")).toBeNull();
  });
});

describe("univers finance", () => {
  it("range chaque poste dans un des 8 univers", () => {
    expect(universeOf("Comptable fournisseurs H/F")).toBe("depenses-achats");
    expect(universeOf("Chargé de recouvrement H/F")).toBe("encaissement");
    expect(universeOf("Trésorier groupe H/F")).toBe("tresorerie-cash");
    expect(universeOf("Contrôleur de gestion industriel H/F")).toBe("pilotage-performance");
    expect(universeOf("Directeur administratif et financier H/F")).toBe("equipe-expertise");
    expect(universeOf("Collaborateur comptable en cabinet H/F")).toBe("equipe-expertise");
    expect(universeOf("Consultant CIR / CII H/F")).toBe("financement-aides-risques");
    expect(universeOf("Responsable reporting extra-financier CSRD H/F")).toBe("rse-performance-durable");
    expect(universeOf("Comptable général H/F")).toBe("comptabilite-conformite");
    expect(universeOf("Auditeur interne H/F")).toBe("comptabilite-conformite");
  });
  it("écarte les postes de vente bancaire, d'assurance ou de crédit et les autres métiers", () => {
    for (const t of ["Conseiller bancaire H/F", "Conseiller financier en agence H/F", "Chargé de clientèle assurance H/F", "Gestionnaire de patrimoine H/F",
      "Comptable en agence bancaire H/F", "Chef de rayon H/F", "Développeur Python H/F"]) expect(universeOf(t)).toBeNull();
  });
});

describe("contrôles légaux", () => {
  it("accepte une offre conforme", () => expect(checkJobOffer(ok).errors).toEqual([]));
  it("exige H/F, une longueur suffisante et un moyen de candidater", () => {
    const r = checkJobOffer({ title: "Contrôleur de gestion", description: "Trop court.", apply_url: null, apply_email: null });
    expect(r.errors.join(" ")).toMatch(/H\/F/);
    expect(r.errors.join(" ")).toMatch(/300 caractères/);
    expect(r.errors.join(" ")).toMatch(/candidature/);
  });
  it("refuse un critère d'âge mais pas une durée d'expérience", () => {
    expect(checkJobOffer({ ...ok, description: desc + " Candidat âgé de 25 à 35 ans." }).errors.join(" ")).toMatch(/âge/);
    expect(checkJobOffer({ ...ok, description: desc + " Moins de 30 ans." }).errors.join(" ")).toMatch(/âge/);
    expect(checkJobOffer({ ...ok, description: desc + " Plus de 10 ans d'expérience." }).errors).toEqual([]);
  });
  it("refuse nationalité et sexe, signale « jeune »", () => {
    expect(checkJobOffer({ ...ok, description: desc + " Nationalité française exigée." }).errors.length).toBeGreaterThan(0);
    expect(checkJobOffer({ ...ok, description: desc + " Poste réservé aux hommes." }).errors.length).toBeGreaterThan(0);
    expect(checkJobOffer({ ...ok, description: desc + " Idéal pour un jeune diplômé." }).warnings.length).toBe(1);
  });
  it("exige une offre en français et un métier de la finance", () => {
    const en = "We are looking for a financial controller to join our team. You will own the monthly close, budgeting and forecasting. ".repeat(4);
    expect(checkJobOffer({ ...ok, description: en }).errors.join(" ")).toMatch(/français/);
    expect(checkJobOffer({ ...ok, title: "Chef de rayon H/F" }).errors.join(" ")).toMatch(/univers finance/);
    expect(checkJobOffer({ ...ok, title: "Conseiller bancaire H/F" }).errors.join(" ")).toMatch(/univers finance/);
  });
});

describe("France Travail", () => {
  const offer = {
    id: "201ABCD", intitule: "Comptable (H/F)", description: desc, dateCreation: "2026-11-10T08:00:00.000Z",
    lieuTravail: { libelle: "69 - LYON 03", latitude: 45.76, longitude: 4.85, codePostal: "69003" }, entreprise: { nom: "ACME" },
    typeContrat: "CDD", salaire: { libelle: "Annuel de 38000.0 Euros à 45000.0 Euros sur 12.0 mois" },
    contact: { urlPostulation: "https://exemple.test/apply" }, origineOffre: { urlOrigine: "https://candidat.francetravail.fr/offres/recherche/detail/201ABCD" },
  };
  it("convertit une offre", () => {
    const r = mapFtOffer(offer)!;
    expect(r).toMatchObject({ external_id: "201ABCD", family: "comptabilite", universe_slug: "comptabilite-conformite", contract: "cdd", city: "LYON 03", postal_code: "69003",
      department: "69", salary_min: 38000, salary_max: 45000, company_name: "ACME", apply_url: "https://exemple.test/apply" });
    expect(r.slug).toMatch(/^comptable-lyon-03-201abcd$/);
  });
  it("écarte une offre hors finance ou incomplète", () => {
    expect(mapFtOffer({ ...offer, intitule: "Boulanger (H/F)" })).toBeNull();
    expect(mapFtOffer({ ...offer, id: undefined })).toBeNull();
  });
  it("utilitaires : salaire, département, slug", () => {
    expect(parseSalary("Mensuel de 2500 Euros")).toEqual({ min: null, max: null });
    expect(departmentOf("20090")).toBe("2A"); expect(departmentOf("20200")).toBe("2B"); expect(departmentOf("97400")).toBe("974");
    expect(jobSlug("DAF (H/F)", "Paris", "x1")).toBe("daf-paris-x1");
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("pagine, dédoublonne et filtre les offres de l'API", async () => {
    vi.stubEnv("FRANCE_TRAVAIL_CLIENT_ID", "id"); vi.stubEnv("FRANCE_TRAVAIL_CLIENT_SECRET", "secret");
    const calls: string[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.includes("access_token")) {
        expect(String(init?.body)).toContain("scope=api_offresdemploiv2+o2dsoffre");
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer tok");
      if (url.includes("motsCles=comptable")) return new Response(JSON.stringify({ resultats: [offer, { ...offer, id: "X2", intitule: "Boulanger H/F" }] }), { status: 206, headers: { "content-range": "offres 0-1/2" } });
      if (url.includes("motsCles=tr%C3%A9sorier")) return new Response(JSON.stringify({ resultats: [offer] }), { status: 200, headers: { "content-range": "offres 0-0/1" } });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    const r = await fetchFinanceOffers(3, fetcher);
    expect(r.fetched).toBe(3);
    expect(r.rows.map((x) => x.external_id)).toEqual(["201ABCD"]);
    expect(calls.some((c) => c.includes("publieeDepuis=3") && c.includes("range=0-149"))).toBe(true);
  });
  it("refuse de tourner sans identifiants", async () => {
    await expect(fetchFinanceOffers(3, (async () => new Response("{}")) as typeof fetch)).rejects.toThrow(/non configurés/);
  });
});

describe("Stripe", () => {
  it("vérifie la signature du webhook et refuse une signature fausse ou ancienne", () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    expect(verifyStripeSignature(body, signStripePayload(body, "whsec_test"), "whsec_test")).toBe(true);
    expect(verifyStripeSignature(body + " ", signStripePayload(body, "whsec_test"), "whsec_test")).toBe(false);
    expect(verifyStripeSignature(body, signStripePayload(body, "autre"), "whsec_test")).toBe(false);
    expect(verifyStripeSignature(body, signStripePayload(body, "whsec_test", 1000), "whsec_test")).toBe(false);
    expect(verifyStripeSignature(body, null, "whsec_test")).toBe(false);
  });
  it("prépare un paiement HT avec TVA, facture et commande rattachée", () => {
    const p = checkoutParams({ orderId: "o1", label: "Annonce", amountCents: 19000, email: "a@b.fr", successUrl: "https://x/ok", cancelUrl: "https://x/ko" }, "txr_1");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("19000");
    expect(p.get("line_items[0][tax_rates][0]")).toBe("txr_1");
    expect(p.get("invoice_creation[enabled]")).toBe("true");
    expect(p.get("metadata[order_id]")).toBe("o1");
  });
  it("crée la session et renvoie l'adresse de paiement", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x"); vi.stubEnv("STRIPE_TAX_RATE_ID", "txr_1");
    const s = await createCheckout({ orderId: "o1", label: "A", amountCents: 100, email: "a@b.fr", successUrl: "https://x", cancelUrl: "https://y" },
      (async (_u: string, init?: RequestInit) => {
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer sk_test_x");
        return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" }), { status: 200 });
      }) as typeof fetch);
    expect(s).toEqual({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" });
  });
});

describe("données structurées", () => {
  it("produit un JobPosting complet", () => {
    const ld = jobPostingLd({ title: "DAF H/F", description: "a\nb", published_at: "2026-11-11", expires_at: "2026-12-11", company_name: "ACME",
      city: "Lyon", postal_code: "69003", contract: "cdi", remote: "partiel", salary_min: 80000, salary_max: 95000, apply_url: "https://x" }, "https://radarfinances.com/emplois/daf");
    expect(ld).toMatchObject({ "@type": "JobPosting", employmentType: "FULL_TIME", validThrough: "2026-12-11", description: "a<br>b" });
    expect((ld as { baseSalary: { value: { minValue: number } } }).baseSalary.value.minValue).toBe(80000);
  });
});
