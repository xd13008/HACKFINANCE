import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";
import type { RelatedLink } from "@/components/public/Related";

type Page = {
  id: string; path: string; type: string; h1: string; cluster: string | null;
  category_id: string | null; software_id: string | null; software_b_id: string | null; pillar_id: string | null;
};

const allPages = cache(async (siteId: string): Promise<Page[]> => {
  const { data } = await publicClient()
    .from("published_content")
    .select("id,path,type,h1,cluster,category_id,software_id,software_b_id,pillar_id")
    .eq("site_id", siteId)
    .neq("type", "home");
  return (data ?? []) as Page[];
});

const toLink = (p: Page): RelatedLink => ({ path: p.path, label: p.h1, kind: CONTENT_TYPE_LABEL[p.type] });

/**
 * Maillage interne automatique, dérivé de la taxonomie :
 * catégorie ↔ fiches ↔ prix/alternatives ↔ duels ↔ guides du cluster ↔ dossier pilier.
 */
export async function relatedFor(siteId: string, page: { id: string; type: string; category_id?: string | null; software_id?: string | null; software_b_id?: string | null; cluster?: string | null; pillar_id?: string | null }, limit = 8): Promise<RelatedLink[]> {
  const pages = (await allPages(siteId)).filter((p) => p.id !== page.id && p.type !== "page");
  const picked: Page[] = [];
  const add = (list: Page[]) => { for (const p of list) if (!picked.some((x) => x.id === p.id)) picked.push(p); };

  const sameSoftware = (p: Page) => !!page.software_id && (p.software_id === page.software_id || p.software_b_id === page.software_id);
  const sameCategory = (p: Page) => !!page.category_id && p.category_id === page.category_id;
  const sameCluster = (p: Page) => !!page.cluster && p.cluster === page.cluster;

  switch (page.type) {
    case "software_review":
    case "pricing":
    case "alternatives":
      add(pages.filter((p) => sameSoftware(p) && ["software_review", "pricing", "alternatives", "duel"].includes(p.type)));
      add(pages.filter((p) => sameCategory(p) && ["category_ranking", "facet_landing"].includes(p.type)));
      add(pages.filter((p) => sameCluster(p) && ["guide", "pillar", "resource"].includes(p.type)));
      break;
    case "duel":
      add(pages.filter((p) => p.type === "software_review" && (p.software_id === page.software_id || p.software_id === page.software_b_id)));
      add(pages.filter((p) => sameCategory(p) && p.type === "category_ranking"));
      add(pages.filter((p) => sameCategory(p) && p.type === "duel"));
      break;
    case "category_ranking":
    case "facet_landing":
      add(pages.filter((p) => sameCategory(p) && ["facet_landing", "category_ranking", "duel"].includes(p.type)));
      add(pages.filter((p) => sameCluster(p) && ["guide", "pillar", "resource"].includes(p.type)));
      break;
    case "provider_directory":
      add(pages.filter((p) => p.type === "provider_directory"));
      add(pages.filter((p) => ["pillar", "simulator", "guide"].includes(p.type)));
      break;
    default: {
      const pillar = pages.find((p) => p.id === page.pillar_id);
      if (pillar) add([pillar]);
      add(pages.filter((p) => p.pillar_id && p.pillar_id === (page.pillar_id ?? page.id)));
      add(pages.filter((p) => sameCluster(p)));
      add(pages.filter((p) => ["category_ranking", "simulator"].includes(p.type)));
    }
  }
  return picked.slice(0, limit).map(toLink);
}
