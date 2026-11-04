import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Card, Field, PageHeader, StatusBadge, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveTestRun, uploadEvidence, validateTestRun } from "@/lib/actions/admin";
import type { Criterion } from "@/lib/data";

export default async function TestRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("editor");
  const { id } = await params;
  const db = await serverClient();
  const { data: t } = await db.from("test_runs").select("*, software(name), categories(name,criteria)").eq("id", id).maybeSingle();
  if (!t) notFound();
  const { data: scores } = await db.from("scores").select("*").eq("test_run_id", id);
  const cat = t.categories as unknown as { name: string; criteria: Criterion[] };
  const byKey = new Map((scores ?? []).map((s) => [s.criterion_key, s]));
  const frozen = t.status === "validated" || t.status === "withdrawn";
  const evidence = (t.evidence as { label: string; path: string }[]).map((e) => `${e.label} | ${e.path}`).join("\n");
  const evidenceList = t.evidence as { label: string; path: string }[];
  const signed = await Promise.all(evidenceList.map(async (e) => {
    const { data } = await db.storage.from("evidence").createSignedUrl(e.path, 600);
    return { ...e, url: data?.signedUrl ?? null };
  }));
  const weighted = cat.criteria.reduce((a, c) => a + Number(byKey.get(c.key)?.score ?? 0) * c.weight, 0) / 100;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={`Test — ${(t.software as unknown as { name: string }).name}`} intro={`${cat.name} · ${t.tested_at}`} actions={<StatusBadge status={t.status} />} />
      <Card title={frozen ? "Test figé (validé)" : "Saisie du test"}>
        <ActionForm action={saveTestRun} submit={frozen ? "Figé" : "Enregistrer"}>
          <fieldset disabled={frozen} className="space-y-3">
            <input type="hidden" name="test_run_id" value={t.id} />
            <Field label="Protocole suivi"><textarea name="protocol" rows={2} defaultValue={t.protocol} className={inputCls} /></Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes par critère (0 à 10) — note pondérée actuelle : <strong>{weighted.toFixed(1)}</strong></p>
              {cat.criteria.map((c) => (
                <div key={c.key} className="grid grid-cols-[12rem_5rem_1fr] gap-2 items-center">
                  <span className="text-sm">{c.label} <span className="text-ink-3">({c.weight} %)</span></span>
                  <input name={`score_${c.key}`} type="number" min={0} max={10} step={0.5} defaultValue={byKey.get(c.key)?.score ?? ""} className={inputCls} />
                  <input name={`just_${c.key}`} placeholder="Justification" defaultValue={byKey.get(c.key)?.justification ?? ""} className={inputCls} />
                </div>
              ))}
            </div>
            <Field label="Verdict"><textarea name="verdict" rows={2} defaultValue={t.verdict ?? ""} className={inputCls} /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Points forts (un par ligne)"><textarea name="pros" rows={3} defaultValue={t.pros.join("\n")} className={inputCls} /></Field>
              <Field label="Points faibles (un par ligne)"><textarea name="cons" rows={3} defaultValue={t.cons.join("\n")} className={inputCls} /></Field>
            </div>
            <Field label="Idéal pour"><input name="best_for" defaultValue={t.best_for ?? ""} className={inputCls} /></Field>
            <Field label="Preuves (« libellé | chemin Storage » par ligne)" hint="Au moins une preuve est requise pour valider."><textarea name="evidence" rows={3} defaultValue={evidence} className={`${inputCls} font-mono text-xs`} /></Field>
            <label className="text-sm flex gap-2"><input type="checkbox" name="completed" defaultChecked={t.status === "completed"} /> Test terminé (prêt pour validation)</label>
          </fieldset>
        </ActionForm>
      </Card>
      <Card title={`Preuves (${signed.length})`}>
        <ul className="text-sm space-y-1 mb-3">
          {signed.map((e) => <li key={e.path}>{e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.label}</a> : <span>{e.label} <span className="text-ink-3">(fichier absent du stockage)</span></span>} <span className="text-xs text-ink-3 font-mono">{e.path}</span></li>)}
        </ul>
        {!frozen && (
          <ActionForm action={uploadEvidence} submit="Ajouter la preuve" className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <input type="hidden" name="test_run_id" value={t.id} />
            <Field label="Fichier (image, PDF, vidéo ≤ 10 Mo)"><input type="file" name="file" required accept="image/*,application/pdf,video/mp4" className={inputCls} /></Field>
            <Field label="Libellé"><input name="label" className={inputCls} placeholder="Capture de l'import bancaire" /></Field>
          </ActionForm>
        )}
        <p className="text-xs text-ink-3 mt-2">Stockage privé : liens signés valables 10 minutes, visibles des seuls éditeurs et de la conformité.</p>
      </Card>
      {t.status === "completed" && (
        <Card title="Validation">
          <p className="text-sm text-ink-2 mb-3">Valider publie les notes, remplace l&apos;éventuel test précédent et met à jour le classement éditorial.</p>
          <ActionForm action={validateTestRun} submit="Valider le test et publier les notes" confirm="Valider ce test ? Il sera figé.">
            <input type="hidden" name="test_run_id" value={t.id} />
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
