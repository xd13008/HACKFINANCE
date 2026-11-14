import Link from "next/link";
import type { ProviderPublic } from "@/lib/data";
import { criteriaFor, formatValue, MAX_COMPARE, type GridCriterion, type GridFact } from "@/lib/grid";

/** Critères mis en avant sur la carte d'un cabinet (s'ils sont vérifiés). */
const HIGHLIGHTS = ["clients", "logiciels", "facturation_electronique", "effectif"];

export function ProviderList({ providers, categorySlug, grid, compare }: {
  providers: ProviderPublic[]; categorySlug: string;
  grid?: { criteria: GridCriterion[]; facts: GridFact[] }; compare?: boolean;
}) {
  if (!providers.length) return <p className="text-ink-3 my-6">Aucun professionnel ne correspond pour le moment.</p>;
  const crit = grid ? criteriaFor(grid.criteria, categorySlug).filter((c) => HIGHLIGHTS.includes(c.code)) : [];
  const list = (
    <ul className="grid gap-4 sm:grid-cols-2">
      {providers.map((pr) => {
        const facts = grid?.facts.filter((f) => f.provider_id === pr.id) ?? [];
        const shown = crit.map((c) => ({ c, v: formatValue(c, facts.find((f) => f.criterion === c.code)?.value) })).filter((x) => x.v);
        return (
          <li key={pr.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex justify-between gap-3">
              <Link href={`/prestataires/${categorySlug}/${pr.slug}`} className="font-bold hover:text-brand">{pr.name}</Link>
              {compare && (
                <label className="text-xs inline-flex gap-1 items-center shrink-0">
                  <input type="checkbox" name="c" value={pr.slug!} /> Comparer
                </label>
              )}
            </div>
            <p className="text-sm text-ink-2">{[pr.postal_code, pr.city].filter(Boolean).join(" ")}{pr.region && ` · ${pr.region}`}{pr.deal_size_range && ` · opérations ${pr.deal_size_range}`}</p>
            <p className="text-xs mt-1">{pr.verification_status === "verified" ? "✅ Fiche vérifiée" : "Fiche non vérifiée"}</p>
            {shown.length > 0 && (
              <dl className="mt-2 text-xs space-y-0.5">
                {shown.map(({ c, v }) => <div key={c.code}><dt className="inline text-ink-3">{c.label} : </dt><dd className="inline">{v}</dd></div>)}
              </dl>
            )}
            {pr.specialties && pr.specialties.length > 0 && (
              <ul className="flex flex-wrap gap-1 mt-2">{pr.specialties.map((s) => <li key={s} className="text-xs bg-surface-2 rounded px-2 py-0.5">{s}</li>)}</ul>
            )}
          </li>
        );
      })}
    </ul>
  );
  return (
    <section className="my-6" aria-labelledby="annuaire">
      <h2 id="annuaire" className="font-display font-extrabold text-2xl mb-1">Annuaire</h2>
      <p className="text-sm text-ink-3 mb-4">Ordre alphabétique. Cet annuaire n&apos;est pas un classement.</p>
      {compare ? (
        <form method="get" action={`/prestataires/${categorySlug}/comparer`}>
          {list}
          <div className="sticky bottom-0 mt-4 bg-white/95 border-t border-line py-3 flex flex-wrap gap-3 items-center">
            <button className="rounded-lg bg-brand text-white font-semibold px-4 py-2 text-sm">Comparer la sélection</button>
            <span className="text-xs text-ink-3">Cochez de 2 à {MAX_COMPARE} cabinets.</span>
          </div>
        </form>
      ) : list}
    </section>
  );
}
