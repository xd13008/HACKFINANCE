import Link from "next/link";
import type { Content, FaqItem, Site } from "@/lib/data";
import { getSources, getStaffNames } from "@/lib/data";
import { ldArticle, ldBreadcrumb, ldFaq } from "@/lib/seo";
import { relatedFor } from "@/lib/linking";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { ContentMeta } from "./ContentMeta";
import { DemoBanner } from "./DemoBanner";
import { Faq } from "./Faq";
import { JsonLd } from "./JsonLd";
import { Markdown } from "./Markdown";
import { Related } from "./Related";
import { Sources } from "./Sources";
import { Summary } from "./Summary";
import { Tracker } from "./Tracker";

/** Gabarit commun des pages éditoriales : fil d'Ariane, H1, réponse directe, corps, FAQ, sources, maillage. */
export async function ContentArticle({
  site, content, crumbs, rubrique, before, after, extraLd = [], article = true, about, meta, wide = false, hideBody = false,
}: {
  site: Site;
  content: Content;
  crumbs: Crumb[];
  rubrique?: string | null;
  before?: React.ReactNode;
  after?: React.ReactNode;
  extraLd?: (Record<string, unknown> | null)[];
  article?: boolean;
  /** Logiciels dont parle l'article (données structurées « about »). */
  about?: string[];
  meta?: React.ReactNode;
  wide?: boolean;
  hideBody?: boolean;
}) {
  const [sources, names, related] = await Promise.all([
    getSources(content.version_id!),
    getStaffNames([content.author_id!, content.validated_by!].filter(Boolean)),
    relatedFor(site.id, {
      id: content.id!, type: content.type!, category_id: content.category_id, software_id: content.software_id,
      software_b_id: content.software_b_id, cluster: content.cluster, pillar_id: content.pillar_id,
    }),
  ]);
  const author = names.get(content.author_id!)?.name ?? null;
  const validator = names.get(content.validated_by!)?.name ?? null;
  const faq = (content.faq ?? []) as FaqItem[];

  return (
    <article className={`${wide ? "max-w-6xl" : "max-w-3xl"} mx-auto px-4 py-8`}>
      <JsonLd data={[ldBreadcrumb(site, crumbs), article ? ldArticle(site, content, names.get(content.author_id!), { about }) : null, ldFaq(faq), ...extraLd]} />
      <Tracker site={site.key} pageType={content.type!} rubrique={rubrique ?? content.cluster} categoryId={content.category_id} entityId={content.software_id ?? content.id} />
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{content.h1}</h1>
      {content.is_fictional && <DemoBanner />}
      {meta ?? <ContentMeta updatedAt={content.content_updated_at} publishedAt={content.first_published_at} author={author} validator={validator} />}
      <Summary>{content.summary}</Summary>
      {before}
      {!hideBody && (wide ? <div className="max-w-3xl"><Markdown>{content.body ?? ""}</Markdown></div> : <Markdown>{content.body ?? ""}</Markdown>)}
      {after}
      <Faq items={faq} />
      <Sources sources={sources} />
      <Related links={related} />
      <p className="mt-8 text-sm text-ink-3">
        Une erreur ? <Link href={`/signaler-une-erreur?page=${encodeURIComponent(content.path!)}`} className="underline">Signalez-la</Link> ou exercez votre droit de réponse.
      </p>
    </article>
  );
}
