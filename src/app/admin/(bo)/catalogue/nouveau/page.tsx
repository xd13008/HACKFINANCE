import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Card, Field, PageHeader, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createSoftware } from "@/lib/actions/admin";

export default async function NewSoftware() {
  await requireRole("editor");
  const db = await serverClient();
  const { data: cats } = await db.from("categories").select("id,name,sites(name)").eq("kind", "software").order("name");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Ajouter un logiciel" />
      <Card>
        <ActionForm action={createSoftware} submit="Créer la fiche">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nom"><input name="name" required className={inputCls} /></Field>
            <Field label="Slug"><input name="slug" required pattern="[a-z0-9-]+" className={inputCls} /></Field>
            <Field label="Éditeur"><input name="vendor" required className={inputCls} /></Field>
            <Field label="Site web"><input name="website" className={inputCls} /></Field>
          </div>
          <Field label="Accroche"><input name="tagline" className={inputCls} /></Field>
          <Field label="Catégorie principale">
            <select name="category_id" className={inputCls}><option value="">—</option>
              {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({(c.sites as unknown as { name: string }).name})</option>)}</select>
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
