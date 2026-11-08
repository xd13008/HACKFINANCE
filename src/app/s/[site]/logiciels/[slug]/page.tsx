import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAffiliate, getContentByPath, getFacts, getIntegrations, getPricing, getPrimaryCategory, getSite, getSoftware,
  getStaffNames, getValidatedTest, getRanking, getPublicReviews,
} from "@/lib/data";
import type { Criterion } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { ContentMeta } from "@/components/public/ContentMeta";
import { FactsTable, PricingTable, VerdictBox, VisitCta } from "@/components/public/SoftwareParts";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { PublicReviews } from "@/components/public/PublicReviews";
import { ldSoftwareReview } from "@/lib/seo";
import { metadataFor, requireSite, publishedSlugs, staticParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

/** Pré-génère au build les pages publiées (mises en cache, servies par le CDN). */
export async function generateStaticParams({ params }: { params: { site: string } }) {
  return staticParams("slug", await publishedSlugs(params.site, "software_review"));
}
type P = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await params;
  const site = await getSite(p.site);
  const content = site ? await getContentByPath(site.id, `/logiciels/${p.slug}`) : null;
  if (!content) {
    // Fiche « référencée, non testée » sans contenu éditorial : accessible mais non indexée.
    const sw = await getSoftware(p.slug);
    return sw ? { title: `${sw.name} — fiche`, robots: { index: false, follow: true } } : { robots: { index: false } };
  }
  return metadataFor(p.site, `/logiciels/${p.slug}`);
}

export default async function SoftwarePage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const sw = await getSoftware(p.slug);
  if (!sw) notFound();
  const category = await getPrimaryCategory(sw.id);
  const [content, facts, pricing, integrations, affiliate, test, reviews] = await Promise.all([
    getContentByPath(site.id, `/logiciels/${sw.slug}`),
    getFacts([sw.id]), getPricing([sw.id]), getIntegrations(sw.id), getAffiliate(sw.id),
    category ? getValidatedTest(sw.id, category.id) : null,
    getPublicReviews({ softwareId: sw.id }),
  ]);
  const ranking = category ? await getRanking(category.id) : [];
  const ranked = ranking.find((r) => r.software.id === sw.id);
  const names = await getStaffNames([test?.test.tester_id ?? "", test?.test.validated_by ?? "", content?.author_id ?? ""]);
  const crumbs = [
    { name: "Accueil", path: "/" },
    ...(category ? [{ name: category.name, path: `/meilleurs-logiciels/${category.slug}` }] : []),
    { name: sw.name, path: `/logiciels/${sw.slug}` },
  ];
  const plans = pricing.get(sw.id) ?? [];
  const commercial = affiliate ? ["Lien affilié"] : [];

  const parts = (
    <>
      {test && ranked && category && (
        <VerdictBox test={test.test} overall={ranked.overall} criteria={category.criteria as Criterion[]} scores={test.scores} tester={names.get(test.test.tester_id)?.name} />
      )}
      <VisitCta name={sw.name} website={sw.website} affiliate={affiliate} softwareId={sw.id} />
      <PricingTable plans={plans} />
      <FactsTable facts={facts.get(sw.id)} integrations={integrations} />
      <PublicReviews sources={reviews.sources} quotes={reviews.quotes} summary={reviews.summary} name={sw.name} />
    </>
  );

  if (!content) {
    return (
      <article className="max-w-3xl mx-auto px-4 py-8">
        <Tracker site={site.key} pageType="software_listing" rubrique={category?.slug} entityId={sw.id} />
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-extrabold">{sw.name}</h1>
        <ContentMeta testStatus={test ? "tested" : "listed"} testedAt={test?.test.tested_at} commercial={commercial} />
        <p className="text-ink-2">{sw.tagline}</p>
        {parts}
      </article>
    );
  }

  return (
    <ContentArticle
      site={site}
      content={content}
      rubrique={category?.slug}
      crumbs={crumbs}
      article={false}
      meta={
        <ContentMeta
          testStatus={test ? "tested" : "listed"} testedAt={test?.test.tested_at}
          updatedAt={content.content_updated_at} author={names.get(content.author_id!)?.name}
          validator={names.get(test?.test.validated_by ?? "")?.name} commercial={commercial}
        />
      }
      extraLd={[
        test && ranked
          ? ldSoftwareReview(site, sw, content, { score: ranked.overall, author: names.get(test.test.tester_id) ?? site.name, category, plans, test: test.test })
          : null,
      ]}
      before={parts}
    />
  );
}
