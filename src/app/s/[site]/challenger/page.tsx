import { Tracker } from "@/components/public/Tracker";
import { Challenger, type ChallengerUniverse } from "@/components/public/Challenger";
import { loadCategoryHub } from "@/lib/category";
import { loadAllUniverses } from "@/lib/universe";
import { staticMetadata } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/challenger", "Challenger mon logiciel ou mon cabinet : 5 alternatives comparées",
    "Indiquez avec qui vous travaillez aujourd'hui : nous le comparons aux solutions testées par la rédaction, sur vos critères. Gratuit, sans résultat sponsorisé.");
}

/** Maquette, écran 8 : « Challenger mon outil ou mon prestataire ». Données publiées et validées seulement. */
export default async function ChallengePage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const universes = await loadAllUniverses(site.id);
  const data: ChallengerUniverse[] = await Promise.all(universes.map(async (u) => ({
    slug: u.vertical.slug, name: u.vertical.name,
    // Règle 5 : crédit, financement, assurance en information seulement, aucune alternative proposée.
    infoOnly: u.vertical.slug === "financement-aides-risques",
    software: (await Promise.all(u.categories.filter((c) => c.kind === "software").map((c) => loadCategoryHub(site.id, c.slug))))
      .filter((h) => !!h)
      .map((h) => ({
        slug: h.category.slug, name: h.category.name,
        criteria: h.criteria.map((c) => ({ key: c.key, label: c.label })),
        tools: h.tools.map((t) => ({ slug: t.slug, name: t.name, score: t.score, criteria: t.criteria, entry: t.entry })),
        referenced: h.referenced.map((r) => ({ slug: r.slug, name: r.name })),
      })),
    providers: u.categories.filter((c) => c.kind === "provider").map((c) => ({ slug: c.slug, name: c.name })),
  })));
  return (
    <>
      <Tracker site={site.key} pageType="challenge" />
      <Challenger site={site.key} universes={data} />
    </>
  );
}
