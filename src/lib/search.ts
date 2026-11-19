import { publicClient } from "@/lib/supabase/public";

/**
 * Recherche publique (maquette, écrans 8 et 12) : logiciels publiés, prestataires publiés, catégories et contenus publiés.
 * Lecture anonyme seulement (RLS) : aucun brouillon, aucun SIREN, aucun contact interne.
 */
export type SearchHit =
  | { kind: "software"; slug: string; name: string; tagline: string | null; categorySlug: string | null; categoryName: string | null; path: string }
  | { kind: "provider"; slug: string; name: string; city: string | null; categorySlug: string; categoryName: string; path: string }
  | { kind: "category"; slug: string; name: string; type: "software" | "provider"; path: string }
  | { kind: "content"; path: string; name: string; type: string };

const db = () => publicClient();
/** Texte de recherche nettoyé : 2 à 80 caractères, sans caractères de filtre PostgREST. */
export function cleanQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function search(siteId: string, raw: string, opts: { kinds?: SearchHit["kind"][]; limit?: number } = {}): Promise<SearchHit[]> {
  const q = cleanQuery(raw);
  if (q.length < 2) return [];
  const limit = opts.limit ?? 8;
  const want = (k: SearchHit["kind"]) => !opts.kinds || opts.kinds.includes(k);
  const { data: cats } = await db().from("categories").select("id,slug,name,kind").eq("site_id", siteId).eq("status", "published");
  const catById = new Map((cats ?? []).map((c) => [c.id, c]));
  const like = `%${q}%`;
  const [sw, prov, content] = await Promise.all([
    want("software") ? db().from("software").select("id,slug,name,tagline").eq("status", "published").ilike("name", like).order("name").limit(limit) : Promise.resolve({ data: [] }),
    want("provider") ? Promise.all([
      db().from("providers_by_category").select("slug,name,city,category_id").ilike("name", `${q}%`).order("name").limit(limit * 3),
      db().from("providers_by_category").select("slug,name,city,category_id").ilike("name", like).order("name").limit(limit * 3),
    ]).then(([a, b]) => ({ data: [...(a.data ?? []), ...(b.data ?? [])] })) : Promise.resolve({ data: [] }),
    want("content") ? db().from("published_content").select("path,h1,type").eq("site_id", siteId).ilike("h1", like).limit(limit) : Promise.resolve({ data: [] }),
  ]);
  const swIds = (sw.data ?? []).map((s) => s.id);
  const { data: links } = swIds.length ? await db().from("software_categories").select("software_id,category_id").in("software_id", swIds) : { data: [] };
  const hits: SearchHit[] = [];
  const rank = (name: string) => { const n = name.toLowerCase(), t = q.toLowerCase(); return n === t ? 0 : n.startsWith(t) ? 1 : 2; };
  if (want("category")) {
    for (const c of (cats ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, limit)) {
      hits.push({ kind: "category", slug: c.slug, name: c.name, type: c.kind as "software" | "provider", path: c.kind === "software" ? `/meilleurs-logiciels/${c.slug}` : `/prestataires/${c.slug}` });
    }
  }
  for (const s of [...(sw.data ?? [])].sort((a, b) => rank(a.name) - rank(b.name))) {
    const cat = (links ?? []).map((l) => (l.software_id === s.id ? catById.get(l.category_id) : undefined)).find(Boolean);
    hits.push({ kind: "software", slug: s.slug, name: s.name, tagline: s.tagline, categorySlug: cat?.slug ?? null, categoryName: cat?.name ?? null, path: `/logiciels/${s.slug}` });
  }
  const seen = new Set<string>();
  // Pertinence : nom exact, puis début du nom, puis le reste (ordre alphabétique conservé à égalité).
  const provs = [...(prov.data ?? [])].sort((a, b) => rank(a.name!) - rank(b.name!));
  for (const p of provs) {
    const cat = catById.get(p.category_id!);
    if (!cat || seen.has(p.slug!)) continue;
    seen.add(p.slug!);
    hits.push({ kind: "provider", slug: p.slug!, name: p.name!, city: p.city, categorySlug: cat.slug, categoryName: cat.name, path: `/prestataires/${cat.slug}/${p.slug}` });
    if (seen.size >= limit) break;
  }
  for (const c of content.data ?? []) hits.push({ kind: "content", path: c.path!, name: c.h1!, type: c.type! });
  return hits;
}
