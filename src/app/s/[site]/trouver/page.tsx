import { Assistant, type AssistantUniverse } from "@/components/public/Assistant";
import { Tracker } from "@/components/public/Tracker";
import type { Criterion } from "@/lib/data";
import { staticMetadata } from "@/lib/seo";
import { loadAllUniverses } from "@/lib/universe";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/trouver", "Trouver le bon logiciel finance en 3 questions",
    "Taille, outils déjà en place, besoin : recevez une sélection de solutions testées par la rédaction et adaptées à votre entreprise. Aucun résultat sponsorisé.");
}

/** « Vous partez de zéro » : l'assistant ne propose que des catégories publiées et des tests validés. */
export default async function FindPage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const universes = await loadAllUniverses(site.id);
  const data: AssistantUniverse[] = universes.map((u) => ({
    slug: u.vertical.slug, name: u.vertical.name, providers: u.providers,
    needs: u.categories.map((c) => ({
      slug: c.slug, name: c.name, kind: c.kind as "software" | "provider",
      criteria: ((c.criteria ?? []) as Criterion[]).map((x) => ({ key: x.key, label: x.label })),
      tools: c.kind === "software" ? u.tools.filter((t) => t.categorySlug === c.slug) : [],
      providers: u.providers.filter((p) => p.metierSlug === c.slug),
    })),
  }));
  return (
    <>
      <Tracker site={site.key} pageType="assistant" />
      <Assistant universes={data} />
    </>
  );
}
