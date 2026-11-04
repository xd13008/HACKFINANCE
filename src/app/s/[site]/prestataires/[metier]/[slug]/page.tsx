import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProvider, getProviderCategory, getProviders, getSite } from "@/lib/data";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { DemoBanner } from "@/components/public/DemoBanner";
import { JsonLd } from "@/components/public/JsonLd";
import { OutboundLink } from "@/components/public/OutboundLink";
import { Tracker } from "@/components/public/Tracker";
import { absoluteUrl, ldBreadcrumb } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { requireSite } from "../../../_lib";
import { ProviderList } from "@/components/public/ProviderList";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
type P = Promise<{ site: string; metier: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await params;
  const site = await getSite(p.site);
  const cat = site ? await getProviderCategory(site.id, p.metier) : null;
  const pr = await getProvider(p.slug);
  if (site && cat && pr) {
    return {
      title: `${pr.name} — ${cat.short_name ?? cat.name} à ${pr.city}`,
      description: `${pr.name}, ${cat.short_name ?? cat.name} à ${pr.city} : spécialités, taille des opérations, références publiques.`,
      alternates: { canonical: absoluteUrl(site, `/prestataires/${cat.slug}/${pr.slug}`) },
      // Une fiche non vérifiée reste accessible mais n'est pas indexée.
      robots: pr.verification_status === "verified" ? undefined : { index: false, follow: true },
    };
  }
  if (site && cat) {
    return { title: `${cat.name} à ${p.slug}`, alternates: { canonical: absoluteUrl(site, `/prestataires/${cat.slug}/${p.slug}`) }, robots: { index: false, follow: true } };
  }
  return {};
}

/** Deuxième segment : fiche prestataire (slug) ou, à défaut, liste par ville. */
export default async function ProviderPage({ params }: { params: P }) {
  const p = await params;
  const site = await requireSite(p.site);
  const cat = await getProviderCategory(site.id, p.metier);
  if (!cat) notFound();
  const pr = await getProvider(p.slug);
  const crumbs = [{ name: "Accueil", path: "/" }, { name: cat.name, path: `/prestataires/${cat.slug}` }];

  if (!pr) {
    const inCity = await getProviders(cat.id, p.slug);
    if (!inCity.length) notFound();
    const city = inCity[0].city;
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Tracker site={site.key} pageType="provider_city" rubrique={cat.slug} />
        <Breadcrumbs items={[...crumbs, { name: city ?? p.slug, path: `/prestataires/${cat.slug}/${p.slug}` }]} />
        <h1 className="text-3xl font-extrabold">{cat.name} à {city}</h1>
        <ProviderList providers={inCity} categorySlug={cat.slug} />
      </div>
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
