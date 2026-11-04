import Link from "next/link";
import { getNav, getRanking, listContent, getContentByPath } from "@/lib/data";
import { JsonLd } from "@/components/public/JsonLd";
import { Tracker } from "@/components/public/Tracker";
import { ScoreBadge } from "@/components/public/ScoreBadge";
import { ldOrganization, ldWebsite, CONTENT_TYPE_LABEL } from "@/lib/seo";
import { metadataFor, requireSite, type SiteParams } from "./_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
export async function generateMetadata({ params }: { params: SiteParams }) {
  return metadataFor((await params).site, "/");
}

export default async function Home({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const [nav, home, latest] = await Promise.all([
    getNav(site.id),
    getContentByPath(site.id, "/"),
    listContent(site.id, { types: ["guide", "pillar", "simulator", "resource", "duel", "software_review"], limit: 6 }),
  ]);
  const softwareCats = nav.categories.filter((c) => c.kind === "software");
  const providerCats = nav.categories.filter((c) => c.kind === "provider");
  const rankings = await Promise.all(softwareCats.map(async (c) => ({ cat: c, top: (await getRanking(c.id)).slice(0, 3) })));

  return (
    <div>
      <JsonLd data={[ldOrganization(site), ldWebsite(site)]} />
      <Tracker site={site.key} pageType="home" />
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h1 className="text-3xl sm:text-5xl font-extrabold max-w-3xl leading-tight">{home?.h1 ?? site.tagline}</h1>
          <p className="mt-4 text-lg max-w-2xl opacity-90">{home?.summary ?? site.description}</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {rankings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Nos comparatifs</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {rankings.map(({ cat, top }) => (
                <Link key={cat.id} href={`/meilleurs-logiciels/${cat.slug}`} className="block rounded-xl border border-line p-5 hover:border-brand">
                  <p className="font-semibold text-lg">{cat.name}</p>
                  <ol className="mt-3 space-y-1 text-sm">
                    {top.map((r) => (
                      <li key={r.software.id} className="flex items-center justify-between">
                        <span>{r.rank}. {r.software.name}</span><ScoreBadge score={r.overall} size="sm" />
                      </li>
                    ))}
                  </ol>
                  {!top.length && <p className="text-sm text-ink-3 mt-2">Tests en cours</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {nav.highlights.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Commencer ici</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {nav.highlights.map((h) => (
                <Link key={h.path} href={h.path!} className="block rounded-xl bg-surface-2 p-5 hover:ring-2 ring-brand">
                  <span className="text-xs uppercase tracking-wide text-ink-3">{CONTENT_TYPE_LABEL[h.type!]}</span>
                  <p className="font-semibold mt-1">{h.h1}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {providerCats.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Annuaire des professionnels</h2>
            <ul className="flex flex-wrap gap-3">
              {providerCats.map((c) => (
                <li key={c.id}><Link href={`/prestataires/${c.slug}`} className="inline-block rounded-full border border-line px-4 py-2 hover:border-brand">{c.name}</Link></li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-4">Dernières publications</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {latest.map((c) => (
              <li key={c.id}>
                <Link href={c.path!} className="block h-full rounded-xl border border-line p-4 hover:border-brand">
                  <span className="text-xs uppercase tracking-wide text-ink-3">{CONTENT_TYPE_LABEL[c.type!]}</span>
                  <p className="font-semibold mt-1">{c.h1}</p>
                  <p className="text-sm text-ink-2 mt-1 line-clamp-3">{c.meta_description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
