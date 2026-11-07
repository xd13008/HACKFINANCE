import { ContentArticle } from "@/components/public/ContentArticle";
import { CapitalGainsSimulator, ValuationSimulator } from "@/components/public/Simulators";
import { getContentById } from "@/lib/data";
import { loadPage, metadataFor, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "simulator"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/outils/${p.slug}`);
}

type SimData = { kind?: string; disclaimer?: string; sectors?: { key: string; label: string; ebitda_low: number; ebitda_high: number }[];
  ir_rate?: number; ps_rate?: number; retirement_allowance?: number };

export default async function SimulatorPage({ params }: { params: P }) {
  const p = await params;
  const { site, content } = await loadPage(p.site, `/outils/${p.slug}`);
  const d = (content.data ?? {}) as SimData;
  const pillar = content.pillar_id ? await getContentById(content.pillar_id) : null;
  const sim = d.kind === "valuation"
    ? <ValuationSimulator site={site.key} sectors={d.sectors ?? []} disclaimer={d.disclaimer} />
    : d.kind === "capital_gains"
      ? <CapitalGainsSimulator site={site.key} irRate={d.ir_rate ?? 12.8} psRate={d.ps_rate ?? 17.2} retirementAllowance={d.retirement_allowance ?? 500000} disclaimer={d.disclaimer} />
      : null;
  return (
    <ContentArticle site={site} content={content} article={false}
      crumbs={[{ name: "Accueil", path: "/" }, ...(pillar ? [{ name: pillar.h1!, path: pillar.path! }] : []), { name: content.h1!, path: content.path! }]}
      extraLd={[{ "@context": "https://schema.org", "@type": "WebApplication", name: content.h1, applicationCategory: "FinanceApplication",
                  operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } }]}
      before={sim} />
  );
}
