import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, periodFrom, requireStaff } from "@/lib/admin";
import { Card, PageHeader, Stat, StatusBadge, Table } from "@/components/admin/ui";
import { LineChart } from "@/components/admin/Charts";
import { closeTask } from "@/lib/actions/admin";
import { formatNum } from "@/lib/format";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const me = await requireStaff();
  const { site } = await currentSite();
  const db = await serverClient();
  const { from, to } = periodFrom({});
  const sid = site?.id ?? null;

  const scoped = <T extends { eq: (c: string, v: string) => T }>(q: T) => (sid ? q.eq("site_id", sid) : q);
  const [daily, pending, tasks, placements, listings, stale] = await Promise.all([
    db.rpc("analytics_daily", { p_site: sid as string, p_from: from, p_to: to }),
    db.from("content_versions").select("id,version_no,submitted_at,content_items!content_versions_content_item_id_fkey!inner(title,path,site_id,type)").eq("status", "submitted").order("submitted_at"),
    scoped(db.from("review_tasks").select("*").eq("status", "open").neq("kind", "validation")).order("created_at", { ascending: false }).limit(8),
    scoped(db.from("placement_requests").select("id,advertiser_name,status,created_at,budget_range").in("status", ["new", "qualified", "quote_sent"])).order("created_at", { ascending: false }).limit(6),
    scoped(db.from("listing_requests").select("id", { count: "exact", head: true }).eq("status", "new")),
    scoped(db.from("stale_content").select("id", { count: "exact", head: true })),
  ]);
  const days = daily.data ?? [];
  const sum = (k: "pageviews" | "sessions" | "outbound_clicks" | "sponsored_clicks" | "form_submits") => days.reduce((a, d) => a + Number(d[k] ?? 0), 0);
  const pend = (pending.data ?? []).filter((v) => !sid || (v.content_items as unknown as { site_id: string }).site_id === sid);
  const lbl = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-6">
      <PageHeader title={`Bonjour ${me.name.split(" ")[0]}`} intro={`${site ? site.name : "Tous les portails"} · 30 derniers jours`} />
      {(await searchParams).refus && <p className="rounded-lg bg-red-50 text-red-900 p-3 text-sm">Accès refusé : rôle requis ({(await searchParams).refus}).</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Pages vues" value={formatNum(sum("pageviews"))} href="/admin/analytics" />
        <Stat label="Sessions" value={formatNum(sum("sessions"))} href="/admin/analytics" />
        <Stat label="Clics sortants" value={formatNum(sum("outbound_clicks"))} hint={`dont ${formatNum(sum("sponsored_clicks"))} sponsorisés`} href="/admin/analytics" />
        <Stat label="À valider" value={pend.length} href="/admin/validation" />
        <Stat label="Demandes de référencement" value={listings.count ?? 0} hint={`${stale.count ?? 0} contenu(s) à revoir`} href="/admin/demandes" />
      </div>

      <Card title="Audience quotidienne">
        <LineChart title="Pages vues et sessions par jour" series={[
          { name: "Pages vues", color: "var(--viz-series-1)", points: days.map((d) => ({ label: lbl(d.day!), value: Number(d.pageviews) })) },
          { name: "Sessions", color: "var(--viz-series-2)", points: days.map((d) => ({ label: lbl(d.day!), value: Number(d.sessions) })) },
        ]} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="File de validation" actions={<Link href="/admin/validation" className="text-sm underline">Tout voir</Link>}>
          <Table head={["Contenu", "Version", "Soumis le"]} empty="Rien à valider.">
            {pend.slice(0, 6).map((v) => {
              const it = v.content_items as unknown as { title: string; path: string };
              return (
                <tr key={v.id}><td className="py-2 pr-3"><Link href={`/admin/validation/${v.id}`} className="underline">{it.title}</Link><p className="text-xs text-ink-3">{it.path}</p></td>
                  <td className="pr-3">v{v.version_no}</td><td>{v.submitted_at && new Date(v.submitted_at).toLocaleDateString("fr-FR")}</td></tr>
              );
            })}
          </Table>
        </Card>
        <Card title="Demandes publicitaires en cours" actions={<Link href="/admin/publicite" className="text-sm underline">Régie</Link>}>
          <Table head={["Annonceur", "Budget", "Statut"]} empty="Aucune demande.">
            {(placements.data ?? []).map((p) => (
              <tr key={p.id}><td className="py-2 pr-3">{p.advertiser_name}</td><td className="pr-3 text-ink-2">{p.budget_range}</td><td><StatusBadge status={p.status} /></td></tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card title="Tâches ouvertes" actions={<Link href="/admin/demandes" className="text-sm underline">Demandes</Link>}>
        <Table head={["Type", "Motif", "Créée le", ""]} empty="Aucune tâche ouverte.">
          {(tasks.data ?? []).map((t) => (
            <tr key={t.id}>
              <td className="py-2 pr-3"><StatusBadge status="open" /> <span className="text-xs text-ink-3">{t.kind}</span>{t.blocking && <span className="text-xs text-red-700 ml-1">bloquante</span>}</td>
              <td className="pr-3">{t.reason}</td>
              <td className="pr-3 text-ink-3">{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
              <td><form action={closeTask}><input type="hidden" name="task_id" value={t.id} /><button className="text-xs underline">Marquer traitée</button></form></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
