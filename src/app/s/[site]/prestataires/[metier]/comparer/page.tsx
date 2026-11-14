import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGridAxes, getGridCriteria, getGridFacts, getProviderCategory, getProvidersBySlugs, getSite } from "@/lib/data";
import { axesFor, MAX_COMPARE, NOT_VERIFIED } from "@/lib/grid";
import { AxisAdvice, GridValue } from "@/components/public/ProviderGrid";
import { staticMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { requireSite } from "../../../_lib";

type P = Promise<{ site: string; metier: string }>;
type SP = Promise<{ c?: string | string[] }>;

const slugsOf = (c: string | string[] | undefined) =>
  [...new Set((Array.isArray(c) ? c : c ? [c] : []).flatMap((x) => x.split(",")).filter((x) => /^[a-z0-9-]{1,120}$/.test(x)))].slice(0, MAX_COMPARE);

/** Comparaison choisie par le visiteur : jamais indexée (combinaisons infinies). */
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await params;
  const site = await getSite(p.site);
  const cat = site ? await getProviderCategory(site.id, p.metier) : null;
  if (!site || !cat) return { robots: { index: false } };
  return staticMetadata(site, `/prestataires/${cat.slug}/comparer`, `Comparer des ${cat.name.toLowerCase()}`,
    "Comparaison côte à côte, sur les informations vérifiées par la rédaction.", { noindex: true, canonicalPath: `/prestataires/${cat.slug}` });
}

export default async function Compare({ params, searchParams }: { params: P; searchParams: SP }) {
  const p = await params;
  const site = await requireSite(p.site);
  const cat = await getProviderCategory(site.id, p.metier);
  if (!cat) notFound();
  const asked = (await searchParams).c;
  const slugs = slugsOf(asked);
  const found = await getProvidersBySlugs(cat.id, slugs);
  const providers = slugs.map((s) => found.find((x) => x.slug === s)).filter((x) => !!x);
  const [axes, all, facts] = await Promise.all([getGridAxes(), getGridCriteria(), getGridFacts(providers.map((x) => x.id!))]);
  const groups = axesFor(axes, all, cat.slug);
  const tooMany = (Array.isArray(asked) ? asked.length : 0) > MAX_COMPARE;
  const back = providers[0]?.city_slug ? `/prestataires/${cat.slug}/${providers[0].city_slug}#annuaire` : `/prestataires/${cat.slug}`;
  const crumbs = [{ name: "Accueil", path: "/" }, { name: cat.name, path: `/prestataires/${cat.slug}` }, { name: "Comparer", path: `/prestataires/${cat.slug}/comparer` }];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="font-display font-extrabold text-3xl">Comparer des {cat.name.toLowerCase()}</h1>
      <p className="mt-2 text-ink-2 max-w-3xl">Comparaison sur les informations vérifiées par la rédaction, avec leur source. Ce n&apos;est pas un classement :
        « {NOT_VERIFIED} » veut dire que l&apos;information est absente ou pas encore contrôlée, pas que le cabinet ne le fait pas.</p>
      {tooMany && <p className="mt-2 text-sm">Seuls les {MAX_COMPARE} premiers cabinets cochés sont comparés.</p>}
      {providers.length < 2 ? (
        <p className="my-6">Cochez au moins deux cabinets dans l&apos;annuaire pour les comparer. <Link href={back} className="underline">Retour à l&apos;annuaire</Link></p>
      ) : (
        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className="text-left py-2 pr-3 w-36 sm:w-48 sticky left-0 bg-surface">Critère</th>
                {providers.map((x) => (
                  <th key={x.id} scope="col" className="text-left py-2 pr-3 align-bottom">
                    <Link href={`/prestataires/${cat.slug}/${x.slug}`} className="underline">{x.name}</Link>
                    <span className="block text-xs font-normal text-ink-3">{[x.postal_code, x.city].filter(Boolean).join(" ")}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map(({ axis, criteria }, i) => (
              <tbody key={axis.code}>
                <tr><td colSpan={providers.length + 1} className="pt-6 pb-1">
                  <h2 className="font-bold text-lg">{axis.code === "cabinet" ? axis.title : `${i + 1}. ${axis.title}`}</h2>
                  <AxisAdvice axis={axis} />
                </td></tr>
                {criteria.map((c) => (
                  <tr key={c.code} className="border-t border-line align-top">
                    <th scope="row" className="text-left py-2 pr-3 font-medium sticky left-0 bg-surface">{c.label}<span className="block text-xs font-normal text-ink-3">{c.question}</span></th>
                    {providers.map((x) => (
                      <td key={x.id} className="py-2 pr-3"><GridValue compact c={c} f={facts.find((ff) => ff.provider_id === x.id && ff.criterion === c.code)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <p className="text-sm"><Link href={back} className="underline">← Retour à l&apos;annuaire</Link></p>
    </div>
  );
}
