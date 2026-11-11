import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, StatusBadge, Table, btnCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { setCategoryStatus } from "@/lib/actions/admin";

export default async function Catalogue() {
  await requireRole("editor", "admin");
  const db = await serverClient();
  const [{ data: sw }, { data: drafts }, { data: tests }, { data: cats }, { data: draftPlans }] = await Promise.all([
    db.from("software").select("id,name,vendor,slug,status,is_fictional,software_categories(categories(name))").order("name"),
    db.from("software_facts").select("software_id").eq("status", "draft"),
    db.from("test_runs").select("software_id,category_id,status"),
    db.from("categories").select("id,name,status,kind,sites(name)").eq("kind", "software").order("sort"),
    db.from("pricing_plans").select("software_id").eq("status", "draft"),
  ]);
  for (const d of draftPlans ?? []) drafts?.push({ software_id: d.software_id });
  const pendingFacts = new Map<string, number>();
  for (const d of drafts ?? []) pendingFacts.set(d.software_id, (pendingFacts.get(d.software_id) ?? 0) + 1);
  return (
    <div>
      <PageHeader title="Catalogue logiciels" intro="Faits sourcés et prix : un fait n'est affiché qu'une fois validé par un éditeur humain."
        actions={<Link href="/admin/catalogue/nouveau" className={btnCls}>Ajouter un logiciel</Link>} />
      <Card>
        <Table head={["Logiciel", "Catégories", "Statut", "Test", "Faits et prix à valider"]}>
          {(sw ?? []).map((s) => {
            const t = (tests ?? []).filter((x) => x.software_id === s.id);
            return (
              <tr key={s.id}>
                <td className="py-2 pr-3"><Link href={`/admin/catalogue/${s.id}`} className="underline font-medium">{s.name}</Link> {s.is_fictional && <Badge tone="warn">fictif</Badge>}<p className="text-xs text-ink-3">{s.vendor}</p></td>
                <td className="pr-3 text-ink-2">{(s.software_categories as unknown as { categories: { name: string } }[]).map((c) => c.categories.name).join(", ")}</td>
                <td className="pr-3"><StatusBadge status={s.status} /></td>
                <td className="pr-3">{t.some((x) => x.status === "validated") ? <Badge tone="good">Testé</Badge> : <Badge>Référencé, non testé</Badge>}</td>
                <td>{pendingFacts.get(s.id) ? <Badge tone="warn">{pendingFacts.get(s.id)} en attente</Badge> : "—"}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <Card title="Catégories de logiciels">
        <p className="text-sm text-ink-3 mb-3">Une catégorie ne peut être publiée qu&apos;avec au moins un test validé : sinon sa page serait vide.</p>
        <Table head={["Catégorie", "Portail", "Statut", "Tests validés", ""]}>
          {(cats ?? []).map((c) => {
            const n = (tests ?? []).filter((t) => t.category_id === c.id && t.status === "validated").length;
            return (
              <tr key={c.id}>
                <td className="py-2 pr-3 font-medium">{c.name}</td>
                <td className="pr-3 text-ink-2">{(c.sites as unknown as { name: string } | null)?.name}</td>
                <td className="pr-3"><StatusBadge status={c.status} /></td>
                <td className="pr-3">{n || "—"}</td>
                <td>
                  <ActionForm action={setCategoryStatus} submit={c.status === "published" ? "Repasser en brouillon" : "Publier"} tone={c.status === "published" ? "ghost" : undefined}>
                    <input type="hidden" name="category_id" value={c.id} />
                    <input type="hidden" name="publish" value={c.status === "published" ? "0" : "1"} />
                  </ActionForm>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
