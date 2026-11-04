import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Card, Field, PageHeader, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createContent } from "@/lib/actions/admin";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";

export default async function NewContent({ searchParams }: { searchParams: Promise<{ keyword?: string }> }) {
  await requireRole("editor");
  const sp = await searchParams;
  const { sites, site } = await currentSite();
  const db = await serverClient();
  const [{ data: cats }, { data: sw }, { data: kws }] = await Promise.all([
    db.from("categories").select("id,name,site_id").order("name"),
    db.from("software").select("id,name").order("name"),
    db.from("keyword_targets").select("keyword,volume,site_id").is("target_content_id", null).order("priority", { ascending: false }).limit(200),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouveau contenu" intro="Partez d'un mot-clé du plan de production : une page cible par mot-clé principal. Le slug détermine l'URL selon le type." />
      <Card>
        <ActionForm action={createContent} submit="Créer le brouillon">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Portail"><select name="site_id" defaultValue={site?.id ?? sites[0]?.id} className={inputCls}>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Type"><select name="type" className={inputCls}>{Object.entries(CONTENT_TYPE_LABEL).filter(([k]) => k !== "home").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          </div>
          <Field label="Titre interne / H1 provisoire"><input name="title" required className={inputCls} /></Field>
          <Field label="Slug" hint="Avis/prix/alternatives : slug du logiciel · Comparatif : slug de catégorie · Sélection : categorie/facette · Duel : a-vs-b (ordre alphabétique)">
            <input name="slug" required pattern="[a-z0-9-]+(/[a-z0-9-]+)?" className={inputCls} />
          </Field>
          <Field label="Mot-clé principal" hint="Choisissez dans le plan ou saisissez-en un nouveau">
            <input name="keyword" list="kw" defaultValue={sp.keyword} className={inputCls} />
            <datalist id="kw">{(kws ?? []).map((k) => <option key={k.keyword + k.site_id} value={k.keyword}>{k.volume}</option>)}</datalist>
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Catégorie"><select name="category_id" className={inputCls}><option value="">—</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Logiciel"><select name="software_id" className={inputCls}><option value="">—</option>{(sw ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Logiciel B (duel)"><select name="software_b_id" className={inputCls}><option value="">—</option>{(sw ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </div>
          <Field label="Cluster SEO"><input name="cluster" className={inputCls} placeholder="ex. tresorerie" /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}
