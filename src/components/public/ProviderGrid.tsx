import { axesFor, formatValue, hostOf, NOT_VERIFIED, periodLabel, SOURCE_KIND, type GridAxis, type GridCriterion, type GridFact } from "@/lib/grid";
import { formatDate } from "@/lib/format";

/** Valeur d'un critère : liste à puces pour les références et cas clients, texte sinon ; « Non vérifié » si absent. */
export function GridValue({ c, f, compact }: { c: GridCriterion; f?: GridFact; compact?: boolean }) {
  const v = formatValue(c, f?.value);
  if (!v || !f) return <span className="text-ink-3">{NOT_VERIFIED}</span>;
  const period = periodLabel(c, f.period);
  return (
    <>
      {c.kind === "list" && Array.isArray(f.value)
        ? <ul className={c.code === "cas_clients" ? "list-disc pl-5 space-y-1" : "flex flex-wrap gap-1"}>
            {(f.value as string[]).map((x) => <li key={x} className={c.code === "cas_clients" ? "" : "bg-surface-2 rounded px-2 py-0.5 text-xs"}>{x}</li>)}
          </ul>
        : <>{v}{period && <span className="text-ink-3"> ({period})</span>}</>}
      {compact
        ? <span className="block text-xs text-ink-3 mt-0.5"><a href={f.source_url} rel="nofollow noopener" target="_blank" className="underline">{hostOf(f.source_url)}</a>, {formatDate(f.accessed_on)}</span>
        : <span className="block text-xs text-ink-3 mt-0.5">
        Source : <a href={f.source_url} rel="nofollow noopener" target="_blank" className="underline">{hostOf(f.source_url) ?? SOURCE_KIND[f.source_kind]}</a>
        {" "}({SOURCE_KIND[f.source_kind] ?? f.source_kind}), consultée le {formatDate(f.accessed_on)}
      </span>}
    </>
  );
}

/** Conseil de l'axe (« la question à poser »), avec sa source datée s'il en cite une. */
export function AxisAdvice({ axis }: { axis: GridAxis }) {
  if (!axis.advice) return null;
  return (
    <p className="text-sm text-ink-2 mb-2">
      {axis.advice}
      {axis.source_url && axis.accessed_on && (
        <span className="text-xs text-ink-3"> Source : <a href={axis.source_url} rel="noopener" target="_blank" className="underline">{axis.source_label ?? hostOf(axis.source_url)}</a>, consultée le {formatDate(axis.accessed_on)}.</span>
      )}
    </p>
  );
}

/** Grille de lecture d'une fiche : les axes de choix d'un cabinet, chaque critère avec sa valeur vérifiée ou « Non vérifié ». */
export function ProviderGrid({ axes, criteria, facts, categorySlug, compareHref }: {
  axes: GridAxis[]; criteria: GridCriterion[]; facts: GridFact[]; categorySlug: string; compareHref?: string;
}) {
  const groups = axesFor(axes, criteria, categorySlug);
  if (!groups.length) return null;
  const byCode = new Map(facts.map((f) => [f.criterion, f]));
  const all = groups.flatMap((g) => g.criteria);
  const known = all.filter((c) => formatValue(c, byCode.get(c.code)?.value) !== null).length;
  return (
    <section className="mt-8" aria-labelledby="grille">
      <h2 id="grille" className="text-xl font-bold">Grille de lecture</h2>
      <p className="text-sm text-ink-3 mt-1 mb-4">
        {known ? `${known} critère(s) sur ${all.length} vérifié(s) par la rédaction.` : "Aucun critère encore vérifié par la rédaction."}
        {" "}Sources publiques datées. « {NOT_VERIFIED} » : information absente ou pas encore contrôlée, pas une réponse négative.
      </p>
      <ol className="space-y-6">
        {groups.map(({ axis, criteria: rows }, i) => (
          <li key={axis.code}>
            <h3 className="font-bold text-lg mb-1">{axis.code === "cabinet" ? axis.title : `${i + 1}. ${axis.title}`}</h3>
            <AxisAdvice axis={axis} />
            <table className="w-full text-sm">
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code} className="border-t border-line align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-medium w-2/5">{c.label}<span className="block text-xs font-normal text-ink-3">{c.question}</span></th>
                    <td className="py-2"><GridValue c={c} f={byCode.get(c.code)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ol>
      {compareHref && <p className="mt-4 text-sm"><a href={compareHref} className="underline">Comparer avec d&apos;autres cabinets de la même ville</a></p>}
    </section>
  );
}
