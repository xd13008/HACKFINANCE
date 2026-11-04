import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";

export default async function ValidationQueue() {
  await requireRole("editor", "compliance");
  const { site } = await currentSite();
  const db = await serverClient();
  let q = db.from("content_versions")
    .select("id,version_no,submitted_at,author_kind,seo_report,content_items!content_versions_content_item_id_fkey!inner(id,title,path,type,site_id,status,published_version_id,sites(name))")
    .eq("status", "submitted").order("submitted_at");
  if (site) q = q.eq("content_items.site_id", site.id);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="File de validation" intro="Rien n'est publié sans passer par ici. Comparez le brouillon et la version en ligne, puis approuvez ou renvoyez en brouillon avec un motif." />
      <Card>
        <Table head={["Contenu", "Type", "Portail", "Auteur", "Soumis le", "Nature"]} empty="Aucune version en attente.">
          {(data ?? []).map((v) => {
            const it = v.content_items as unknown as { id: string; title: string; path: string; type: string; status: string; published_version_id: string | null; sites: { name: string } };
            return (
              <tr key={v.id}>
                <td className="py-2 pr-3"><Link className="underline font-medium" href={`/admin/validation/${v.id}`}>{it.title}</Link><p className="text-xs text-ink-3">{it.path} · v{v.version_no}</p></td>
                <td className="pr-3">{CONTENT_TYPE_LABEL[it.type]}</td>
                <td className="pr-3 text-ink-2">{it.sites.name}</td>
                <td className="pr-3">{v.author_kind === "agent" ? <Badge tone="warn">Agent</Badge> : <Badge>Humain</Badge>}</td>
                <td className="pr-3 text-ink-3">{v.submitted_at && new Date(v.submitted_at).toLocaleString("fr-FR")}</td>
                <td>{it.published_version_id ? <Badge tone="info">Mise à jour</Badge> : <Badge tone="good">Nouveau</Badge>}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
