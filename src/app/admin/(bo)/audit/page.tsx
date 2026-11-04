import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  await requireRole("admin", "compliance", "editor");
  const sp = await searchParams;
  const db = await serverClient();
  let q = db.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  if (sp.table) q = q.eq("table_name", sp.table);
  const [{ data }, { data: people }] = await Promise.all([q, db.from("staff_profiles").select("user_id,display_name")]);
  const name = new Map((people ?? []).map((p) => [p.user_id, p.display_name]));
  const changed = (b: Record<string, unknown> | null, a: Record<string, unknown> | null) =>
    !b || !a ? [] : Object.keys(a).filter((k) => !["updated_at"].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return (
    <div>
      <PageHeader title="Journal d'audit" intro="Qui a modifié quoi, avec quelle source et quel agent. Journal en ajout seul : personne ne peut le modifier." />
      <Card>
        <Table head={["Date", "Acteur", "Action", "Table", "Champs modifiés", "Source"]}>
          {(data ?? []).map((l) => (
            <tr key={l.id}>
              <td className="py-1.5 pr-2 text-xs text-ink-3 whitespace-nowrap">{new Date(l.at).toLocaleString("fr-FR")}</td>
              <td className="pr-2">{l.actor_id ? name.get(l.actor_id) ?? l.actor_id.slice(0, 8) : "système"} {l.actor_kind === "agent" && <Badge tone="warn">agent</Badge>}</td>
              <td className="pr-2"><Badge tone={l.action.startsWith("workflow:") ? "info" : "neutral"}>{l.action}</Badge></td>
              <td className="pr-2"><a href={`?table=${l.table_name}`} className="underline font-mono text-xs">{l.table_name}</a></td>
              <td className="pr-2 text-xs text-ink-2 max-w-md truncate">{changed(l.before as never, l.after as never).join(", ") || (l.action.startsWith("workflow:") ? JSON.stringify(l.after) : "")}</td>
              <td className="text-xs">{l.source_url && <a href={l.source_url} className="underline" target="_blank" rel="noopener noreferrer">source</a>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
