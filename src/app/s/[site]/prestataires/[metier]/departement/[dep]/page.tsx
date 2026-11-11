import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProviderCategory, getProviderLocations, getProviders, getSite } from "@/lib/data";
import { DEPARTEMENTS, depLabel } from "@/lib/departements";
import { LocalDirectory, MIN_INDEXABLE } from "@/components/public/LocalDirectory";
import { staticMetadata } from "@/lib/seo";
import { requireSite } from "../../../../_lib";

export const revalidate = 300;
type P = Promise<{ site: string; metier: string; dep: string }>;
type SP = Promise<{ page?: string }>;
const code = (dep: string) => dep.toUpperCase();

export async function generateMetadata({ params, searchParams }: { params: P; searchParams: SP }): Promise<Metadata> {
  const p = await params; const page = Number((await searchParams).page) || 1;
  const site = await getSite(p.site);
  const cat = site ? await getProviderCategory(site.id, p.metier) : null;
  if (!site || !cat || !DEPARTEMENTS[code(p.dep)]) return { robots: { index: false } };
  const { total } = await getProviders(cat.id, { department: code(p.dep), size: 1 });
  const where = `dans le département ${depLabel(code(p.dep))}`;
  return staticMetadata(site, `/prestataires/${cat.slug}/departement/${p.dep}`, `${cat.name} ${where}`,
    `${total} ${cat.short_name ?? "professionnels"} référencés ${where} : annuaire factuel par ville, sans classement, sources publiques.`,
    { noindex: total < MIN_INDEXABLE || page > 1 });
}

export default async function DepartmentPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const p = await params; const page = Number((await searchParams).page) || 1;
  const site = await requireSite(p.site);
  const cat = await getProviderCategory(site.id, p.metier);
  const dep = code(p.dep);
  if (!cat || !DEPARTEMENTS[dep] || p.dep !== p.dep.toLowerCase()) notFound();
  const [result, locations] = await Promise.all([getProviders(cat.id, { department: dep, page }), getProviderLocations(cat.id)]);
  if (!result.total) notFound();
  const path = `/prestataires/${cat.slug}/departement/${p.dep}`;
  return (
    <LocalDirectory site={site} cat={cat} where={`dans le département ${depLabel(dep)}`} path={path} result={result} locations={locations} department={dep}
      crumbs={[{ name: "Accueil", path: "/" }, { name: cat.name, path: `/prestataires/${cat.slug}` }, { name: DEPARTEMENTS[dep], path }]} />
  );
}
