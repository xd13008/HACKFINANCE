import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { addFact, addPricing, createTestRun, decideFact, publishSoftwareListing } from "@/lib/actions/admin";
import { priceLabel } from "@/lib/format";

export default async function SoftwareAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("editor", "admin");
  const { id } = await params;
  const db = await serverClient();
  const { data: sw } = await db.from("software").select("*").eq("id", id).maybeSingle();
  if (!sw) notFound();
  const [{ data: facts }, { data: plans }, { data: cats }, { data: tests }, { data: contents }] = await Promise.all([
    db.from("software_facts").select("*").eq("software_id", id).order("collected_at", { ascending: false }),
    db.from("pricing_plans").select("*").eq("software_id", id).order("sort"),
    db.from("software_categories").select("category_id,categories(name)").eq("software_id", id),
    db.from("test_runs").select("id,status,tested_at,category_id").eq("software_id", id).order("tested_at", { ascending: false }),
    db.from("content_items").select("id,type,path,status").eq("software_id", id),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={sw.name} intro={`${sw.vendor} · /logiciels/${sw.slug}`} actions={<div className="flex gap-2"><StatusBadge status={sw.status} />{sw.is_fictional && <Badge tone="warn">fictif</Badge>}</div>} />
      {sw.status === "draft" && (
        <Card title="Fiche non publiée">
          <ActionForm action={publishSoftwareListing} submit="Publier comme « référencé, non testé »"><input type="hidden" name="software_id" value={sw.id} /></ActionForm>
        </Card>
      )}
      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="Faits sourcés">
          <Table head={["Type", "Valeur", "Source", "Auteur", "Statut", ""]}>
            {(facts ?? []).map((f) => (
              <tr key={f.id}>
                <td className="py-2 pr-2 font-mono text-xs">{f.fact_type}</td>
                <td className="pr-2">{JSON.stringify(f.value)}</td>
                <td className="pr-2"><a href={f.source_url} target="_blank" rel="noopener noreferrer" className="underline text-xs">source</a><p className="text-xs text-ink-3">{new Date(f.collected_at).toLocaleDateString("fr-FR")}</p></td>
                <td className="pr-2">{f.author_kind === "agent" ? <Badge tone="warn">agent</Badge> : f.author_kind}</td>
                <td className="pr-2"><StatusBadge status={f.status} />{f.note && <p className="text-xs text-ink-3 max-w-[14rem]">{f.note}</p>}</td>
                <td>{f.status === "draft" && (
                  <div className="flex gap-2">
                    <form action={decideFact}><input type="hidden" name="fact_id" value={f.id} /><input type="hidden" name="decision" value="validate" /><button className="text-xs underline text-green-700">Valider</button></form>
                    <form action={decideFact}><input type="hidden" name="fact_id" value={f.id} /><input type="hidden" name="decision" value="reject" /><button className="text-xs underline text-red-700">Rejeter</button></form>
                  </div>
                )}</td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={addFact} submit="Ajouter un fait" className="grid sm:grid-cols-4 gap-2 items-end">
              <input type="hidden" name="software_id" value={sw.id} />
              <Field label="Type"><input name="fact_type" placeholder="free_plan" required pattern="[a-z0-9_]+" className={inputCls} /></Field>
              <Field label="Valeur (JSON)"><input name="value" placeholder="true" required className={inputCls} /></Field>
              <Field label="Source (URL)"><input name="source_url" required className={inputCls} /></Field>
            </ActionForm>
          </div>
        </Card>
        <Card title="Tarifs">
          <Table head={["Offre", "Prix", "Source", "Statut"]}>
            {(plans ?? []).map((p) => (
              <tr key={p.id}><td className="py-2 pr-2">{p.plan_name}</td><td className="pr-2">{priceLabel(p)}</td>
                <td className="pr-2 text-xs"><a href={p.source_url} className="underline" target="_blank" rel="noopener noreferrer">{p.source_date}</a></td><td><StatusBadge status={p.status} /></td></tr>
            ))}
          </Table>
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={addPricing} submit="Ajouter une offre" className="grid sm:grid-cols-3 gap-2 items-end">
              <input type="hidden" name="software_id" value={sw.id} />
              <Field label="Offre"><input name="plan_name" required className={inputCls} /></Field>
              <Field label="Prix € HT (vide = devis)"><input name="price_eur" type="number" step="0.01" className={inputCls} /></Field>
              <Field label="Période"><select name="billing_period" className={inputCls}><option value="month">mois</option><option value="year">an</option><option value="free">gratuit</option><option value="quote">devis</option><option value="one_time">une fois</option></select></Field>
              <Field label="Par"><input name="per_unit" className={inputCls} /></Field>
              <Field label="Source (URL)"><input name="source_url" required className={inputCls} /></Field>
              <Field label="Relevé le"><input name="source_date" type="date" className={inputCls} /></Field>
            </ActionForm>
          </div>
        </Card>
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="Tests">
          <ul className="text-sm space-y-1 mb-3">{(tests ?? []).map((t) => <li key={t.id}><Link href={`/admin/tests/${t.id}`} className="underline">Test du {t.tested_at}</Link> <StatusBadge status={t.status} /></li>)}</ul>
          <ActionForm action={createTestRun} submit="Démarrer un test" className="grid sm:grid-cols-2 gap-2 items-end">
            <input type="hidden" name="software_id" value={sw.id} />
            <Field label="Catégorie"><select name="category_id" className={inputCls}>{(cats ?? []).map((c) => <option key={c.category_id} value={c.category_id}>{(c.categories as unknown as { name: string }).name}</option>)}</select></Field>
            <Field label="Date du test"><input type="date" name="tested_at" className={inputCls} /></Field>
            <Field label="Version testée"><input name="product_version" className={inputCls} /></Field>
            <Field label="Protocole"><input name="protocol" required className={inputCls} /></Field>
            <label className="text-sm flex gap-2"><input type="checkbox" name="requested_by_vendor" /> Demandé par l&apos;éditeur</label>
          </ActionForm>
        </Card>
        <Card title="Contenus liés">
          <ul className="text-sm space-y-1">{(contents ?? []).map((c) => <li key={c.id}><Link href={`/admin/contenus/${c.id}`} className="underline">{c.path}</Link> <StatusBadge status={c.status} /></li>)}</ul>
          <Link href="/admin/contenus/nouveau" className="text-sm underline mt-2 inline-block">Créer une fiche avis / prix / alternatives</Link>
        </Card>
      </div>
    </div>
  );
}
