import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, StatusBadge, Table } from "@/components/admin/ui";
import { publishPriorityCities, setCategoryStatus } from "@/lib/actions/admin";
import { slugify } from "@/lib/jobs";

/** Annuaires prioritaires et leurs requêtes « métier + ville » (Semrush, data/98 et data/99). */
const DIRECTORIES: { slug: string; prefix: string }[] = [
  { slug: "experts-comptables", prefix: "expert comptable " },
  { slug: "cabinets-recrutement-finance", prefix: "cabinet de recrutement " },
  { slug: "commissaires-aux-comptes", prefix: "commissaire aux comptes " },
];
const TOP = 15;

/**
 * Mise en ligne des pages locales : pour chaque annuaire prioritaire, l'état de la catégorie et de la page d'annuaire,
 * puis les villes les plus recherchées avec leurs fiches en brouillon et publiées.
 */
export async function LocalPriorities({ siteId }: { siteId: string }) {
  const db = await serverClient();
  const { data: cats } = await db.from("categories").select("id,slug,name,status").eq("site_id", siteId).eq("kind", "provider")
    .in("slug", DIRECTORIES.map((d) => d.slug));
  const { data: pages } = await db.from("content_items").select("id,slug,status,path").eq("site_id", siteId).eq("type", "provider_directory")
    .in("slug", DIRECTORIES.map((d) => d.slug));
  const { data: kws } = await db.from("keyword_targets").select("keyword,volume,cluster").eq("site_id", siteId)
    .in("cluster", DIRECTORIES.map((d) => d.slug)).order("volume", { ascending: false }).limit(300);

  const blocks = await Promise.all(DIRECTORIES.map(async (d) => {
    const cat = (cats ?? []).find((c) => c.slug === d.slug);
    if (!cat) return null;
    const cities = (kws ?? []).filter((k) => k.cluster === d.slug && k.keyword.startsWith(d.prefix))
      .map((k) => ({ keyword: k.keyword, volume: k.volume ?? 0, slug: slugify(k.keyword.slice(d.prefix.length)) }));
    const rows = await Promise.all(cities.map(async (city) => {
      const base = () => db.from("providers").select("id,provider_categories!inner(category_id)", { count: "exact", head: true })
        .eq("provider_categories.category_id", cat.id).eq("city_slug", city.slug);
      const [{ count: drafts }, { count: published }] = await Promise.all([
        base().eq("status", "draft").neq("verification_status", "rejected"), base().eq("status", "published"),
      ]);
      return { ...city, drafts: drafts ?? 0, published: published ?? 0 };
    }));
    const top = rows.filter((r) => r.drafts + r.published > 0).slice(0, TOP);
    return { d, cat, page: (pages ?? []).find((p) => p.slug === d.slug), top };
  }));

  return (
    <Card title="Pages locales prioritaires">
      <p className="text-sm text-ink-2 mb-4">Une page « métier + ville » apparaît quand : 1. la catégorie est publiée ; 2. la page d&apos;annuaire est validée
        (Contenus) ; 3. la ville compte au moins 3 fiches publiées. Les fiches restent marquées « non vérifiées ».</p>
      {blocks.filter(Boolean).map((b) => {
        const { d, cat, page, top } = b!;
        const toPublish = top.filter((r) => r.drafts > 0);
        return (
          <div key={d.slug} className="border-t border-line py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">{cat.name}</p>
              <span className="text-sm">Catégorie : <StatusBadge status={cat.status} /></span>
              <span className="text-sm">Page d&apos;annuaire : {page ? <><StatusBadge status={page.status} /> <Link href={`/admin/contenus/${page.id}`} className="underline">relire et valider</Link></> : "—"}</span>
              {/* Toujours affiché (publier / repasser en brouillon) : le message de résultat reste visible. */}
              <ActionForm action={setCategoryStatus} submit={cat.status === "published" ? "Repasser la catégorie en brouillon" : "Publier la catégorie"}
                tone={cat.status === "published" ? "ghost" : undefined} className="flex gap-2">
                <input type="hidden" name="category_id" value={cat.id} /><input type="hidden" name="publish" value={cat.status === "published" ? "0" : "1"} />
              </ActionForm>
            </div>
            <Table head={["Requête", "Recherches/mois", "Fiches en brouillon", "Fiches publiées", "Page"]} empty="Aucune ville avec des fiches.">
              {top.map((r) => (
                <tr key={r.slug}>
                  <td className="py-1.5 pr-3">{r.keyword}</td><td className="pr-3">{r.volume.toLocaleString("fr-FR")}</td>
                  <td className="pr-3">{r.drafts.toLocaleString("fr-FR")}</td><td className="pr-3">{r.published.toLocaleString("fr-FR")}</td>
                  <td className="text-xs">/prestataires/{d.slug}/{r.slug}</td>
                </tr>
              ))}
            </Table>
            {top.length > 0 && (
              <ActionForm action={publishPriorityCities}
                submit={toPublish.length ? `Publier les fiches de ces ${toPublish.length} villes` : "Toutes les fiches de ces villes sont publiées"} className="flex gap-2"
                confirm={`Publier ${toPublish.reduce((n, r) => n + r.drafts, 0).toLocaleString("fr-FR")} fiche(s) en brouillon (${toPublish.length} villes) pour « ${cat.name} » ? Elles resteront marquées « non vérifiées ».`}>
                <input type="hidden" name="category_id" value={cat.id} />
                <input type="hidden" name="cities" value={toPublish.map((r) => r.slug).join(",")} />
              </ActionForm>
            )}
          </div>
        );
      })}
    </Card>
  );
}
