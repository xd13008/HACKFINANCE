import { criteriaFor, formatValue, hostOf, NOT_VERIFIED, SOURCE_KIND, type GridCriterion, type GridFact } from "@/lib/grid";
import { formatDate } from "@/lib/format";

/** Grille de lecture d'une fiche : chaque critère utile au DAF, sa valeur vérifiée ou « Non vérifié », sa source datée. */
export function ProviderGrid({ criteria, facts, categorySlug, compareHref }: {
  criteria: GridCriterion[]; facts: GridFact[]; categorySlug: string; compareHref?: string;
}) {
  const rows = criteriaFor(criteria, categorySlug);
  if (!rows.length) return null;
  const byCode = new Map(facts.map((f) => [f.criterion, f]));
  const known = rows.filter((c) => formatValue(c, byCode.get(c.code)?.value) !== null).length;
  return (
    <section className="mt-8" aria-labelledby="grille">
      <h2 id="grille" className="text-xl font-bold">Grille de lecture</h2>
      <p className="text-sm text-ink-3 mt-1 mb-3">
        {known ? `${known} critère(s) sur ${rows.length} vérifié(s) par la rédaction.` : "Aucun critère encore vérifié par la rédaction."}
        {" "}Les informations viennent de sources publiques datées. « {NOT_VERIFIED} » : information absente ou pas encore contrôlée.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((c) => {
              const f = byCode.get(c.code);
              const v = formatValue(c, f?.value);
              return (
                <tr key={c.code} className="border-t border-line align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-medium w-2/5">{c.label}<span className="block text-xs font-normal text-ink-3">{c.question}</span></th>
                  <td className="py-2">
                    {v ?? <span className="text-ink-3">{NOT_VERIFIED}</span>}
                    {f && v && (
                      <span className="block text-xs text-ink-3">
                        Source : <a href={f.source_url} rel="nofollow noopener" target="_blank" className="underline">{hostOf(f.source_url) ?? SOURCE_KIND[f.source_kind]}</a>
                        {" "}({SOURCE_KIND[f.source_kind] ?? f.source_kind}), consultée le {formatDate(f.accessed_on)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {compareHref && <p className="mt-3 text-sm"><a href={compareHref} className="underline">Comparer avec d&apos;autres cabinets de la même ville</a></p>}
    </section>
  );
}
