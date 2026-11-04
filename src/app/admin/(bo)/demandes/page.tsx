import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { decideListingRequest, updateErrorReport } from "@/lib/actions/admin";

function Check({ label, value }: { label: string; value: boolean | null | undefined }) {
  return <span className="text-xs mr-3">{value == null ? "◻️" : value ? "✅" : "⚠️"} {label}</span>;
}

export default async function Requests() {
  await requireRole("editor", "compliance", "admin");
  const { site } = await currentSite();
  const db = await serverClient();
  let lq = db.from("listing_requests").select("*, categories(name), sites(name)").order("created_at", { ascending: false }).limit(100);
  let eq = db.from("error_reports").select("*, sites(name)").order("created_at", { ascending: false }).limit(100);
  if (site) { lq = lq.eq("site_id", site.id); eq = eq.eq("site_id", site.id); }
  const [{ data: listings }, { data: reports }] = await Promise.all([lq, eq]);
  const open = (listings ?? []).filter((l) => ["new", "checking"].includes(l.status));
  const closed = (listings ?? []).filter((l) => !["new", "checking"].includes(l.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Demandes et signalements" intro="Demandes de référencement (gratuit) dans l'annuaire, signalements d'erreur et droits de réponse. Délai affiché au public : 10 jours ouvrés." />
      <Card title={`Demandes de référencement à traiter (${open.length})`}>
        <div className="space-y-4">
          {open.length === 0 && <p className="text-sm text-ink-3">Aucune demande en attente.</p>}
          {open.map((r) => {
            const c = (r.checks ?? {}) as { siren_format?: boolean | null; email_domain_match?: boolean; free_mail?: boolean };
            return (
              <div key={r.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.product_name ?? r.company_name} <Badge>{r.kind === "software" ? "Logiciel" : "Cabinet"}</Badge></p>
                    <p className="text-sm text-ink-2">{r.company_name} · <a href={r.website} target="_blank" rel="noopener noreferrer" className="underline">{r.website}</a> · {(r.categories as unknown as { name: string } | null)?.name ?? "catégorie ?"} · {(r.sites as unknown as { name: string }).name}</p>
                    <p className="text-sm">{r.contact_name} ({r.contact_role ?? "—"}) · {r.contact_email}</p>
                    {r.message && <p className="text-sm text-ink-2 mt-1">« {r.message} »</p>}
                    <div className="mt-2"><Check label="SIREN valide" value={c.siren_format} /><Check label="E-mail sur le domaine du site" value={c.email_domain_match} /><Check label="Pas de messagerie grand public" value={c.free_mail === undefined ? null : !c.free_mail} /></div>
                  </div>
                  <p className="text-xs text-ink-3">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <ActionForm action={decideListingRequest} submit="Accepter et créer la fiche (brouillon)">
                    <input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="decision" value="accept" />
                    <Field label="Slug de la fiche"><input name="slug" placeholder="auto" className={inputCls} /></Field>
                  </ActionForm>
                  <ActionForm action={decideListingRequest} submit="Refuser" tone="ghost">
                    <input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="decision" value="reject" />
                    <Field label="Motif (communiqué au demandeur)"><input name="comment" className={inputCls} /></Field>
                  </ActionForm>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Signalements et droits de réponse">
        <div className="space-y-3">
          {(reports ?? []).length === 0 && <p className="text-sm text-ink-3">Aucun signalement.</p>}
          {(reports ?? []).map((r) => {
            const late = new Date(r.due_at).getTime() < Date.now() && ["new", "in_review"].includes(r.status);
            return (
              <div key={r.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{r.kind === "right_of_reply" ? "Droit de réponse" : "Erreur"} · {r.page_path} <StatusBadge status={r.status} /> {late && <Badge tone="bad">délai dépassé</Badge>}</p>
                  <p className="text-xs text-ink-3">Échéance {new Date(r.due_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <p className="text-sm text-ink-2 mt-1">{r.reporter_name ?? ""} &lt;{r.reporter_email}&gt; : « {r.message} »</p>
                <ActionForm action={updateErrorReport} submit="Mettre à jour" className="mt-2 grid sm:grid-cols-[10rem_1fr_auto] gap-2 items-end">
                  <input type="hidden" name="report_id" value={r.id} />
                  <Field label="Statut"><select name="status" defaultValue={r.status} className={inputCls}><option value="new">Nouveau</option><option value="in_review">En revue</option><option value="corrected">Corrigé</option><option value="answered">Répondu</option><option value="dismissed">Classé</option></select></Field>
                  <Field label="Réponse"><input name="response" defaultValue={r.response ?? ""} className={inputCls} /></Field>
                </ActionForm>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Historique des demandes de référencement">
        <ul className="text-sm divide-y divide-line">
          {closed.map((r) => <li key={r.id} className="py-1.5 flex justify-between"><span>{r.product_name ?? r.company_name}</span><StatusBadge status={r.status} /></li>)}
        </ul>
      </Card>
    </div>
  );
}
