import { describe, expect, it } from "vitest";
import { absoluteUrl, brandTitle, contentMetadata, ldBreadcrumb, ldFaq, ldItemList, ldOffers, ldSoftwareReview } from "@/lib/seo";
import type { Content, Site, Software } from "@/lib/data";

const site = { id: "s", key: "daf", name: "Radar Finances", domain: "radarfinances.com", base_path: "", description: "d" } as Site;
const content = {
  id: "c", path: "/logiciels/x", type: "software_review", robots: "index", h1: "Avis X", meta_title: "Avis X 2026", meta_description: "desc",
  first_published_at: "2026-11-01T00:00:00Z", content_updated_at: "2026-11-02T00:00:00Z",
} as Content;

describe("métadonnées", () => {
  it("construit une URL canonique absolue", () => {
    expect(absoluteUrl(site, "/")).toBe("https://radarfinances.com");
    expect(absoluteUrl(site, "/methode")).toBe("https://radarfinances.com/methode");
  });
  it("respecte robots et canonical", () => {
    const m = contentMetadata(site, content);
    expect(m.alternates?.canonical).toBe("https://radarfinances.com/logiciels/x");
    expect(m.robots).toEqual({ index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 });
    expect(contentMetadata(site, { ...content, robots: "noindex" }).robots).toEqual({ index: false, follow: true });
  });
});

describe("données structurées", () => {
  it("fil d'Ariane ordonné avec URL absolues", () => {
    const ld = ldBreadcrumb(site, [{ name: "Accueil", path: "/" }, { name: "X", path: "/x" }]) as { itemListElement: { position: number; item: string }[] };
    expect(ld.itemListElement.map((i) => [i.position, i.item])).toEqual([[1, "https://radarfinances.com"], [2, "https://radarfinances.com/x"]]);
  });
  it("critique éditoriale sans AggregateRating", () => {
    const ld = ldSoftwareReview(site, { name: "X", website: "https://x.io" } as Software, content, { score: 8.1, author: "Camille" });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("AggregateRating");
    expect((ld as { review: { reviewRating: { ratingValue: string; bestRating: string } } }).review.reviewRating).toMatchObject({ ratingValue: "8.1", bestRating: "10" });
  });
  it("FAQ absente si vide, ItemList numérotée", () => {
    expect(ldFaq([])).toBeNull();
    const il = ldItemList(site, [{ name: "A", path: "/a" }, { name: "B", path: "/b" }]) as { numberOfItems: number };
    expect(il.numberOfItems).toBe(2);
  });
});

describe("titres et offres", () => {
  it("ajoute la marque seulement si le titre reste ≤ 60 caractères", () => {
    expect(brandTitle(site, "Avis X")).toBe(`Avis X | ${site.name}`);
    const long = "Logiciel de gestion de trésorerie : comparatif complet 2026";
    expect(brandTitle(site, long)).toBe(long);
  });
  it("offres : prix mini/maxi, période mensuelle, plans sur devis ignorés", () => {
    const plan = (name: string, price: number | null, billing_period = "month") =>
      ({ plan_name: name, price_eur: price, billing_period, per_unit: null, source_date: "2026-11-01" }) as never;
    const o = ldOffers([plan("A", 29), plan("B", 89), plan("Devis", null, "quote")], "https://x/prix") as Record<string, unknown>;
    expect(o).toMatchObject({ "@type": "AggregateOffer", lowPrice: "29", highPrice: "89", offerCount: 2 });
    expect((o.offers as Record<string, unknown>[])[0]).toMatchObject({ priceSpecification: { unitCode: "MON" } });
    expect(ldOffers([plan("Devis", null, "quote")], "https://x")).toBeNull();
  });
});
