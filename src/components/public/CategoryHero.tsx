import Link from "next/link";
import type { CategoryHub } from "@/lib/category";
import { JsonLd } from "./JsonLd";
import { ldBreadcrumb } from "@/lib/seo";
import type { Site } from "@/lib/data";

export const CATEGORY_TABS = [
  ["", "Test de la rédaction"], ["podium", "Podium"], ["matchs", "Matchs"], ["par-profil", "Par profil"],
  ["blocs-fonctionnels", "Blocs fonctionnels"], ["tarifs", "Tarifs"],
] as const;
export type CategoryTab = (typeof CATEGORY_TABS)[number][0];

export function tabPath(slug: string, tab: CategoryTab) {
  return `/meilleurs-logiciels/${slug}${tab ? `/${tab}` : ""}`;
}

/** Onglets de catégorie (maquette, écrans 2, 13, 14) : chaque onglet est une page. */
export function CategoryTabs({ slug, current, dark = true }: { slug: string; current: CategoryTab; dark?: boolean }) {
  return (
    <nav aria-label="Onglets de la catégorie" className={dark ? "border-t border-zinc-800" : ""}>
      <ul className={`m-0 p-0 list-none flex flex-wrap gap-x-6 gap-y-1 ${dark ? "max-w-6xl mx-auto px-4 sm:px-6" : ""}`}>
        {CATEGORY_TABS.map(([tab, label]) => {
          const on = tab === current;
          return (
            <li key={tab}>
              <Link href={tabPath(slug, tab)} aria-current={on ? "page" : undefined}
                className={`inline-block py-3.5 text-sm no-underline ${dark ? (on ? "text-accent font-extrabold border-b-[3px] border-accent" : "text-zinc-300 font-semibold hover:text-white")
                  : (on ? "font-extrabold border-b-[3px] border-ink" : "text-ink-2 font-semibold")}`}>{label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bandeau sombre d'un onglet : fil d'Ariane, titre, phrase clé calculée, onglets. */
export function CategoryHero({ site, hub, tab, title, keyFact }: { site: Site; hub: CategoryHub; tab: CategoryTab; title: string; keyFact: string }) {
  const crumbs = [{ name: "Accueil", path: "/" }, ...(hub.vertical ? [{ name: hub.vertical.name, path: `/univers/${hub.vertical.slug}` }] : []),
    { name: hub.category.name, path: tabPath(hub.category.slug, "") }, ...(tab ? [{ name: CATEGORY_TABS.find(([t]) => t === tab)![1], path: tabPath(hub.category.slug, tab) }] : [])];
  return (
    <section className="bg-brand text-white">
      <JsonLd data={[ldBreadcrumb(site, crumbs)]} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        <nav aria-label="Fil d'Ariane" className="text-sm text-zinc-400">
          {crumbs.map((c, i) => <span key={c.path}>{i > 0 && " › "}{i < crumbs.length - 1 ? <Link href={c.path} className="text-zinc-300">{c.name}</Link> : <span>{c.name}</span>}</span>)}
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-7 flex flex-col gap-3.5">
        <h1 className="m-0 font-display font-extrabold text-4xl sm:text-5xl leading-[1.02] tracking-[-0.03em]">{title}</h1>
        <p className="m-0 text-[17px] text-zinc-300 max-w-3xl leading-relaxed">{keyFact}</p>
      </div>
      <CategoryTabs slug={hub.category.slug} current={tab} />
    </section>
  );
}
