import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Card, Field, PageHeader, StatusBadge, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { SeoReport } from "@/components/admin/SeoReport";
import {
  addSource, launchAgent, newDraftFromPublished, removeSource, saveBrief, saveDraft, submitVersion, unpublishItem, updateItemSettings, unblockItem,
} from "@/lib/actions/admin";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";

export const maxDuration = 300;

export default async function ContentEditor({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("editor", "compliance", "admin");
  const { id } = await params;
  const db = await serverClient();
  const { data: item } = await db.from("content_items").select("*, sites(key,name,domain)").eq("id", id).maybeSingle();
  if (!item) notFound();
  const site = item.sites as unknown as { key: string; name: string; domain: string };
  const [{ data: versions }, { data: brief }, { data: kw }, { data: pillars }, { data: links }] = await Promise.all([
    db.from("content_versions").select("id,version_no,status,updated_at,author_kind,decision_comment").eq("content_item_id", id).order("version_no", { ascending: false }),
    db.from("seo_briefs").select("*").eq("content_item_id", id).maybeSingle(),
    item.primary_keyword_id ? db.from("keyword_targets").select("*").eq("id", item.primary_keyword_id).single() : Promise.resolve({ data: null }),
    db.from("content_items").select("id,title").eq("site_id", item.site_id).eq("type", "pillar"),
    db.from("internal_link_stats").select("inbound_body_links,outbound_body_links").eq("id", id).maybeSingle(),
  ]);
  const { data: clusterQuestions } = item.cluster
    ? await db.from("keyword_questions").select("question,volume").eq("site_id", item.site_id).eq("cluster", item.cluster).order("volume", { ascending: false }).limit(12)
    : { data: [] as { question: string; volume: number }[] };
  const { data: clusterKeywords } = item.cluster
    ? await db.from("keyword_targets").select("keyword,volume").eq("site_id", item.site_id).eq("cluster", item.cluster).is("target_content_id", null).order("priority", { ascending: false }).limit(10)
    : { data: [] as { keyword: string; volume: number }[] };
  const draftMeta = (versions ?? []).find((v) => v.status === "draft");
  const draft = draftMeta ? (await db.from("content_versions").select("*").eq("id", draftMeta.id).single()).data : null;
  const sources = draft ? (await db.from("content_sources").select("*").eq("content_version_id", draft.id)).data ?? [] : [];
  const report = draft ? (await db.rpc("seo_check", { p_version: draft.id })).data : null;
  const canEdit = me.is("editor");
  const publicUrl = `http://${site.domain.replace(/\.fr$/, ".localhost")}:3000${item.path}`;

  return (
    <div className="space-y-6">
      <PageHeader title={item.title} intro={`${site.name} · ${CONTENT_TYPE_LABEL[item.type]} · ${item.path}`}
        actions={<div className="flex items-center gap-3"><StatusBadge status={item.status} />{item.status === "published" && <a href={publicUrl} target="_blank" className="text-sm underline">Voir en ligne</a>}</div>} />

      <div className="grid xl:grid-cols-[1fr_22rem] gap-6">
        <div className="space-y-6">
          {draft && canEdit ? (
            <Card title={`Brouillon — version ${draft.version_no}`}>
              {draft.decision_comment && <p className="mb-3 rounded-lg bg-amber-50 text-amber-900 p-2 text-sm">Dernier rejet : {draft.decision_comment}</p>}
              <ActionForm action={saveDraft} submit="Enregistrer le brouillon">
                <input type="hidden" name="version_id" value={draft.id} />
                <Field label={`Title (${draft.meta_title.length}/60)`}><input name="meta_title" defaultValue={draft.meta_title} className={inputCls} /></Field>
                <Field label={`Meta description (${draft.meta_description.length}/155)`}><textarea name="meta_description" rows={2} defaultValue={draft.meta_description} className={inputCls} /></Field>
                <Field label="H1"><input name="h1" defaultValue={draft.h1} className={inputCls} /></Field>
                <Field label="Réponse directe (tête de page)" hint="2–3 phrases qui répondent à la requête : utilisé par les moteurs de réponse."><textarea name="summary" rows={3} defaultValue={draft.summary} className={inputCls} /></Field>
                <Field label="Corps (Markdown, titres en ##)"><textarea name="body" rows={18} defaultValue={draft.body} className={`${inputCls} font-mono text-xs`} /></Field>
                <Field label="FAQ (JSON)" hint='[{"q":"…","a":"…"}]'><textarea name="faq" rows={4} defaultValue={JSON.stringify(draft.faq, null, 1)} className={`${inputCls} font-mono text-xs`} /></Field>
                <Field label="Données du gabarit (JSON)"><textarea name="data" rows={3} defaultValue={JSON.stringify(draft.data)} className={`${inputCls} font-mono text-xs`} /></Field>
              </ActionForm>
            </Card>
          ) : (
            <Card title="Aucun brouillon en cours">
              {canEdit ? (
                <div className="space-y-3">
                  <ActionForm action={newDraftFromPublished} submit="Créer un brouillon depuis la version en ligne">
                    <input type="hidden" name="item_id" value={item.id} />
                  </ActionForm>
                  {brief && (
                    <ActionForm action={launchAgent} submit="Faire rédiger un brouillon par l'agent" tone="ghost">
                      <input type="hidden" name="agent" value="redaction" /><input type="hidden" name="target_id" value={item.id} />
                    </ActionForm>
                  )}
                </div>
              ) : <p className="text-sm text-ink-3">Lecture seule.</p>}
            </Card>
          )}

          {draft && canEdit && (
            <Card title={`Sources datées (${sources.length})`}>
              <ul className="text-sm space-y-1 mb-3">
                {sources.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title ?? s.url}</a> <span className="text-ink-3">· consulté le {s.accessed_at}</span></span>
                    <form action={removeSource}><input type="hidden" name="source_id" value={s.id} /><button className="text-xs text-red-700 underline">Retirer</button></form>
                  </li>
                ))}
              </ul>
              <ActionForm action={addSource} submit="Ajouter la source" className="grid sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-end">
                <input type="hidden" name="version_id" value={draft.id} />
                <Field label="URL"><input name="url" required className={inputCls} /></Field>
                <Field label="Titre"><input name="title" className={inputCls} /></Field>
                <Field label="Consulté le"><input type="date" name="accessed_at" className={inputCls} /></Field>
              </ActionForm>
            </Card>
          )}

          {canEdit && (
            <Card title={brief ? "Brief SEO" : "Brief SEO (pré-rempli avec les données Semrush du cluster — à valider)"}>
              <ActionForm action={saveBrief} submit="Enregistrer le brief">
                <input type="hidden" name="item_id" value={item.id} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Requête principale"><input name="primary_keyword" defaultValue={brief?.primary_keyword ?? kw?.keyword ?? ""} required className={inputCls} /></Field>
                  <Field label="Longueur cible (mots)"><input name="target_words" type="number" defaultValue={brief?.target_words ?? ""} className={inputCls} /></Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Requêtes secondaires (une par ligne)"><textarea name="secondary_keywords" rows={4} defaultValue={brief ? brief.secondary_keywords.join("\n") : (clusterKeywords ?? []).map((k) => k.keyword).join("\n")} className={inputCls} /></Field>
                  <Field label="Questions « People also ask »"><textarea name="questions" rows={4} defaultValue={brief ? brief.questions.join("\n") : (clusterQuestions ?? []).map((q) => q.question).join("\n")} className={inputCls} /></Field>
                  <Field label="Plan (## / ### par ligne)"><textarea name="outline" rows={4} defaultValue={((brief?.outline ?? []) as { level: number; text: string }[]).map((o) => `${"#".repeat(o.level)} ${o.text}`).join("\n")} className={inputCls} /></Field>
                  <Field label="Entités à couvrir"><textarea name="entities" rows={4} defaultValue={brief?.entities.join("\n")} className={inputCls} /></Field>
                </div>
                <Field label="Appel à l'action"><input name="cta" defaultValue={brief?.cta ?? ""} className={inputCls} /></Field>
              </ActionForm>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {draft && (
            <Card title="Checklist SEO (en direct)">
              <SeoReport report={report as never} />
              {canEdit && (
                <div className="mt-4">
                  <ActionForm action={submitVersion} submit="Soumettre à validation">
                    <input type="hidden" name="version_id" value={draft.id} />
                  </ActionForm>
                </div>
              )}
            </Card>
          )}
          {kw && (
            <Card title="Mot-clé principal">
              <p className="font-medium">{kw.keyword}</p>
              <p className="text-sm text-ink-2">{kw.volume} rech./mois · CPC {kw.cpc_eur} € · KD {kw.kd} · priorité {kw.priority}</p>
              {kw.current_position && <p className="text-sm">Position actuelle : {kw.current_position}</p>}
            </Card>
          )}
          <Card title="Maillage">
            <p className="text-sm">Liens entrants depuis d&apos;autres corps de texte : <strong>{links?.inbound_body_links ?? 0}</strong></p>
            <p className="text-sm">Liens internes sortants : <strong>{links?.outbound_body_links ?? 0}</strong></p>
            <p className="text-xs text-ink-3 mt-1">Les blocs « À lire aussi » et le fil d&apos;Ariane sont ajoutés automatiquement.</p>
          </Card>
          {canEdit && (
            <Card title="Réglages">
              <ActionForm action={updateItemSettings} submit="Enregistrer">
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="category_id" value={item.category_id ?? ""} />
                <Field label="Slug" hint="Changer le slug d'une page publiée crée une 301."><input name="slug" defaultValue={item.slug} className={inputCls} /></Field>
                <Field label="Indexation"><select name="robots" defaultValue={item.robots} className={inputCls}><option value="index">index</option><option value="noindex">noindex</option></select></Field>
                <Field label="Cluster"><input name="cluster" defaultValue={item.cluster ?? ""} className={inputCls} /></Field>
                <Field label="Dossier pilier"><select name="pillar_id" defaultValue={item.pillar_id ?? ""} className={inputCls}><option value="">—</option>{(pillars ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
              </ActionForm>
            </Card>
          )}
          {item.status === "published" && canEdit && (
            <Card title="Dépublier">
              <ActionForm action={unpublishItem} submit="Dépublier" tone="danger" confirm="Retirer cette page du site ?">
                <input type="hidden" name="item_id" value={item.id} />
                <Field label="Raison"><input name="reason" className={inputCls} /></Field>
              </ActionForm>
            </Card>
          )}
          {item.status === "blocked" && me.is("compliance") && (
            <Card title={`Bloqué : ${item.blocked_reason ?? ""}`}>
              <ActionForm action={unblockItem} submit="Débloquer"><input type="hidden" name="item_id" value={item.id} /></ActionForm>
            </Card>
          )}
          <Card title="Historique des versions">
            <ul className="text-sm space-y-1">
              {(versions ?? []).map((v) => (
                <li key={v.id} className="flex justify-between gap-2">
                  <span>v{v.version_no} {v.author_kind === "agent" && "· agent"}</span>
                  <span className="flex gap-2 items-center"><StatusBadge status={v.status} />{v.status === "submitted" && <Link href={`/admin/validation/${v.id}`} className="underline text-xs">revoir</Link>}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
