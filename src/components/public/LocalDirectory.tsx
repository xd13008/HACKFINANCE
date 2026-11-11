import Link from "next/link";
import type { Category, ProviderPublic, Site } from "@/lib/data";
import { DEPARTEMENTS, depLabel } from "@/lib/departements";
import { absoluteUrl, ldBreadcrumb } from "@/lib/seo";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { ProviderList } from "./ProviderList";
import { Tracker } from "./Tracker";

export type Location = { city: string | null; city_slug: string | null; department: string | null; providers: number };

export { MIN_INDEXABLE } from "@/lib/departements";

/** Index des lieux d'un annuaire : départements et villes, avec le nombre de fiches publiées. */
export function LocationsIndex({ cat, locations, department }: { cat: Category; locations: Location[]; department?: string }) {
  const inScope = department ? locations.filter((l) => l.department === department) : locations;
  if (!inScope.length) return null;
  const deps = new Map<string, number>();
  for (const l of locations) if (l.department) deps.set(l.department, (deps.get(l.department) ?? 0) + l.providers);
  const cities = inScope.filter((l) => l.city_slug).slice(0, department ? 200 : 40);
  return (
    <section className="my-8" aria-labelledby="lieux">
      <h2 id="lieux" className="font-display font-extrabold text-2xl mb-3">{department ? `Les villes ${DEPARTEMENTS[department] ? `du département ${depLabel(department)}` : ""}` : "Trouver un cabinet près de chez vous"}</h2>
      <ul className="flex flex-wrap gap-2">
        {cities.map((l) => (
          <li key={l.city_slug}><Link href={`/prestataires/${cat.slug}/${l.city_slug}`} className="inline-flex gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm hover:border-ink">
            {l.city}<span className="text-ink-3">· {l.providers}</span></Link></li>
        ))}
      </ul>
      {!department && deps.size > 1 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Tous les départements ({deps.size})</summary>
          <ul className="mt-3 grid gap-1 sm:grid-cols-3 text-sm">
            {[...deps.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true })).map(([d, n]) => (
              <li key={d}><Link href={`/prestataires/${cat.slug}/departement/${d.toLowerCase()}`} className="underline">{depLabel(d)}</Link> <span className="text-ink-3">· {n}</span></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** Page locale d'un annuaire (ville ou département) : faits, liste paginée, lieux voisins, appel au référencement. */
export function LocalDirectory({ site, cat, where, crumbs, path, result, locations, department }: {
  site: Site; cat: Category; where: string; crumbs: Crumb[]; path: string;
  result: { providers: ProviderPublic[]; total: number; page: number; pages: number };
  locations: Location[]; department?: string;
}) {
  const label = cat.short_name ?? cat.name.toLowerCase();
  const verified = result.providers.filter((p) => p.verification_status === "verified").length;
  const regulated = result.providers.some((p) => p.regulated_profession);
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <JsonLd data={[ldBreadcrumb(site, crumbs), {
        "@context": "https://schema.org", "@type": "ItemList", name: `${cat.name} ${where}`, numberOfItems: result.total,
        itemListElement: result.providers.map((p, i) => ({ "@type": "ListItem", position: (result.page - 1) * 48 + i + 1, url: absoluteUrl(site, `/prestataires/${cat.slug}/${p.slug}`), name: p.name })),
      }]} />
      <Tracker site={site.key} pageType="provider_local" rubrique={cat.slug} />
      <Breadcrumbs items={crumbs} />
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">{cat.name} {where}</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        {result.total.toLocaleString("fr-FR")} {result.total > 1 ? "fiches référencées" : "fiche référencée"} {where} ({label}).
        Annuaire factuel en ordre alphabétique, sans classement : chaque fiche indique sa source (registre public des entreprises, site du cabinet)
        {verified ? ` ; ${verified} fiche(s) vérifiée(s) par la rédaction sur cette page.` : "."}
      </p>
      {regulated && <p className="mt-2 text-sm rounded-lg bg-surface-2 p-3 max-w-3xl">Profession réglementée : les fiches sont factuelles, sans note ni avis.</p>}
      <ProviderList providers={result.providers} categorySlug={cat.slug} />
      {result.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-4 my-6 text-sm">
          {result.page > 1 && <Link href={`${path}${result.page > 2 ? `?page=${result.page - 1}` : ""}`} className="underline">← Page précédente</Link>}
          <span className="text-ink-3">Page {result.page} sur {result.pages}</span>
          {result.page < result.pages && <Link href={`${path}?page=${result.page + 1}`} className="underline">Page suivante →</Link>}
        </nav>
      )}
      <LocationsIndex cat={cat} locations={locations} department={department} />
      <p className="mt-8 text-sm text-ink-3">Votre cabinet est {where} ? <Link href="/referencer-mon-cabinet" className="underline">Référencez-le ou corrigez sa fiche</Link>.</p>
    </div>
  );
}
