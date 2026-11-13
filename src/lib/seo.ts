import type { Metadata } from "next";
import type { Content, Site, FaqItem, Software, Category, PricingPlan, TestRun } from "@/lib/data";

export function siteUrl(site: Site) {
  return `https://${site.domain}${site.base_path ?? ""}`;
}

export function absoluteUrl(site: Site, path: string) {
  return `${siteUrl(site)}${path === "/" ? "" : path}` || siteUrl(site);
}

/** Image de partage générée pour une page (route /api/og). */
export function ogImage(site: Site, title: string, kind?: string) {
  const q = new URLSearchParams({ site: site.key, t: title, ...(kind ? { k: kind } : {}) });
  return { url: `${siteUrl(site)}/api/og?${q}`, width: 1200, height: 630, alt: title };
}

/** Robots des pages indexables : grande image en aperçu, extraits sans limite (Google, Discover, moteurs IA). */
const ROBOTS_INDEX = { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } as const;
const ROBOTS_NOINDEX = { index: false, follow: true } as const;

/** Ajoute « | Marque » quand le titre reste ≤ 60 caractères (au-delà, Google le tronquerait). */
export function brandTitle(site: Site, title: string) {
  const branded = `${title} | ${site.name}`;
  return title.includes(site.name) || branded.length > 60 ? title : branded;
}

/** Métadonnées des pages hors contenus éditoriaux (publicité, lexique, formulaires…). */
export function staticMetadata(site: Site, path: string, title: string, description: string, opts: { noindex?: boolean; canonicalPath?: string } = {}): Metadata {
  const url = absoluteUrl(site, path);
  const canonical = absoluteUrl(site, opts.canonicalPath ?? path);
  const full = brandTitle(site, title);
  const image = ogImage(site, title);
  return {
    title: { absolute: full }, description,
    alternates: { canonical },
    robots: opts.noindex ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    openGraph: { type: "website", url, siteName: site.name, title: full, description, locale: "fr_FR", images: [image] },
    twitter: { card: "summary_large_image", title: full, description, images: [{ url: image.url, alt: image.alt }] },
  };
}

/** Métadonnées d'une page publiée : title, description, canonical, robots, Open Graph, carte X/Twitter. */
export function contentMetadata(site: Site, c: Content, opts: { noindex?: boolean } = {}): Metadata {
  const url = absoluteUrl(site, c.path!);
  const index = c.robots === "index" && !opts.noindex;
  const title = brandTitle(site, c.meta_title || c.h1 || site.name);
  const description = c.meta_description || undefined;
  const image = ogImage(site, c.h1 || title, CONTENT_TYPE_LABEL[c.type!]);
  const isArticle = c.type !== "home";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: index ? ROBOTS_INDEX : ROBOTS_NOINDEX,
    openGraph: {
      type: isArticle ? "article" : "website",
      url,
      siteName: site.name,
      title,
      description,
      locale: "fr_FR",
      ...(isArticle
        ? { publishedTime: c.first_published_at ?? undefined, modifiedTime: c.content_updated_at ?? c.published_at ?? undefined, section: CONTENT_TYPE_LABEL[c.type!] }
        : {}),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image.url, alt: image.alt }] },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD (générés depuis la base ; validés par les tests)
// ---------------------------------------------------------------------------
type Ld = Record<string, unknown>;

export function ldOrganization(site: Site): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl(site)}#organization`,
    name: site.name,
    url: siteUrl(site),
    description: site.description,
    logo: { "@type": "ImageObject", url: `${siteUrl(site)}/api/icon?site=${site.key}&s=512`, width: 512, height: 512 },
    // Signaux de confiance (E-E-A-T) lus par les moteurs et les assistants IA
    publishingPrinciples: absoluteUrl(site, "/methode"),
    correctionsPolicy: absoluteUrl(site, "/signaler-une-erreur"),
    ownershipFundingInfo: absoluteUrl(site, "/publicite"),
  };
}

export function ldWebsite(site: Site): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl(site)}#website`,
    name: site.name,
    url: siteUrl(site),
    inLanguage: "fr-FR",
    publisher: { "@id": `${siteUrl(site)}#organization` },
  };
}

export function ldBreadcrumb(site: Site, crumbs: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(site, c.path),
    })),
  };
}

/** Auteur : personne nommée (avec fonction) ou, à défaut, la rédaction. */
function ldAuthor(site: Site, author?: string | { name: string; title?: string | null }) {
  if (!author) return { "@id": `${siteUrl(site)}#organization` };
  const a = typeof author === "string" ? { name: author } : author;
  return { "@type": "Person", name: a.name, ...(a.title ? { jobTitle: a.title } : {}), worksFor: { "@id": `${siteUrl(site)}#organization` } };
}

