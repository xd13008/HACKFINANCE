import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, Table, inputCls } from "@/components/admin/ui";
import { approveImportedJobs, reviewJob, setJobAutoPublish } from "@/lib/actions/admin";
import { checkJobOffer, contractLabel, FAMILIES, UNIVERSES, universeLabel } from "@/lib/jobs";

/** Offres d'emploi : vérification par l'agent, arbitrage des cas douteux, import France Travail. */
const DONE: Record<string, string> = {
  publiee: "Offre publiée. Le recruteur est prévenu par e-mail.",
  "refusee-rembourser": "Offre refusée et recruteur prévenu. Le paiement est remboursé automatiquement par la tâche de nuit.",
  refusee: "Offre refusée.",
};

export default async function JobsAdmin({ searchParams }: { searchParams: Promise<{ fait?: string }> }) {
  const done = DONE[(await searchParams).fait ?? ""];
  const me = await requireRole("editor", "admin");
  const isAdmin = me.is("admin");
  const { site } = await currentSite();
  const db = await serverClient();
  let pendingQ = db.from("job_offers").select("id,slug,title,company_name,company_siren,city,family,universe_slug,contract,description,apply_url,apply_email,featured,source,created_at")
    .eq("status", "pending_review").order("source", { ascending: false }).order("created_at").limit(300);
  if (site) pendingQ = pendingQ.eq("site_id", site.id);
  const [{ data: pending }, { data: stats }, { data: agent }, { data: lastRun }, { data: settings }, { data: unrefunded }] = await Promise.all([
    pendingQ,
    db.from("job_offers").select("source,status,family,universe_slug,site_id").limit(20000),
    db.from("agent_settings").select("enabled,max_cost_per_month").eq("agent", "verification_offres").maybeSingle(),
    db.from("agent_runs").select("status,output,error,cost_usd,finished_at").eq("agent", "verification_offres").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("job_settings").select("site_id,auto_publish"),
    db.from("job_orders").select("id,job_id,amount_cents,job_offers!inner(title,status)").eq("status", "paid").eq("job_offers.status", "rejected"),
  ]);
  const pendingIds = (pending ?? []).map((j) => j.id);
  const { data: reviews } = pendingIds.length
    ? await db.from("job_reviews").select("job_id,verdict,reasons,confidence,created_at").in("job_id", pendingIds).order("created_at", { ascending: false })
    : { data: [] };
  const lastReview = new Map<string, { verdict: string; reasons: string[]; confidence: number | null }>();
  for (const r of reviews ?? []) if (!lastReview.has(r.job_id)) lastReview.set(r.job_id, r);
  const toArbitrate = (pending ?? []).filter((j) => lastReview.get(j.id)?.verdict === "escalate" || (lastReview.has(j.id) && !(settings ?? []).some((x) => x.auto_publish)));
  const waiting = (pending ?? []).filter((j) => !lastReview.has(j.id));
  const count = (f: (r: { source: string; status: string; family: string; universe_slug: string | null; site_id: string }) => boolean) => (stats ?? []).filter(f).length;
  const siteId = site?.id ?? (stats ?? [])[0]?.site_id;
  const auto = (settings ?? []).find((x) => x.site_id === siteId)?.auto_publish ?? false;
  const run = lastRun?.output as { summary?: string } | null;
  return (
    <div className="space-y-4">
      <PageHeader title="Emplois" intro="Un agent vérifie chaque offre (annonces payantes et France Travail). Les cas douteux vous reviennent ci-dessous. Une annonce payante n'est publiable qu'une fois payée (contrôle de la base)." />
      {done && <p role="status" className="rounded-lg p-3 bg-green-50 text-green-900 text-sm">{done}</p>}
      <div className="grid sm:grid-cols-4 gap-3">
        {[["En attente de l'agent", waiting.length],
          ["À arbitrer", toArbitrate.length],
          ["En attente de paiement", count((r) => r.status === "awaiting_payment")],
          ["En ligne", count((r) => r.status === "published")]].map(([l, n]) => (
          <Card key={l as string}><p className="text-sm text-ink-3">{l}</p><p className="text-2xl font-bold">{(n as number).toLocaleString("fr-FR")}</p></Card>
        ))}
      </div>

      <Card>
        <h2 className="font-bold mb-2">Agent de vérification</h2>
        <ul className="text-sm space-y-1 mb-3">
          <li>Agent : <strong>{agent?.enabled ? "actif" : "désactivé"}</strong>{agent && <> · plafond {Number(agent.max_cost_per_month)} $ par mois</>} · <Link href="/admin/agents" className="underline">réglages</Link></li>
          <li>Publication automatique : <strong>{auto ? "activée" : "désactivée"}</strong> — {auto ? "l'agent publie ce qu'il approuve et refuse ce qui est clairement non conforme (annonce payée remboursée automatiquement)." : "l'agent ne fait que recommander ; rien n'est publié sans vous."}</li>
          <li>Dernier passage : {lastRun ? <>{lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString("fr-FR") : "en cours"} · {lastRun.status === "failed" ? <span className="text-red-800">échec : {lastRun.error}</span> : run?.summary} · {Number(lastRun.cost_usd ?? 0).toFixed(2)} $</> : "aucun"}</li>
        </ul>
        {isAdmin && siteId && (
          <ActionForm action={setJobAutoPublish} submit={auto ? "Désactiver la publication automatique" : "Activer la publication automatique"} tone={auto ? "ghost" : "primary"} className="flex gap-2"
            confirm={auto ? undefined : "L'agent publiera seul les offres qu'il approuve, et refusera (avec remboursement) celles clairement non conformes. Les cas douteux vous resteront. Activer ?"}>
            <input type="hidden" name="site_id" value={siteId} /><input type="hidden" name="on" value={auto ? "0" : "1"} />
          </ActionForm>
        )}
        {(unrefunded ?? []).length > 0 && <p className="text-sm text-red-800 mt-3">{(unrefunded ?? []).length} annonce(s) refusée(s) encore à rembourser : le remboursement automatique a échoué ou Stripe n&apos;est pas configuré.</p>}
      </Card>

      <Card>
        <h2 className="font-bold mb-3">À arbitrer</h2>
        {toArbitrate.length === 0 ? <p className="text-sm text-ink-3">Rien à arbitrer.</p> : toArbitrate.map((j) => {
          const c = j.source === "member" ? checkJobOffer(j) : { errors: [], warnings: [] };
          const r = lastReview.get(j.id);
          return (
            <div key={j.id} className="border-t border-line py-4 space-y-2">
              <p className="font-semibold">{j.title} {j.source === "member" ? <span className="text-xs rounded bg-accent px-2">annonce payée</span> : <span className="text-xs rounded bg-surface-2 px-2">France Travail</span>}</p>
              <p className="text-sm text-ink-2">{j.company_name ?? "—"}{j.company_siren ? ` · SIREN ${j.company_siren}` : ""} · {j.city ?? "—"} · {contractLabel(j.contract)} · {universeLabel(j.universe_slug)} · candidature : {j.apply_url ?? j.apply_email ?? "—"}</p>
              {r && <p className="text-sm"><strong>Agent</strong> ({r.verdict === "escalate" ? "doute" : r.verdict === "approve" ? "recommande de publier" : "recommande de refuser"}{r.confidence != null ? `, confiance ${Math.round(Number(r.confidence) * 100)} %` : ""}) : {r.reasons.join(" ; ")}</p>}
              {(c.errors.length > 0 || c.warnings.length > 0) && <ul className="text-sm text-red-800 list-disc pl-5">{[...c.errors, ...c.warnings].map((e) => <li key={e}>{e}</li>)}</ul>}
              <details className="text-sm"><summary className="cursor-pointer underline">Lire la description</summary><p className="whitespace-pre-line mt-2">{j.description}</p></details>
              <div className="flex flex-wrap gap-6 items-end">
                <ActionForm action={reviewJob} submit="Publier" className="flex gap-2">
                  <input type="hidden" name="job_id" value={j.id} /><input type="hidden" name="decision" value="approve" />
                </ActionForm>
                <ActionForm action={reviewJob} submit="Refuser" tone="danger" className="flex gap-2 items-end">
                  <input type="hidden" name="job_id" value={j.id} /><input type="hidden" name="decision" value="reject" />
                  <label className="text-sm">Motif{j.source === "member" ? " (envoyé au recruteur)" : ""}<input name="reason" defaultValue={r?.verdict === "reject" ? r.reasons.join(" ; ") : ""} className={inputCls} /></label>
                </ActionForm>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">Offres par univers</h2>
        <Table head={["Univers", "En attente", "En ligne"]} empty="Aucune offre.">
          {UNIVERSES.map(([u, l]) => (
            <tr key={u}>
              <td className="py-2 pr-3">{l}</td>
              <td className="pr-3">{count((r) => r.status === "pending_review" && r.universe_slug === u)}</td>
              <td>{count((r) => r.status === "published" && r.universe_slug === u)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <h2 className="font-bold mb-2">Publication manuelle des offres France Travail</h2>
        <p className="text-sm text-ink-2 mb-3">Secours si l&apos;agent est désactivé : publication en masse, par métier, des offres importées encore en attente.</p>
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
