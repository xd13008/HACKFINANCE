import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";

export default async function Tests() {
  await requireRole("editor");
  const db = await serverClient();
  const { data } = await db.from("test_runs").select("id,tested_at,status,is_fictional,requested_by_vendor,software(name),categories(name)").order("tested_at", { ascending: false });
  return (
    <div>
      <PageHeader title="Tests et notation" intro="Un test validé publie ses notes et met à jour le classement. Il faut au moins une preuve et une note par critère. Un test validé est figé." />
      <Card>
        <Table head={["Logiciel", "Catégorie", "Date", "Statut", ""]}>
          {(data ?? []).map((t) => (
            <tr key={t.id}>
              <td className="py-2 pr-3"><Link href={`/admin/tests/${t.id}`} className="underline">{(t.software as unknown as { name: string }).name}</Link></td>
              <td className="pr-3 text-ink-2">{(t.categories as unknown as { name: string }).name}</td>
              <td className="pr-3">{t.tested_at}</td>
              <td className="pr-3"><StatusBadge status={t.status} /></td>
              <td className="flex gap-1">{t.is_fictional && <Badge tone="warn">fictif</Badge>}{t.requested_by_vendor && <Badge tone="info">demandé par l&apos;éditeur</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
