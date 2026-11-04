import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { SeoReport } from "@/components/admin/SeoReport";
import { approveVersion, blockItem, rejectVersion } from "@/lib/actions/admin";
import { diffLines } from "@/lib/diff";

const FIELDS = ["meta_title", "meta_description", "h1", "summary", "body"] as const;
const LABEL: Record<string, string> = { meta_title: "Title", meta_description: "Meta description", h1: "H1", summary: "Réponse directe", body: "Corps" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("editor", "compliance");
  const { id } = await params;
  const db = await serverClient();
  const { data: v } = await db.from("content_versions").select("*").eq("id", id).maybeSingle();
  if (!v) notFound();
  const { data: item } = await db.from("content_items").select("*, sites(key,name,domain)").eq("id", v.content_item_id).single();
  const site = item!.sites as unknown as { key: string; name: string; domain: string };
  const [{ data: live }, { data: sources }, { data: tasks }] = await Promise.all([
    item!.published_version_id ? db.from("content_versions").select("*").eq("id", item!.published_version_id).single() : Promise.resolve({ data: null }),
    db.from("content_sources").select("*").eq("content_version_id", v.id),
    db.from("review_tasks").select("*").eq("content_item_id", item!.id).eq("status", "open").neq("kind", "validation"),
  ]);
  const report = (v.seo_report ?? null) as never;

  return (
    <div className="space-y-6">
      <PageHeader title={item!.title} intro={`${site.name} · ${item!.path} · version ${v.version_no} soumise le ${v.submitted_at ? new Date(v.submitted_at).toLocaleString("fr-FR") : "—"}`}
        actions={<div className="flex gap-2"><StatusBadge status={v.status} />{v.author_kind === "agent" && <Badge tone="warn">Rédigé par un agent</Badge>}</div>} />

      <div className="grid xl:grid-cols-[1fr_22rem] gap-6">
        <Card title={live ? "Différences avec la version en ligne" : "Nouveau contenu"}>
          <div className="space-y-5">
            {FIELDS.map((f) => {
              const before = String(live?.[f] ?? ""), after = String(v[f] ?? "");
              if (live && before === after) return null;
              return (
                <div key={f}>
                  <p className="text-xs uppercase tracking-wide text-ink-3 mb-1">{LABEL[f]}</p>
                  <pre className="whitespace-pre-wrap text-sm font-sans rounded-lg bg-surface-2 p-3">
                    {diffLines(before, after).map((l, i) => (
                      <span key={i} className={`block ${l.kind === "add" ? "bg-green-100 text-green-900" : l.kind === "del" ? "bg-red-100 text-red-900 line-through" : ""}`}>
                        {l.kind === "add" ? "+ " : l.kind === "del" ? "− " : "  "}{l.text || " "}
                      </span>
                    ))}
                  </pre>
                </div>
              );
            })}
            {live && FIELDS.every((f) => String(live[f] ?? "") === String(v[f] ?? "")) && <p className="text-sm text-ink-3">Aucune différence de texte (seules les sources ou les données ont pu changer).</p>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Décision">
            {tasks && tasks.length > 0 && (
              <div className="mb-3 text-sm rounded-lg bg-amber-50 text-amber-900 p-2">
                {tasks.map((t) => <p key={t.id}>{t.blocking ? "⛔" : "⚠️"} {t.reason}</p>)}
              </div>
            )}
            {me.is("editor") ? (
              <ActionForm action={approveVersion} submit="Approuver et publier">
                <input type="hidden" name="version_id" value={v.id} />
                <Field label="Commentaire (facultatif)"><input name="comment" className={inputCls} /></Field>
              </ActionForm>
            ) : <p className="text-sm text-ink-3">La publication est réservée au rôle Éditeur.</p>}
            <hr className="my-4 border-line" />
            <ActionForm action={rejectVersion} submit="Renvoyer en brouillon" tone="ghost">
              <input type="hidden" name="version_id" value={v.id} />
              <Field label="Motif (obligatoire)"><textarea name="comment" required rows={2} className={inputCls} /></Field>
            </ActionForm>
            {me.is("compliance") && (
              <>
                <hr className="my-4 border-line" />
                <ActionForm action={blockItem} submit="Bloquer (conformité)" tone="danger" confirm="Bloquer ce contenu ? Il sera retiré du site.">
                  <input type="hidden" name="item_id" value={item!.id} />
                  <Field label="Raison du blocage"><input name="reason" className={inputCls} /></Field>
                </ActionForm>
              </>
            )}
          </Card>
          <Card title="Checklist SEO à la soumission"><SeoReport report={report} /></Card>
          <Card title={`Sources (${sources?.length ?? 0})`}>
            <ul className="text-sm space-y-1">
              {(sources ?? []).map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title ?? s.url}</a> <span className="text-ink-3">· {s.accessed_at}</span></li>)}
            </ul>
          </Card>
          <Link href={`/admin/contenus/${item!.id}`} className="text-sm underline">Ouvrir le contenu</Link>
        </div>
      </div>
    </div>
  );
}
