import { agentCredentials } from "@/lib/agents/runner";
import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { launchAgent, updateAgentSettings } from "@/lib/actions/admin";

export const maxDuration = 300;

const LABEL: Record<string, { name: string; role: string }> = {
  veille: { name: "Veille", role: "Relit les pages de prix et de fonctionnalités des éditeurs, propose des faits en brouillon et une alerte." },
  redaction: { name: "Rédaction", role: "Rédige un brouillon à partir d'un brief SEO et des données validées ; soumet seulement si la checklist SEO passe." },
  controle_qualite: { name: "Contrôle qualité", role: "Relit une version : sources manquantes, contradictions, conseils interdits. Un point bloquant empêche l'approbation." },
  verification_offres: { name: "Vérification des offres d'emploi", role: "Vérifie chaque nuit les annonces payées et les offres France Travail : univers finance, Code du travail, arnaques. Publie seulement si la publication automatique est activée dans Emplois ; le doute vous revient." },
};

export default async function AgentsPage() {
  const me = await requireRole("editor", "admin");
  const db = await serverClient();
  const [{ data: settings }, { data: runs }, { data: sw }, { data: briefs }, { data: submitted }, ...costs] = await Promise.all([
    db.from("agent_settings").select("*").order("agent"),
    db.from("agent_runs").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("software").select("id,name,is_fictional").eq("status", "published").order("name"),
    db.from("seo_briefs").select("content_item_id,primary_keyword,content_items(title,path,status)"),
    db.from("content_versions").select("id,version_no,content_items!content_versions_content_item_id_fkey(title,path)").eq("status", "submitted"),
    ...["veille", "redaction", "controle_qualite", "verification_offres"].map((a) => db.rpc("agent_month_cost", { p_agent: a })),
  ]);
  const monthCost: Record<string, number> = { veille: Number(costs[0].data ?? 0), redaction: Number(costs[1].data ?? 0), controle_qualite: Number(costs[2].data ?? 0), verification_offres: Number(costs[3].data ?? 0) };
  const hasKey = !!process.env.ANTHROPIC_API_KEY && !!agentCredentials().password;

  return (
    <div className="space-y-6">
      <PageHeader title="Pilotage des agents"
        intro="Les agents préparent le travail et écrivent uniquement en brouillon, avec le compte « agent » soumis à la RLS. Ils n'ont aucun outil : ni navigation libre, ni envoi de message, ni paiement. Un humain reste responsable de chaque publication." />
      {!hasKey && <p className="rounded-lg bg-amber-50 text-amber-900 p-3 text-sm">Il manque la clé Claude : ajoutez ANTHROPIC_API_KEY dans Vercel (Settings, Environment Variables), puis redéployez. Le compte agent est créé automatiquement.</p>}

      <div className="grid xl:grid-cols-3 gap-4">
        {(settings ?? []).map((s) => (
          <Card key={s.agent} title={LABEL[s.agent]?.name ?? s.agent} actions={s.enabled ? <Badge tone="good">Actif</Badge> : <Badge>Désactivé</Badge>}>
            <p className="text-sm text-ink-2 mb-3">{LABEL[s.agent]?.role}</p>
            <p className="text-sm mb-3">Dépense du mois : <strong>{monthCost[s.agent]?.toFixed(2)} $</strong> / {s.max_cost_per_month} $</p>
            {me.is("admin") ? (
              <ActionForm action={updateAgentSettings} submit="Enregistrer">
                <input type="hidden" name="agent" value={s.agent} />
                <label className="text-sm flex gap-2"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Activé</label>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Plafond / exécution ($)"><input name="max_cost_per_run" type="number" step="0.05" defaultValue={s.max_cost_per_run} className={inputCls} /></Field>
                  <Field label="Plafond / mois ($)"><input name="max_cost_per_month" type="number" step="1" defaultValue={s.max_cost_per_month} className={inputCls} /></Field>
                </div>
                {s.agent === "veille" && (
                  <Field label="Domaines autorisés" hint="Vide = uniquement le domaine du site de chaque éditeur.">
                    <input name="allowed_domains" defaultValue={(s.allowed_domains ?? []).join(", ")} className={inputCls} />
                  </Field>
                )}
              </ActionForm>
            ) : <p className="text-xs text-ink-3">Réglages modifiables par l&apos;administrateur.</p>}
          </Card>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Card title="Lancer la veille">
          <ActionForm action={launchAgent} submit="Lancer">
            <input type="hidden" name="agent" value="veille" />
            <Field label="Logiciel"><select name="target_id" className={inputCls}>{(sw ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_fictional ? " (fictif)" : ""}</option>)}</select></Field>
          </ActionForm>
        </Card>
        <Card title="Rédiger un brouillon">
          <ActionForm action={launchAgent} submit="Rédiger">
            <input type="hidden" name="agent" value="redaction" />
            <Field label="Contenu avec brief SEO"><select name="target_id" className={inputCls}>
              {(briefs ?? []).map((b) => { const it = b.content_items as unknown as { title: string; path: string; status: string }; return <option key={b.content_item_id} value={b.content_item_id}>{it.path} — {b.primary_keyword}</option>; })}
            </select></Field>
          </ActionForm>
        </Card>
        <Card title="Contrôle qualité">
          <ActionForm action={launchAgent} submit="Contrôler">
            <input type="hidden" name="agent" value="controle_qualite" />
            <Field label="Version soumise"><select name="target_id" className={inputCls}>
              {(submitted ?? []).map((v) => { const it = v.content_items as unknown as { title: string; path: string }; return <option key={v.id} value={v.id}>{it.path} (v{v.version_no})</option>; })}
            </select></Field>
          </ActionForm>
        </Card>
      </div>

      <Card title="Dernières exécutions">
        <Table head={["Date", "Agent", "Résultat", "Coût", "Durée", "Statut"]} empty="Aucune exécution.">
          {(runs ?? []).map((r) => {
            const out = (r.output ?? {}) as { summary?: string };
            return (
              <tr key={r.id}>
                <td className="py-1.5 pr-2 text-xs text-ink-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                <td className="pr-2">{LABEL[r.agent]?.name ?? r.agent}</td>
                <td className="pr-2 text-sm">{r.error ? <span className="text-red-700">{r.error}</span> : out.summary}</td>
                <td className="pr-2 tabular-nums">{Number(r.cost_usd).toFixed(3)} $</td>
                <td className="pr-2 tabular-nums text-ink-3">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)} s` : "—"}</td>
                <td><StatusBadge status={r.status === "succeeded" ? "done" : r.status === "failed" ? "rejected" : r.status} /></td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <p className="text-xs text-ink-3">Exécution planifiée : <code>/api/cron/agents</code> (hebdomadaire). Les alertes de veille et les rapports de contrôle apparaissent dans <Link href="/admin/demandes" className="underline">Demandes</Link> et dans la <Link href="/admin/validation" className="underline">file de validation</Link>.</p>
    </div>
  );
}
