import type { Metadata } from "next";
import type { Content, Site, FaqItem, Software, Category } from "@/lib/data";

export function siteUrl(site: Site) {
  return `https://${site.domain}${site.base_path ?? ""}`;
}

export function absoluteUrl(site: Site, path: string) {
  return `${siteUrl(site)}${path === "/" ? "" : path}` || siteUrl(site);
}

/** Métadonnées d'une page publiée : title, description, canonical, robots, Open Graph. */
export function contentMetadata(site: Site, c: Content, opts: { noindex?: boolean } = {}): Metadata {
  const url = absoluteUrl(site, c.path!);
  const index = c.robots === "index" && !opts.noindex;
  return {
    title: c.meta_title || c.h1 || site.name,
    description: c.meta_description || undefined,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: c.type === "guide" || c.type === "pillar" ? "article" : "website",
      url,
      siteName: site.name,
      title: c.meta_title || c.h1 || site.name,
      description: c.meta_description || undefined,
      locale: "fr_FR",
      modifiedTime: c.content_updated_at ?? undefined,
      publishedTime: c.first_published_at ?? undefined,
    },
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

export function ldArticle(site: Site, c: Content, author?: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: c.meta_description,
    url: absoluteUrl(site, c.path!),
    inLanguage: "fr-FR",
    datePublished: c.first_published_at,
    dateModified: c.content_updated_at ?? c.published_at,
    author: author ? { "@type": "Person", name: author } : { "@id": `${siteUrl(site)}#organization` },
    publisher: { "@id": `${siteUrl(site)}#organization` },
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

/**
 * Critique éditoriale d'un logiciel testé. Volontairement sans AggregateRating :
 * nous ne publions pas d'avis d'utilisateurs.
 */
export function ldSoftwareReview(site: Site, sw: Software, c: Content, opts: { score: number; author: string; category?: Category | null; minPrice?: number | null }): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: sw.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: opts.category?.name,
    operatingSystem: "Web",
    url: sw.website,
    ...(opts.minPrice != null
      ? { offers: { "@type": "Offer", price: String(opts.minPrice), priceCurrency: "EUR" } }
      : {}),
    review: {
      "@type": "Review",
      name: c.h1,
      url: absoluteUrl(site, c.path!),
      datePublished: c.first_published_at,
      author: { "@type": "Person", name: opts.author },
      publisher: { "@id": `${siteUrl(site)}#organization` },
      reviewRating: { "@type": "Rating", ratingValue: String(opts.score), bestRating: "10", worstRating: "0" },
    },
  };
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
