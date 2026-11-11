import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { addFact, addPricing, createTestRun, decideFact, decidePricing, decideReviewQuote, decideReviewSource, importG2Now, publishSoftwareListing } from "@/lib/actions/admin";
import { priceLabel } from "@/lib/format";

export default async function SoftwareAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("editor", "admin");
  const { id } = await params;
  const db = await serverClient();
  const { data: sw } = await db.from("software").select("*").eq("id", id).maybeSingle();
  if (!sw) notFound();
  const [{ data: facts }, { data: plans }, { data: cats }, { data: tests }, { data: contents }, { data: reviews }] = await Promise.all([
    db.from("software_facts").select("*").eq("software_id", id).order("collected_at", { ascending: false }),
    db.from("pricing_plans").select("*").eq("software_id", id).order("sort"),
    db.from("software_categories").select("category_id,categories(name)").eq("software_id", id),
    db.from("test_runs").select("id,status,tested_at,category_id").eq("software_id", id).order("tested_at", { ascending: false }),
    db.from("content_items").select("id,type,path,status").eq("software_id", id),
    db.from("review_sources").select("*, review_quotes(*)").eq("software_id", id).order("platform"),
  ]);
  const draftQuotes = (reviews ?? []).flatMap((r) => (r.review_quotes ?? []).filter((q) => q.status === "draft").map((q) => ({ ...q, platform: r.platform })));
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
                <td className="pr-2"><StatusBadge status={f.status} />{f.note && <details className="text-xs text-ink-3 max-w-[14rem]"><summary className="cursor-pointer">Citation</summary>{f.note}</details>}</td>
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
        <Card title="Avis publics (notes des plateformes)">
          <p className="text-xs text-ink-3 mb-2">Ouvrez la page, corrigez la note et le nombre d&apos;avis si besoin, puis validez. Ces notes ne sont jamais intégrées à la note de la rédaction.</p>
          <Table head={["Plateforme", "Note", "Avis", "Relevé", "Statut"]} empty="Aucune note relevée.">
            {(reviews ?? []).map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-2"><a href={r.url} className="underline" target="_blank" rel="noopener noreferrer">{r.platform}</a></td>
                <td className="pr-2">{r.rating ?? "—"} / {r.rating_scale}</td>
                <td className="pr-2">{r.review_count ?? "—"}</td>
                <td className="pr-2 text-xs">{r.captured_at}</td>
                <td><StatusBadge status={r.status} />{r.status === "draft" && (
                  <div className="mt-2 space-y-2">
                    <ActionForm action={decideReviewSource} submit="Vérifié : valider" className="flex flex-wrap gap-2 items-end">
                      <input type="hidden" name="review_source_id" value={r.id} />
                      <Field label="Note"><input name="rating" defaultValue={r.rating ?? ""} className={inputCls} size={4} /></Field>
                      <Field label="Nb d'avis"><input name="review_count" defaultValue={r.review_count ?? ""} className={inputCls} size={5} /></Field>
                      <Field label="Relevé le"><input name="captured_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></Field>
                    </ActionForm>
                    <ActionForm action={decideReviewSource} submit="Rejeter" tone="ghost">
                      <input type="hidden" name="review_source_id" value={r.id} /><input type="hidden" name="decision" value="reject" />
                    </ActionForm>
                  </div>
                )}</td>
              </tr>
            ))}
          </Table>
          {draftQuotes.length > 0 && (
            <div className="mt-4 border-t border-line pt-3 space-y-2">
              <p className="text-sm font-medium">Citations à valider ({draftQuotes.length})</p>
              {draftQuotes.map((q) => (
                <div key={q.id} className="text-sm rounded-lg bg-surface-2 p-2">
                  <p>« {q.quote} »</p>
                  <p className="text-xs text-ink-3">{q.author_label} · {q.review_date} · {q.platform} · {q.sentiment} · <a href={q.review_url} target="_blank" rel="noopener noreferrer" className="underline">avis</a></p>
                  <div className="flex gap-3 mt-1">
                    <form action={decideReviewQuote}><input type="hidden" name="quote_id" value={q.id} /><input type="hidden" name="decision" value="validate" /><button className="text-xs underline text-green-700">Valider</button></form>
                    <form action={decideReviewQuote}><input type="hidden" name="quote_id" value={q.id} /><input type="hidden" name="decision" value="reject" /><button className="text-xs underline text-red-700">Rejeter</button></form>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-line pt-3">
            <ActionForm action={importG2Now} submit="Importer les avis G2" className="flex flex-wrap gap-2 items-end">
              <input type="hidden" name="software_id" value={sw.id} />
              <Field label="Identifiant produit G2"><input name="g2_product_id" required defaultValue={sw.g2_product_id ?? ""} className={inputCls} /></Field>
            </ActionForm>
            <p className="text-xs text-ink-3 mt-1">API de syndication G2 : note et citations courtes arrivent en brouillon, à valider.</p>
          </div>
        </Card>
        <Card title="Tarifs">
          <Table head={["Offre", "Prix", "Source", "Statut"]}>
            {(plans ?? []).map((p) => (
              <tr key={p.id}><td className="py-2 pr-2">{p.plan_name}</td><td className="pr-2">{priceLabel(p)}</td>
                <td className="pr-2 text-xs"><a href={p.source_url} className="underline" target="_blank" rel="noopener noreferrer">{p.source_date}</a>{p.conditions && <p className="text-ink-3">{p.conditions}</p>}</td>
                <td><StatusBadge status={p.status} />{p.status === "draft" && (
                  <div className="flex gap-2 mt-1">
                    <form action={decidePricing}><input type="hidden" name="pricing_id" value={p.id} /><input type="hidden" name="decision" value="validate" /><button className="text-xs underline text-green-700">Valider</button></form>
                    <form action={decidePricing}><input type="hidden" name="pricing_id" value={p.id} /><input type="hidden" name="decision" value="reject" /><button className="text-xs underline text-red-700">Rejeter</button></form>
                  </div>
                )}</td></tr>
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
