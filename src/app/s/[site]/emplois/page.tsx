import type { Metadata } from "next";
import Link from "next/link";
import { publicClient } from "@/lib/supabase/public";
import { staticMetadata } from "@/lib/seo";
import { Tracker } from "@/components/public/Tracker";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { CONTRACTS, contractLabel, UNIVERSES, universeLabel } from "@/lib/jobs";
import { depLabel } from "@/lib/departements";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;
const SIZE = 30;
type SP = Promise<{ univers?: string; contrat?: string; dep?: string; page?: string }>;

export async function generateMetadata({ params, searchParams }: { params: SiteParams; searchParams: SP }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  const sp = await searchParams;
  const filtered = !!(sp.univers || sp.contrat || sp.dep || (sp.page && sp.page !== "1"));
  return staticMetadata(site, "/emplois", "Offres d'emploi en finance : comptabilité, contrôle de gestion, DAF",
    "Offres d'emploi finance en France : comptable, contrôleur de gestion, DAF, trésorier, auditeur. Mises à jour chaque jour.", { noindex: filtered });
}

export default async function JobsPage({ params, searchParams }: { params: SiteParams; searchParams: SP }) {
  const site = await requireSite((await params).site);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = publicClient().from("job_offers")
    .select("slug,title,company_name,city,department,universe_slug,contract,remote,salary_min,salary_max,featured,source,published_at", { count: "exact" })
    .eq("site_id", site.id).not("universe_slug", "is", null);
  if (UNIVERSES.some(([k]) => k === sp.univers)) q = q.eq("universe_slug", sp.univers!);
  if (CONTRACTS.some(([k]) => k === sp.contrat)) q = q.eq("contract", sp.contrat!);
  if (sp.dep && /^([0-9]{2,3}|2A|2B)$/.test(sp.dep)) q = q.eq("department", sp.dep);
  const { data, count } = await q.order("featured", { ascending: false }).order("published_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ univers: sp.univers, contrat: sp.contrat, dep: sp.dep, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/emplois${u.size ? `?${u}` : ""}`;
  };
  const k = (n: number) => `${Math.round(n / 1000)} k€`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Tracker site={site.key} pageType="jobs" />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Emplois", path: "/emplois" }]} />
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Offres d&apos;emploi en finance</h1>
          <p className="text-ink-2 mt-2">{(count ?? 0).toLocaleString("fr-FR")} offre(s) dans les 8 univers finance : comptabilité, trésorerie, dépenses, encaissement, pilotage, direction financière, aides et risques, RSE.</p>
        </div>
        <Link href="/emplois/publier" className="rounded-lg bg-brand text-white font-semibold px-4 py-2.5">Publier une annonce</Link>
      </div>

      <form className="flex flex-wrap gap-2 items-end mb-6 text-sm" action="/emplois">
        <label>Univers<select name="univers" defaultValue={sp.univers ?? ""} className="block rounded-lg border border-line px-3 py-2 bg-white">
          <option value="">Tous</option>{UNIVERSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Contrat<select name="contrat" defaultValue={sp.contrat ?? ""} className="block rounded-lg border border-line px-3 py-2 bg-white">
          <option value="">Tous</option>{CONTRACTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Département<input name="dep" defaultValue={sp.dep ?? ""} placeholder="ex. 69" size={6} className="block rounded-lg border border-line px-3 py-2 bg-white" /></label>
        <button className="rounded-lg border border-ink px-4 py-2 font-semibold">Filtrer</button>
      </form>

      {(data ?? []).length === 0 ? <p className="p-5 rounded-xl bg-surface-2">Aucune offre ne correspond pour le moment.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((j) => (
            <li key={j.slug} className={`rounded-xl border bg-white p-4 ${j.featured ? "border-accent border-2" : "border-line"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/emplois/${j.slug}`} className="font-bold text-lg hover:underline">{j.title}</Link>
                  <p className="text-sm text-ink-2">{[j.company_name, j.city && `${j.city}${j.department ? ` (${j.department})` : ""}`].filter(Boolean).join(" · ")}</p>
                </div>
                {j.featured && <span className="text-xs font-semibold rounded bg-accent px-2 py-1">Annonce</span>}
              </div>
              <p className="text-sm text-ink-3 mt-2">
                {[universeLabel(j.universe_slug), contractLabel(j.contract), j.remote === "total" ? "Télétravail complet" : j.remote === "partiel" ? "Télétravail partiel" : null,
                  j.salary_min ? (j.salary_max && j.salary_max !== j.salary_min ? `${k(j.salary_min)} à ${k(j.salary_max)}` : k(j.salary_min)) : null,
                  j.source === "france_travail" ? "Source : France Travail" : null,
                  j.published_at ? `publiée le ${new Date(j.published_at).toLocaleDateString("fr-FR")}` : null].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Pages" className="flex gap-4 mt-6 text-sm">
        {page > 1 && <Link href={link({ page: String(page - 1) })} className="underline">← Précédente</Link>}
        <span className="text-ink-3">Page {page} sur {pages}</span>
        {page < pages && <Link href={link({ page: String(page + 1) })} className="underline">Suivante →</Link>}
      </nav>
      {sp.dep && <p className="text-xs text-ink-3 mt-4">Département : {depLabel(sp.dep)}</p>}
    </div>
  );
}
