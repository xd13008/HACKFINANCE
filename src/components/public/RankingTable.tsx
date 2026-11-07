import Link from "next/link";
import type { Criterion, RankedSoftware, PricingPlan, Fact } from "@/lib/data";
import { priceLabel, formatDate } from "@/lib/format";
import { ScoreBadge } from "./ScoreBadge";

/** Classement éditorial : ordre calculé par la base à partir des notes, sans aucune donnée commerciale. */
export function RankingTable({ ranking, criteria, pricing, facts, pricingPages }: {
  ranking: RankedSoftware[];
  criteria: Criterion[];
  pricing: Map<string, PricingPlan[]>;
  facts: Map<string, Map<string, Fact>>;
  /** Chemins des pages « prix » publiées : évite tout lien vers une page inexistante. */
  pricingPages?: Set<string>;
}) {
  if (!ranking.length) return <p className="text-ink-3 my-6">Aucun logiciel testé dans cette sélection pour le moment.</p>;
  return (
    <section aria-labelledby="ranking-title" className="my-8">
      <h2 id="ranking-title" className="text-2xl font-bold mb-1">Notre classement</h2>
      <p className="text-sm text-ink-3 mb-4">Ordre déterminé uniquement par la note issue de nos tests. <Link href="/methode" className="underline">Méthode</Link></p>
      <ol className="space-y-4">
        {ranking.map((r) => {
          const plans = pricing.get(r.software.id) ?? [];
          const entry = plans.find((p) => p.billing_period !== "quote") ?? plans[0];
          const free = facts.get(r.software.id)?.get("free_plan")?.value === true;
          return (
            <li key={r.software.id} className="rounded-xl border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-ink-3">#{r.rank}</p>
                  <Link href={`/logiciels/${r.software.slug}`} className="text-xl font-bold hover:text-brand">{r.software.name}</Link>
                  <p className="text-sm text-ink-2">{r.software.tagline}</p>
                </div>
                <ScoreBadge score={r.overall} size="lg" />
              </div>
              <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                <p><span className="text-ink-3">Prix d&apos;entrée : </span>{entry ? priceLabel(entry) : "—"}</p>
                <p><span className="text-ink-3">Offre gratuite : </span>{free ? "Oui" : "Non"}</p>
                <p><span className="text-ink-3">Testé le : </span>{formatDate(r.testedAt)}</p>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-brand">Notes par critère</summary>
                <table className="mt-2 w-full">
                  <tbody>
                    {criteria.map((c) => (
                      <tr key={c.key} className="border-t border-line">
                        <td className="py-1 text-ink-2">{c.label} <span className="text-ink-3">({c.weight} %)</span></td>
                        <td className="py-1 text-right tabular-nums font-medium">{r.criteria[c.key]?.toFixed(1) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <div className="mt-3 flex gap-4 text-sm">
                <Link href={`/logiciels/${r.software.slug}`} className="font-medium text-brand underline">Lire l&apos;avis</Link>
                {pricingPages?.has(`/logiciels/${r.software.slug}/prix`) && (
                  <Link href={`/logiciels/${r.software.slug}/prix`} className="text-ink-2 underline">Voir les prix</Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
