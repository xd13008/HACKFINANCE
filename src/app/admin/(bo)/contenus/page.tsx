import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Card, PageHeader, StatusBadge, Table, btnCls, inputCls } from "@/components/admin/ui";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";

export default async function ContentList({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; q?: string }> }) {
  await requireRole("editor", "compliance", "admin");
  const sp = await searchParams;
  const { site } = await currentSite();
  const db = await serverClient();
  let q = db.from("content_items").select("id,title,path,type,status,published_at,review_due_at,robots,site_id,sites(name),keyword_targets!content_items_primary_keyword_id_fkey(keyword,volume)").order("updated_at", { ascending: false }).limit(300);
  if (site) q = q.eq("site_id", site.id);
  if (sp.type) q = q.eq("type", sp.type as never);
  if (sp.status) q = q.eq("status", sp.status as never);
  if (sp.q) q = q.ilike("title", `%${sp.q}%`);
  const { data } = await q;
  const now = Date.now();
  return (
    <div>
      <PageHeader title="Contenus" intro="Tous les contenus des portails. Une modification crée un brouillon ; la version en ligne ne change qu'après validation."
        actions={<Link href="/admin/contenus/nouveau" className={btnCls}>Nouveau contenu</Link>} />
      <form className="flex flex-wrap gap-2 mb-4">
        <input name="q" defaultValue={sp.q} placeholder="Rechercher un titre" className={`${inputCls} max-w-xs`} />
        <select name="type" defaultValue={sp.type ?? ""} className={`${inputCls} max-w-[12rem]`}>
          <option value="">Tous les types</option>{Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} max-w-[10rem]`}>
          <option value="">Tous statuts</option><option value="draft">Brouillon</option><option value="published">Publié</option><option value="unpublished">Dépublié</option><option value="blocked">Bloqué</option>
        </select>
        <button className="text-sm underline">Filtrer</button>
      </form>
      <Card>
        <Table head={["Contenu", "Type", "Mot-clé principal", "Statut", "Revue due", "Portail"]}>
          {(data ?? []).map((c) => {
            const kw = c.keyword_targets as unknown as { keyword: string; volume: number } | null;
            const due = c.review_due_at ? new Date(c.review_due_at).getTime() : null;
            return (
              <tr key={c.id}>
                <td className="py-2 pr-3"><Link href={`/admin/contenus/${c.id}`} className="underline font-medium">{c.title}</Link><p className="text-xs text-ink-3">{c.path}{c.robots === "noindex" && " · noindex"}</p></td>
                <td className="pr-3">{CONTENT_TYPE_LABEL[c.type]}</td>
                <td className="pr-3 text-ink-2">{kw ? <>{kw.keyword} <span className="text-ink-3">({kw.volume})</span></> : <span className="text-amber-700">—</span>}</td>
                <td className="pr-3"><StatusBadge status={c.status} /></td>
                <td className={`pr-3 ${due && due < now ? "text-red-700 font-medium" : "text-ink-3"}`}>{due ? new Date(due).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="text-ink-3">{(c.sites as unknown as { name: string }).name}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