export function ldArticle(site: Site, c: Content, author?: string | { name: string; title?: string | null }, opts: { about?: string[] } = {}): Ld {
  const url = absoluteUrl(site, c.path!);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: c.meta_description,
    url,
    mainEntityOfPage: url,
    image: ogImage(site, c.h1 ?? site.name, CONTENT_TYPE_LABEL[c.type!]).url,
    inLanguage: "fr-FR",
    articleSection: CONTENT_TYPE_LABEL[c.type!],
    datePublished: c.first_published_at,
    dateModified: c.content_updated_at ?? c.published_at,
    author: ldAuthor(site, author),
    publisher: { "@id": `${siteUrl(site)}#organization` },
    ...(opts.about?.length ? { about: opts.about.map((name) => ({ "@type": "SoftwareApplication", name })) } : {}),
  };
}

export function ldFaq(faq: FaqItem[]): Ld | null {
  if (!faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

const PERIOD: Record<string, string> = { month: "MON", year: "ANN" };

/** Offre schema.org d'un plan tarifaire (prix HT, période de facturation, source datée). */
function ldOffer(p: PricingPlan, url: string): Ld | null {
  if (p.price_eur == null) return null;
  const unit = PERIOD[p.billing_period];
  return {
    "@type": "Offer",
    name: p.plan_name,
    price: String(p.price_eur),
    priceCurrency: "EUR",
    url,
    availability: "https://schema.org/InStock",
    validFrom: p.source_date,
    ...(unit
      ? { priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.price_eur), priceCurrency: "EUR", unitCode: unit, valueAddedTaxIncluded: false, ...(p.per_unit ? { unitText: p.per_unit } : {}) } }
      : {}),
  };
}

/** Offres d'un logiciel : AggregateOffer (prix mini/maxi) et détail de chaque plan chiffré. */
export function ldOffers(plans: PricingPlan[], url: string): Ld | null {
  const offers = plans.map((p) => ldOffer(p, url)).filter(Boolean) as Ld[];
  if (!offers.length) return null;
  const prices = offers.map((o) => Number(o.price));
  return { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: String(Math.min(...prices)), highPrice: String(Math.max(...prices)), offerCount: offers.length, offers };
}

function ldApp(site: Site, sw: Software, opts: { category?: Category | null; plans?: PricingPlan[] }): Ld {
  const pricingUrl = absoluteUrl(site, `/logiciels/${sw.slug}/prix`);
  const offers = opts.plans ? ldOffers(opts.plans, pricingUrl) : null;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: sw.name,
    description: sw.tagline ?? undefined,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: opts.category?.name,
    operatingSystem: "Web",
    url: sw.website,
    image: ogImage(site, sw.name, "Logiciel").url,
    ...(offers ? { offers } : {}),
  };
}

/**
 * Critique éditoriale d'un logiciel testé. Volontairement sans AggregateRating :
 * nous ne publions pas d'avis d'utilisateurs. Points forts / faibles en positiveNotes / negativeNotes.
 */
export function ldSoftwareReview(
  site: Site, sw: Software, c: Content,
  opts: { score: number; author: string | { name: string; title?: string | null }; category?: Category | null; plans?: PricingPlan[]; test?: TestRun | null },
): Ld {
  const list = (items: string[] | null | undefined) =>
    items?.length ? { "@type": "ItemList", itemListElement: items.map((name, i) => ({ "@type": "ListItem", position: i + 1, name })) } : undefined;
  return {
    ...ldApp(site, sw, opts),
    review: {
      "@type": "Review",
      name: c.h1,
      url: absoluteUrl(site, c.path!),
      reviewBody: opts.test?.verdict ?? c.summary ?? undefined,
      datePublished: c.first_published_at,
      dateModified: c.content_updated_at ?? c.published_at,
      inLanguage: "fr-FR",
      author: ldAuthor(site, opts.author),
      publisher: { "@id": `${siteUrl(site)}#organization` },
      reviewRating: { "@type": "Rating", ratingValue: String(opts.score), bestRating: "10", worstRating: "0" },
      positiveNotes: list(opts.test?.pros),
      negativeNotes: list(opts.test?.cons),
    },
  };
}

/** Page « Prix » : le logiciel et le détail de ses offres (sans note). */
export function ldPricing(site: Site, sw: Software, plans: PricingPlan[], category?: Category | null): Ld {
  return ldApp(site, sw, { category, plans });
}

export function ldItemList(site: Site, items: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(site, it.path) })),
  };
}

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  home: "Accueil",
  software_review: "Avis",
  pricing: "Prix",
  alternatives: "Alternatives",
  category_ranking: "Comparatif",
  facet_landing: "Sélection",
  duel: "Duel",
  guide: "Guide",
  pillar: "Dossier",
  simulator: "Simulateur",
  resource: "Ressource",
  provider_directory: "Annuaire",
  glossary: "Lexique",
  page: "Page",
};
