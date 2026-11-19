import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, type Site } from "@/lib/data";
import { loadCategoryHub, MIN_TESTED_INDEXABLE, type CategoryHub } from "@/lib/category";
import { staticMetadata } from "@/lib/seo";
import { CategoryHero, CATEGORY_TABS, tabPath, type CategoryTab } from "./CategoryHero";
import { Tracker } from "./Tracker";

/** Chargement commun d'un onglet de catégorie (écrans 2, 13, 14 de la maquette). */
export async function tabData(siteKey: string, slug: string) {
  const site = await getSite(siteKey);
  const hub = site ? await loadCategoryHub(site.id, slug) : null;
  if (!site || !hub) notFound();
  return { site, hub };
}

/** Métadonnées d'un onglet : indexable seulement avec au moins 3 solutions testées (et des données propres à l'onglet). */
export async function tabMetadata(siteKey: string, slug: string, tab: CategoryTab, title: (h: CategoryHub) => string, description: (h: CategoryHub) => string, hasData = (h: CategoryHub) => h.tools.length > 0): Promise<Metadata> {
  const site = await getSite(siteKey);
  const hub = site ? await loadCategoryHub(site.id, slug) : null;
  if (!site || !hub) return { robots: { index: false } };
  return staticMetadata(site, tabPath(hub.category.slug, tab), title(hub), description(hub).slice(0, 158),
    { noindex: hub.tools.length < MIN_TESTED_INDEXABLE || !hasData(hub) });
}

export function CategoryTabPage({ site, hub, tab, title, keyFact, children }: { site: Site; hub: CategoryHub; tab: CategoryTab; title: string; keyFact: string; children: React.ReactNode }) {
  return (
    <div>
      <Tracker site={site.key} pageType={`category_${tab}`} rubrique={hub.category.slug} categoryId={hub.category.id} />
      <CategoryHero site={site} hub={hub} tab={tab} title={title} keyFact={keyFact} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">{children}</div>
    </div>
  );
}

export const tabLabel = (tab: CategoryTab) => CATEGORY_TABS.find(([t]) => t === tab)![1];
