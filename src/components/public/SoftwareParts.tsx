import type { Criterion, PricingPlan, Score, TestRun, Fact } from "@/lib/data";
import { priceLabel, formatDate } from "@/lib/format";
import { CriterionBar, ScoreBadge } from "./ScoreBadge";
import { OutboundLink } from "./OutboundLink";

export function VerdictBox({ test, overall, criteria, scores, tester }: {
  test: TestRun; overall: number; criteria: Criterion[]; scores: Score[]; tester?: string | null;
}) {
  const byKey = new Map(scores.map((s) => [s.criterion_key, s]));
  return (
    <section aria-labelledby="verdict" className="my-6 rounded-xl border border-line p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="verdict" className="text-xl font-bold">Notre verdict</h2>
          <p className="mt-1 text-ink-2">{test.verdict}</p>
          {test.best_for && <p className="mt-2 text-sm"><strong>Idéal pour :</strong> {test.best_for}</p>}
        </div>
        <ScoreBadge score={overall} size="lg" />
      </div>
      <div className="mt-5 space-y-2">
        {criteria.map((c) => {
          const s = byKey.get(c.key);
          return s ? <CriterionBar key={c.key} label={c.label} score={Number(s.score)} weight={c.weight} /> : null;
        })}
      </div>
      <div className="mt-5 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-green-800">Points forts</p>
          <ul className="list-disc pl-5 text-ink-2">{test.pros.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div>
          <p className="font-semibold text-red-800">Points faibles</p>
          <ul className="list-disc pl-5 text-ink-2">{test.cons.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
      <details className="mt-4 text-sm text-ink-2">
        <summary className="cursor-pointer text-brand">Détail du test</summary>
        <p className="mt-2">Testé le {formatDate(test.tested_at)}{test.product_version && `, version ${test.product_version}`}{tester && `, par ${tester}`}.</p>
        <p className="mt-1"><strong>Protocole :</strong> {test.protocol}</p>
        <p className="mt-1">{(test.evidence as unknown[]).length} preuve(s) archivée(s).</p>
        {test.requested_by_vendor && <p className="mt-1 font-medium">Test réalisé à la demande de l&apos;éditeur ; la note suit la méthode publiée.</p>}
        <ul className="mt-2">{criteria.map((c) => byKey.get(c.key) && <li key={c.key}><strong>{c.label} :</strong> {byKey.get(c.key)!.justification}</li>)}</ul>
      </details>
    </section>
  );
}

export function PricingTable({ plans }: { plans: PricingPlan[] }) {
  if (!plans.length) return null;
  return (
    <section aria-labelledby="prix" className="my-6">
      <h2 id="prix" className="text-xl font-bold mb-3">Tarifs vérifiés</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-line">
          <thead className="bg-surface-2"><tr><th className="text-left p-2">Offre</th><th className="text-left p-2">Prix</th><th className="text-left p-2">Conditions</th><th className="text-left p-2">Source</th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-2 font-medium">{p.plan_name}</td>
                <td className="p-2">{priceLabel(p)}</td>
                <td className="p-2 text-ink-2">{p.conditions}</td>
                <td className="p-2"><a href={p.source_url} rel="nofollow noopener" target="_blank" className="underline">relevé le {formatDate(p.source_date)}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const FACT_LABELS: Record<string, string> = {
  free_plan: "Offre gratuite", bank_connections: "Banques connectées", multi_entity: "Multi-entités",
  target_sizes: "Tailles d'entreprise", hosting: "Hébergement des données", min_price_eur: "Prix d'entrée (€ HT/mois)",
};

function factValue(v: unknown) {
  if (v === true) return "Oui";
  if (v === false) return "Non";
  if (Array.isArray(v)) return v.join(", ").toUpperCase();
  return String(v);
}

export function FactsTable({ facts, integrations }: { facts: Map<string, Fact> | undefined; integrations: { name: string; kind: string }[] }) {
  const rows = [...(facts?.values() ?? [])];
  if (!rows.length && !integrations.length) return null;
  return (
    <section aria-labelledby="faits" className="my-6">
      <h2 id="faits" className="text-xl font-bold mb-3">Fiche technique</h2>
      <dl className="grid sm:grid-cols-2 gap-x-6 text-sm">
        {rows.map((f) => (
          <div key={f.id} className="flex justify-between border-b border-line py-2 gap-4">
            <dt className="text-ink-2">{FACT_LABELS[f.fact_type] ?? f.fact_type}</dt>
            <dd className="text-right"><a href={f.source_url} rel="nofollow noopener" target="_blank" title={`Source relevée le ${formatDate(f.collected_at)}`}>{factValue(f.value)}</a></dd>
          </div>
        ))}
        {integrations.length > 0 && (
          <div className="flex justify-between border-b border-line py-2 gap-4 sm:col-span-2">
            <dt className="text-ink-2">Intégrations</dt><dd className="text-right">{integrations.map((i) => i.name).join(", ")}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function VisitCta({ name, website, affiliate, softwareId }: { name: string; website: string | null; affiliate: string | null; softwareId: string }) {
  const href = affiliate ?? website;
  if (!href) return null;
  return (
    <p className="my-6">
      <OutboundLink href={href} kind={affiliate ? "affiliate" : "editorial"} entityId={softwareId}
        className="inline-block rounded-lg bg-brand text-white font-semibold px-5 py-3">
        Visiter le site de {name}
      </OutboundLink>
      {affiliate && <span className="ml-3 text-xs text-amber-800 font-medium">Lien affilié : nous pouvons percevoir une commission, sans effet sur la note.</span>}
    </p>
  );
}
