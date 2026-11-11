import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { absoluteUrl, staticMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/public/JsonLd";
import { Tracker } from "@/components/public/Tracker";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { contractLabel, familyLabel, jobPostingLd } from "@/lib/jobs";
import { requireSite } from "../../_lib";

export const revalidate = 300;
export async function generateStaticParams() { return [{ slug: "-" }]; }

type P = Promise<{ site: string; slug: string }>;
const getJob = cache(async (siteId: string, slug: string) => {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const { data } = await publicClient().from("job_offers")
    .select("id,slug,title,company_name,provider_id,city,postal_code,department,family,contract,remote,experience,salary_min,salary_max,salary_text,description,apply_url,apply_email,source,source_url,featured,published_at,expires_at")
    .eq("site_id", siteId).eq("slug", slug).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { site: key, slug } = await params;
  const site = await requireSite(key);
  const j = await getJob(site.id, slug);
  if (!j) return { robots: { index: false } };
  return staticMetadata(site, `/emplois/${j.slug}`, `${j.title}${j.city ? ` à ${j.city}` : ""}`.slice(0, 70),
    `${contractLabel(j.contract)} · ${familyLabel(j.family)}${j.company_name ? ` · ${j.company_name}` : ""}. ${j.description.replace(/\s+/g, " ")}`.slice(0, 155));
}

export default async function JobPage({ params }: { params: P }) {
  const { site: key, slug } = await params;
  const site = await requireSite(key);
  const j = await getJob(site.id, slug);
  if (!j) notFound();
  const { data: provider } = j.provider_id
    ? await publicClient().from("providers_public").select("slug,profession").eq("id", j.provider_id).maybeSingle()
    : { data: null };
  const url = absoluteUrl(site, `/emplois/${j.slug}`);
  const apply = j.apply_url ?? (j.apply_email ? `mailto:${j.apply_email}?subject=${encodeURIComponent(`Candidature : ${j.title}`)}` : null);
  const facts: [string, string | null][] = [
    ["Contrat", contractLabel(j.contract)], ["Métier", familyLabel(j.family)], ["Lieu", j.city ? `${j.city}${j.postal_code ? ` (${j.postal_code})` : ""}` : null],
    ["Télétravail", j.remote === "total" ? "Complet" : j.remote === "partiel" ? "Partiel" : j.remote === "non" ? "Non" : null],
    ["Expérience", j.experience], ["Salaire", j.salary_text ?? (j.salary_min ? `${j.salary_min.toLocaleString("fr-FR")} €${j.salary_max && j.salary_max !== j.salary_min ? ` à ${j.salary_max.toLocaleString("fr-FR")} €` : ""} par an` : null)],
    ["Publiée le", j.published_at ? new Date(j.published_at).toLocaleDateString("fr-FR") : null],
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <JsonLd data={[jobPostingLd(j, url)]} />
      <Tracker site={site.key} pageType="job" entityId={j.id} />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Emplois", path: "/emplois" }, { name: j.title, path: `/emplois/${j.slug}` }]} />
      {j.featured && <span className="inline-block text-xs font-semibold rounded bg-accent px-2 py-1 mb-2">Annonce</span>}
      <h1 className="text-3xl font-extrabold">{j.title}</h1>
      <p className="text-lg text-ink-2 mt-1">{j.company_name ?? "Entreprise confidentielle"}
        {provider?.slug && provider.profession && <> · <Link href={`/prestataires/${provider.profession}/${provider.slug}`} className="underline text-base">voir la fiche</Link></>}</p>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 my-6 text-sm">
        {facts.filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-ink-3 w-28 shrink-0">{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {apply && <a href={apply} target={j.apply_url ? "_blank" : undefined} rel="nofollow noopener" data-track="outbound" data-link-kind="editorial"
         className="inline-block rounded-lg bg-brand text-white font-semibold px-5 py-2.5 mb-6">Postuler</a>}
      <div className="whitespace-pre-line leading-relaxed">{j.description}</div>
      <p className="text-xs text-ink-3 mt-8">
        {j.source === "france_travail"
          ? <>Offre diffusée par France Travail{j.source_url && <> · <a href={j.source_url} rel="nofollow noopener" target="_blank" className="underline">voir l&apos;offre d&apos;origine</a></>}. {site.name} ne reçoit pas les candidatures.</>
          : <>Annonce payante publiée par le recruteur après relecture par {site.name}. {site.name} ne reçoit pas les candidatures.</>}
        {j.expires_at && <> Valable jusqu&apos;au {new Date(j.expires_at).toLocaleDateString("fr-FR")}.</>}
      </p>
      <p className="mt-6"><Link href="/emplois" className="underline">← Toutes les offres</Link> · <Link href="/signaler-une-erreur" className="underline text-sm">Signaler cette offre</Link></p>
    </div>
  );
}
