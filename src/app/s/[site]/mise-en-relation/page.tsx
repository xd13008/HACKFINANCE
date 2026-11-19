import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { loadCategoryHub } from "@/lib/category";
import { staticMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { LeadForm, type LeadCategory } from "@/components/public/LeadForm";
import { requireSite, type SiteParams } from "../_lib";

type SP = Promise<{ categorie?: string; l?: string }>;
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await getSite((await params).site);
  if (!site) return { robots: { index: false } };
  return staticMetadata(site, "/mise-en-relation", "Recevoir une démo ou un devis", "Une seule demande, transmise aux seules solutions que vous choisissez.", { noindex: true });
}

/** Maquette, écran 4 : mise en relation. Catégories de logiciels publiées, hors sujets réglementés (règle 5). */
export default async function MiseEnRelation({ params, searchParams }: { params: SiteParams; searchParams: SP }) {
  const site = await requireSite((await params).site);
  const sp = await searchParams;
  const db = publicClient();
  const { data: regulated } = await db.from("verticals").select("id").eq("site_id", site.id).eq("slug", "financement-aides-risques");
  const blocked = new Set((regulated ?? []).map((v) => v.id));
  const { data: cats } = await db.from("categories").select("slug,vertical_id").eq("site_id", site.id).eq("kind", "software").eq("status", "published").order("sort");
  const hubs = (await Promise.all((cats ?? []).filter((c) => !c.vertical_id || !blocked.has(c.vertical_id)).map((c) => loadCategoryHub(site.id, c.slug)))).filter((h) => !!h);
  const { data: vendors } = await db.from("software").select("slug,vendor").in("slug", hubs.flatMap((h) => [...h.tools.map((t) => t.slug), ...h.referenced.map((r) => r.slug)]));
  const vendor = (s: string) => vendors?.find((v) => v.slug === s)?.vendor ?? "";
  const categories: LeadCategory[] = hubs.map((h) => ({
    slug: h.category.slug, name: h.category.name,
    tools: [...h.tools.map((t) => ({ slug: t.slug, name: t.name, vendor: vendor(t.slug), note: `Testé par la rédaction · ${fmt(t.score)}/10` })),
      ...h.referenced.map((r) => ({ slug: r.slug, name: r.name, vendor: vendor(r.slug), note: "Référencé, non testé" }))],
  }));
  const initial = categories.find((c) => c.slug === sp.categorie)?.slug ?? categories.find((c) => c.tools.some((t) => t.slug === sp.l))?.slug ?? "";
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Tracker site={site.key} pageType="lead_form" rubrique={initial || null} />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Mise en relation", path: "/mise-en-relation" }]} />
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">Recevoir une démo ou un devis</h1>
      <p className="mt-3 mb-8 text-lg text-ink-2">Une seule demande. Elle n&apos;est transmise qu&apos;aux solutions que vous cochez ci-dessous, et seulement si vous l&apos;acceptez.</p>
      {categories.length === 0 ? <p>Aucune catégorie ouverte à la mise en relation pour l&apos;instant.</p>
        : <LeadForm site={site.key} categories={categories} initialCategory={initial} highlight={sp.l ?? null} origin={`/mise-en-relation${sp.categorie ? `?categorie=${sp.categorie}` : ""}`} />}
    </div>
  );
}
