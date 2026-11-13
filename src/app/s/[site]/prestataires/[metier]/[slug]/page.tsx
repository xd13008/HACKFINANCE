import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProvider, getProviderCategory, getProviderCityFacts, getProviderLocations, getProviders, getSite } from "@/lib/data";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { DemoBanner } from "@/components/public/DemoBanner";
import { JsonLd } from "@/components/public/JsonLd";
import { OutboundLink } from "@/components/public/OutboundLink";
import { Tracker } from "@/components/public/Tracker";
import { ldBreadcrumb, staticMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { requireSite } from "../../../_lib";
import { LocalDirectory, MIN_INDEXABLE } from "@/components/public/LocalDirectory";
import { CityFacts } from "@/components/public/CityFacts";
import { DEPARTEMENTS, depLabel } from "@/lib/departements";

export const revalidate = 300;

/** Nom d'affichage d'une ville : la variante en casse mixte du registre (« Paris » plutôt que « PARIS »), sinon mise en forme. */
function cityName(locations: { city: string | null; city_slug: string | null; providers: number }[], slug: string) {
  const variants = locations.filter((l) => l.city_slug === slug && l.city).sort((a, b) => b.providers - a.providers).map((l) => l.city!);
  const mixed = variants.find((v) => v !== v.toUpperCase());
  if (mixed) return mixed;
  const v = variants[0];
  return v ? v.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : null;
} // secondes ; la publication revalide aussi la page immédiatement

/** Fiches et pages locales générées à la demande puis mises en cache (des dizaines de milliers de pages possibles). */
export async function generateStaticParams() {
  return [{ metier: "-", slug: "-" }];
}
type P = Promise<{ site: string; metier: string; slug: string }>;
type SP = Promise<{ page?: string }>;

export async function generateMetadata({ params, searchParams }: { params: P; searchParams: SP }): Promise<Metadata> {
  const p = await params;
  const page = Number((await searchParams).page) || 1;
  const site = await getSite(p.site);
  const cat = site ? await getProviderCategory(site.id, p.metier) : null;
  const pr = await getProvider(p.slug);
  if (site && cat && pr) {
    // Une fiche non vérifiée reste accessible mais n'est pas indexée.
    return staticMetadata(site, `/prestataires/${cat.slug}/${pr.slug}`, `${pr.name} — ${cat.short_name ?? cat.name} à ${pr.city}`,
      `${pr.name}, ${cat.short_name ?? cat.name} à ${pr.city} : spécialités, taille des opérations accompagnées et références publiques vérifiées.`,
      { noindex: pr.verification_status !== "verified" });
  }
  if (site && cat) {
    const { providers, total } = await getProviders(cat.id, { city: p.slug, size: 1 });
    if (!total) return { robots: { index: false } };
    const c = providers[0];
    const where = `à ${c.city}${c.department ? ` (${c.department})` : ""}`;
    return staticMetadata(site, `/prestataires/${cat.slug}/${p.slug}`, `${cat.name} ${where}`,
      `${total} ${cat.short_name ?? "professionnels"} référencés ${where} : annuaire factuel, sans classement, sources publiques datées.`,
      { noindex: total < MIN_INDEXABLE || page > 1 });
  }
  return {};
}

/** Deuxième segment : fiche prestataire (slug) ou, à défaut, liste par ville. */
export default async function ProviderPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const p = await params;
  const site = await requireSite(p.site);
  const cat = await getProviderCategory(site.id, p.metier);
  if (!cat) notFound();
  const pr = await getProvider(p.slug);
  const crumbs = [{ name: "Accueil", path: "/" }, { name: cat.name, path: `/prestataires/${cat.slug}` }];

  if (!pr) {
    const page = Number((await searchParams).page) || 1;
    const [result, locations, facts] = await Promise.all([getProviders(cat.id, { city: p.slug, page }), getProviderLocations(cat.id), getProviderCityFacts(cat.id, p.slug)]);
    if (!result.total) notFound();
    const c = result.providers[0];
    const latest = result.providers.map((x) => x.updated_at).filter(Boolean).sort().at(-1);
    const dep = c.department ?? undefined;
    const path = `/prestataires/${cat.slug}/${p.slug}`;
    return (
      <LocalDirectory site={site} cat={cat} where={`à ${c.city}${dep ? ` (${dep})` : ""}`} path={path} result={result} locations={locations} department={dep}
        facts={<CityFacts cat={cat} city={cityName(locations, p.slug) ?? c.city ?? p.slug} citySlug={p.slug} department={dep} facts={facts} locations={locations}
          imported={latest ? new Date(latest).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null} />}
        crumbs={[...crumbs, ...(dep && DEPARTEMENTS[dep] ? [{ name: depLabel(dep), path: `/prestataires/${cat.slug}/departement/${dep.toLowerCase()}` }] : []), { name: c.city ?? p.slug, path }]} />
    );
  }

  const refs = (pr.public_references ?? []) as { label: string; source_url?: string }[];
  const path = `/prestataires/${cat.slug}/${pr.slug}`;
  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <JsonLd data={[ldBreadcrumb(site, [...crumbs, { name: pr.name!, path }]),
        { "@context": "https://schema.org", "@type": "ProfessionalService", name: pr.name, url: pr.website,
          address: { "@type": "PostalAddress", addressLocality: pr.city, addressRegion: pr.region, addressCountry: "FR" } }]} />
      <Tracker site={site.key} pageType="provider" rubrique={cat.slug} entityId={pr.id} />
      <Breadcrumbs items={[...crumbs, { name: pr.name!, path }]} />
      <h1 className="text-3xl font-extrabold">{pr.name}</h1>
      {pr.is_fictional && <DemoBanner />}
      <p className="text-sm text-ink-2 my-3">
        {pr.verification_status === "verified" ? `✅ Fiche vérifiée le ${formatDate(pr.verified_at!)}` : "Fiche non vérifiée"} · {pr.city}{pr.region && `, ${pr.region}`}
      </p>
      {pr.regulated_profession && <p className="text-sm bg-surface-2 p-3 rounded">Profession réglementée : fiche factuelle, sans classement ni avis.</p>}
      <p className="my-4">{pr.description}</p>
      <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        {pr.deal_size_range && <div><dt className="text-ink-3">Taille des opérations</dt><dd>{pr.deal_size_range}</dd></div>}
        {pr.specialties && pr.specialties.length > 0 && <div><dt className="text-ink-3">Spécialités</dt><dd>{pr.specialties.join(", ")}</dd></div>}
      </dl>
      {refs.length > 0 && (
        <section className="mt-6"><h2 className="text-xl font-bold mb-2">Références publiques</h2>
          <ul className="list-disc pl-5 text-sm">{refs.map((r) => <li key={r.label}>{r.source_url ? <a href={r.source_url} rel="nofollow noopener" target="_blank" className="underline">{r.label}</a> : r.label}</li>)}</ul>
        </section>
      )}
      {pr.website && (
        <p className="mt-6"><OutboundLink href={pr.website} kind="editorial" entityId={pr.id} className="inline-block rounded-lg bg-brand text-white font-semibold px-5 py-3">Visiter le site du cabinet</OutboundLink></p>
      )}
      <p className="mt-8 text-sm text-ink-3">Vous êtes {pr.name} ? <a href="/signaler-une-erreur" className="underline">Demandez une correction</a> ou <a href="/publicite/annoncer" className="underline">une mise en avant</a>.</p>
    </article>
  );
}
