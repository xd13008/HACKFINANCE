import Link from "next/link";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { cleanQuery } from "@/lib/search";
import { entryMonthlyPrice } from "@/lib/decision";
import { staticMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { requireSite, type SiteParams } from "../_lib";

type SP = Promise<Record<string, string | undefined>>;
const PAGE = 24;
const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const SIZES = [["tpe", "TPE"], ["pme", "PME"], ["eti", "ETI"]] as const;

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await getSite((await params).site);
  if (!site) return { robots: { index: false } };
  return staticMetadata(site, "/recherche", "Rechercher une solution ou un prestataire", "Logiciels testés et prestataires référencés, filtrables.", { noindex: true });
}

/** Maquette, écran 12 : recherche complète (formulaire GET, sans JavaScript), sur les seules fiches publiées. */
export default async function Recherche({ params, searchParams }: { params: SiteParams; searchParams: SP }) {
  const site = await requireSite((await params).site);
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const type = sp.type === "logiciels" || sp.type === "prestataires" ? sp.type : "tout";
  const size = SIZES.some(([k]) => k === sp.taille) ? sp.taille! : "";
  const minNote = Math.min(9, Math.max(0, Number(sp.note) || 0));
  const maxPrice = [50, 100, 200].includes(Number(sp.prix)) ? Number(sp.prix) : 0;
  const ville = cleanQuery(sp.ville);
  const sort = sp.tri === "prix" || sp.tri === "nom" ? sp.tri : "note";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = publicClient();
  const { data: cats } = await db.from("categories").select("id,slug,name,kind").eq("site_id", site.id).eq("status", "published").order("sort");
  const cat = (cats ?? []).find((c) => c.slug === sp.categorie);
  const active = !!(q || cat || ville || size || minNote || maxPrice || type !== "tout");

  // Logiciels publiés (le classement ne porte que sur les solutions testées)
  type Row = { key: string; name: string; type: "Logiciel" | "Prestataire"; meta: string; score: number | null; price: number | null; href: string };
  let software: Row[] = [];
  if (type !== "prestataires" && (!cat || cat.kind === "software") && !ville) {
    let s = db.from("software").select("id,slug,name").eq("status", "published");
    if (q) s = s.ilike("name", `%${q}%`);
    if (cat) {
      const { data: links } = await db.from("software_categories").select("software_id").eq("category_id", cat.id);
      s = s.in("id", (links ?? []).map((l) => l.software_id));
    }
    const { data: sw } = await s.order("name").limit(500);
    const ids = (sw ?? []).map((x) => x.id);
    const [{ data: ranks }, { data: plans }, { data: sizes }, { data: links }] = ids.length ? await Promise.all([
      db.from("editorial_rankings").select("software_id,overall_score").in("software_id", ids),
      db.from("pricing_plans").select("software_id,plan_name,price_eur,billing_period,per_unit").in("software_id", ids).eq("status", "validated"),
      db.from("software_facts").select("software_id,value").in("software_id", ids).eq("fact_type", "target_sizes").eq("status", "validated"),
      db.from("software_categories").select("software_id,category_id").in("software_id", ids),
    ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    software = (sw ?? []).map((x) => {
      const score = (ranks ?? []).filter((r) => r.software_id === x.id).map((r) => Number(r.overall_score)).sort((a, b) => b - a)[0] ?? null;
      const pl = (plans ?? []).filter((p) => p.software_id === x.id);
      const c = (links ?? []).find((l) => l.software_id === x.id && catName.has(l.category_id));
      const sz = ((sizes ?? []).find((f) => f.software_id === x.id)?.value ?? []) as string[];
      return { key: x.id, name: x.name, type: "Logiciel" as const, meta: [c ? catName.get(c.category_id) : null, score == null ? "référencé, non testé" : null, sz.length ? sz.map((v) => v.toUpperCase()).join(", ") : null].filter(Boolean).join(" · "),
        score, price: entryMonthlyPrice(pl), href: `/logiciels/${x.slug}`, sizes: sz };
    }).filter((r) => (!size || r.sizes.includes(size)) && (!minNote || (r.score ?? 0) >= minNote) && (!maxPrice || (r.price != null && r.price <= maxPrice)))
      .map((r) => ({ key: r.key, name: r.name, type: r.type, meta: r.meta, score: r.score, price: r.price, href: r.href }));
  }

  // Prestataires publiés (pas de note : annuaire factuel) — seulement sur une recherche précise (28 000 fiches)
  let providers: Row[] = [];
  let providerTotal = 0;
  if (type !== "logiciels" && (!cat || cat.kind === "provider") && !size && !minNote && !maxPrice && (q || ville || cat)) {
    let p = db.from("providers_by_category").select("slug,name,city,category_id", { count: "exact" });
    if (q) p = p.ilike("name", `%${q}%`);
    if (ville) p = p.ilike("city", `${ville}%`);
    if (cat) p = p.eq("category_id", cat.id);
    const { data, count } = await p.order("name").limit(PAGE * page);
    providerTotal = count ?? 0;
    providers = (data ?? []).map((x) => {
      const c = (cats ?? []).find((k) => k.id === x.category_id);
      return { key: `${x.slug}-${x.category_id}`, name: x.name!, type: "Prestataire" as const, meta: [c?.name, x.city].filter(Boolean).join(" · "), score: null, price: null, href: `/prestataires/${c?.slug}/${x.slug}` };
    });
  }

  const sorted = [...software].sort((a, b) => sort === "nom" ? a.name.localeCompare(b.name, "fr")
    : sort === "prix" ? (a.price ?? Infinity) - (b.price ?? Infinity) : (b.score ?? -1) - (a.score ?? -1));
  const results = [...sorted.slice(0, PAGE * page), ...providers];
  const total = software.length + providerTotal;
  const remaining = Math.max(0, total - results.length);
  const keep = (extra: Record<string, string>) => `?${new URLSearchParams(Object.fromEntries(Object.entries({ ...sp, ...extra }).filter(([, v]) => v)) as Record<string, string>)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Tracker site={site.key} pageType="search" />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Recherche", path: "/recherche" }]} />
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">Toutes les solutions et tous les prestataires</h1>
      <form method="get" action="/recherche" className="mt-6 flex flex-wrap gap-7 items-start">
        <aside aria-label="Filtres" className="flex-[1_1_260px] max-w-xs flex flex-col gap-4 rounded-3xl border border-line bg-white p-5">
          <label className="flex flex-col gap-1.5 font-bold">Rechercher<input type="search" name="q" defaultValue={q} placeholder="Nom, ex. Agicap" className="min-h-11 rounded-lg border border-line px-3 font-normal" /></label>
          <fieldset className="border-0 p-0 m-0 flex flex-col gap-1.5"><legend className="font-bold mb-1.5">Type</legend>
            {[["tout", "Tout"], ["logiciels", "Logiciels"], ["prestataires", "Prestataires"]].map(([v, l]) => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" name="type" value={v} defaultChecked={type === v} className="accent-ink" /> {l}</label>)}
          </fieldset>
          <label className="flex flex-col gap-1.5 font-bold">Catégorie
            <select name="categorie" defaultValue={cat?.slug ?? ""} className="min-h-11 rounded-lg border border-line px-2.5 font-normal text-sm"><option value="">Toutes</option>{(cats ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 font-bold">Taille de votre entreprise (logiciels)
            <select name="taille" defaultValue={size} className="min-h-11 rounded-lg border border-line px-2.5 font-normal text-sm"><option value="">Toutes</option>{SIZES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 font-bold">Ville (prestataires)<input name="ville" defaultValue={ville} placeholder="Ex. Nantes" className="min-h-11 rounded-lg border border-line px-3 font-normal" /></label>
          <label className="flex flex-col gap-1.5 font-bold">Note minimale (logiciels testés)
            <select name="note" defaultValue={minNote || ""} className="min-h-11 rounded-lg border border-line px-2.5 font-normal text-sm"><option value="">Toutes</option>{[6, 7, 8].map((n) => <option key={n} value={n}>{n}/10 et plus</option>)}</select></label>
          <label className="flex flex-col gap-1.5 font-bold">Prix d&apos;entrée maximum
            <select name="prix" defaultValue={maxPrice || ""} className="min-h-11 rounded-lg border border-line px-2.5 font-normal text-sm"><option value="">Sans limite</option>{[50, 100, 200].map((n) => <option key={n} value={n}>{n} € HT/mois</option>)}</select></label>
          <div className="flex flex-wrap gap-2"><button className="min-h-11 px-5 rounded-lg bg-ink text-white font-bold">Rechercher</button><Link href="/recherche" className="inline-flex items-center min-h-11 px-3 text-sm underline">Réinitialiser</Link></div>
        </aside>
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0" role="status">{active ? <><strong>{total}</strong> résultat(s){q ? <> pour « {q} »</> : null}</> : "Saisissez un nom, une ville ou choisissez une catégorie."}</p>
            <label className="flex items-center gap-2 text-sm">Trier par<select name="tri" defaultValue={sort} className="min-h-10 rounded-lg border border-line px-2"><option value="note">Note</option><option value="prix">Prix d&apos;entrée</option><option value="nom">Nom</option></select></label>
          </div>
          {!active && (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-2">{(cats ?? []).map((c) => <li key={c.slug}><Link href={`/recherche?categorie=${c.slug}`} className="inline-block rounded-lg border border-line bg-white px-3 py-1.5 text-sm no-underline hover:border-ink">{c.name}</Link></li>)}</ul>
          )}
          {active && results.length === 0 && <p className="m-0 rounded-2xl bg-surface-2 p-5">Aucun résultat. Élargissez un filtre ou <Link href="/referencer-mon-logiciel" className="underline">signalez une solution manquante</Link>.</p>}
          <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
            {results.map((r) => (
              <li key={r.key}><Link href={r.href} className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3.5 items-center rounded-2xl border border-line bg-white px-4 py-3 no-underline hover:border-ink">
                <span aria-hidden="true" className="size-11 rounded-xl bg-surface-2 flex items-center justify-center font-display font-extrabold text-lg">{r.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0"><strong>{r.name}</strong> <span className="text-xs rounded bg-surface-2 px-1.5 py-0.5">{r.type}</span><span className="block text-sm text-ink-3 truncate">{r.meta}</span></span>
                <span className="text-right text-sm">{r.score != null && <strong className="block text-base">{fmt(r.score)}/10</strong>}{r.price != null && <span className="text-ink-3">{r.price === 0 ? "Gratuit" : `dès ${r.price} €/mois`}</span>}</span>
              </Link></li>
            ))}
          </ul>
          {remaining > 0 && <Link href={keep({ page: String(page + 1) })} className="self-start inline-flex items-center min-h-11 px-5 rounded-lg border border-line bg-white font-semibold no-underline">Afficher plus ({remaining} restants)</Link>}
          <p className="m-0 text-xs text-ink-3">Logiciels : note de la rédaction après test. Prestataires : annuaire factuel, sans note ni classement. Aucun résultat sponsorisé dans cette liste.</p>
        </div>
      </form>
    </div>
  );
}
