import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, Table, inputCls } from "@/components/admin/ui";
import { approveImportedJobs, reviewJob } from "@/lib/actions/admin";
import { checkJobOffer, contractLabel, FAMILIES, familyLabel } from "@/lib/jobs";

/** Relecture des offres d'emploi : annonces payées (une par une) et import France Travail (en masse par métier). */
const DONE: Record<string, string> = {
  publiee: "Offre publiée. Le recruteur est prévenu par e-mail.",
  "refusee-rembourser": "Offre refusée et recruteur prévenu. Remboursez le paiement depuis le tableau de bord Stripe.",
  refusee: "Offre refusée.",
};

export default async function JobsAdmin({ searchParams }: { searchParams: Promise<{ fait?: string }> }) {
  const done = DONE[(await searchParams).fait ?? ""];
  await requireRole("editor", "admin");
  const { site } = await currentSite();
  const db = await serverClient();
  let pendingQ = db.from("job_offers").select("id,slug,title,company_name,company_siren,city,family,contract,description,apply_url,apply_email,featured,created_at")
    .eq("source", "member").eq("status", "pending_review").order("created_at");
  if (site) pendingQ = pendingQ.eq("site_id", site.id);
  const [{ data: pending }, { data: stats }] = await Promise.all([
    pendingQ,
    db.from("job_offers").select("source,status,family,site_id").limit(20000),
  ]);
  const count = (f: (r: { source: string; status: string; family: string; site_id: string }) => boolean) => (stats ?? []).filter(f).length;
  const siteId = site?.id ?? (stats ?? [])[0]?.site_id;
  return (
    <div className="space-y-4">
      <PageHeader title="Emplois" intro="Une offre n'est en ligne qu'après votre relecture. Les annonces payantes ne sont publiables qu'une fois payées (contrôle de la base)." />
      {done && <p role="status" className="rounded-lg p-3 bg-green-50 text-green-900 text-sm">{done}</p>}
      <div className="grid sm:grid-cols-4 gap-3">
        {[["Annonces payées à relire", count((r) => r.source === "member" && r.status === "pending_review")],
          ["En attente de paiement", count((r) => r.status === "awaiting_payment")],
          ["France Travail à relire", count((r) => r.source === "france_travail" && r.status === "pending_review")],
          ["En ligne", count((r) => r.status === "published")]].map(([l, n]) => (
          <Card key={l as string}><p className="text-sm text-ink-3">{l}</p><p className="text-2xl font-bold">{(n as number).toLocaleString("fr-FR")}</p></Card>
        ))}
      </div>

      <Card>
        <h2 className="font-bold mb-3">Annonces payantes à relire</h2>
        {(pending ?? []).length === 0 ? <p className="text-sm text-ink-3">Aucune annonce en attente.</p> : (pending ?? []).map((j) => {
          const c = checkJobOffer(j);
          return (
            <div key={j.id} className="border-t border-line py-4 space-y-2">
              <p className="font-semibold">{j.title} {j.featured && <span className="text-xs rounded bg-accent px-2">mise en avant</span>}</p>
              <p className="text-sm text-ink-2">{j.company_name} · SIREN {j.company_siren} · {j.city} · {contractLabel(j.contract)} · {familyLabel(j.family)} · candidature : {j.apply_url ?? j.apply_email}</p>
              {(c.errors.length > 0 || c.warnings.length > 0) && <ul className="text-sm text-red-800 list-disc pl-5">{[...c.errors, ...c.warnings].map((e) => <li key={e}>{e}</li>)}</ul>}
              <details className="text-sm"><summary className="cursor-pointer underline">Lire la description</summary><p className="whitespace-pre-line mt-2">{j.description}</p></details>
              <div className="flex flex-wrap gap-6 items-end">
                <ActionForm action={reviewJob} submit="Publier" className="flex gap-2">
                  <input type="hidden" name="job_id" value={j.id} /><input type="hidden" name="decision" value="approve" />
                </ActionForm>
                <ActionForm action={reviewJob} submit="Refuser" tone="danger" className="flex gap-2 items-end">
                  <input type="hidden" name="job_id" value={j.id} /><input type="hidden" name="decision" value="reject" />
                  <label className="text-sm">Motif (envoyé au recruteur)<input name="reason" className={inputCls} /></label>
                </ActionForm>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">Offres France Travail</h2>
        <p className="text-sm text-ink-2 mb-3">Importées chaque jour, filtrées sur les métiers de la finance. Publiez-les par métier après un coup d&apos;œil à la liste.</p>
        <Table head={["Métier", "À relire", "En ligne"]} empty="Aucune offre importée.">
          {FAMILIES.map(([f, l]) => (
            <tr key={f}>
              <td className="py-2 pr-3">{l}</td>
              <td className="pr-3">{count((r) => r.source === "france_travail" && r.status === "pending_review" && r.family === f)}</td>
              <td>{count((r) => r.source === "france_travail" && r.status === "published" && r.family === f)}</td>
            </tr>
          ))}
        </Table>
        {siteId && (
          <ActionForm action={approveImportedJobs} submit="Publier les offres à relire" className="flex flex-wrap gap-2 items-end mt-4"
            confirm="Publier les offres France Travail à relire pour ce métier ?">
            <input type="hidden" name="site_id" value={siteId} />
            <label className="text-sm">Métier
              <select name="family" className={inputCls}>
                <option value="">Tous les métiers</option>
                {FAMILIES.map(([f, l]) => <option key={f} value={f}>{l} ({count((r) => r.source === "france_travail" && r.status === "pending_review" && r.family === f)})</option>)}
              </select></label>
          </ActionForm>
        )}
        <p className="text-xs text-ink-3 mt-2"><Link href="/emplois" className="underline">Voir la page publique</Link></p>
      </Card>
    </div>
  );
}
