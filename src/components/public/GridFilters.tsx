import Link from "next/link";
import type { Filters, GridCriterion } from "@/lib/grid";

type Group = { criterion: GridCriterion; values: { code: string; label: string; n: number }[] };

/** Filtres d'une page locale (formulaire GET, sans JavaScript) : seules les valeurs vérifiées sur la page sont proposées. */
export function GridFilters({ groups, active, path, total }: { groups: Group[]; active: Filters; path: string; total: number }) {
  if (!groups.length) return null;
  const on = Object.keys(active).length > 0;
  return (
    <form method="get" action={path} className="my-6 rounded-xl border border-line bg-white p-4" aria-labelledby="filtres">
      <h2 id="filtres" className="font-display font-extrabold text-xl">Trouver le cabinet adapté</h2>
      <p className="text-sm text-ink-3 mb-3">Filtres sur les informations vérifiées par la rédaction. Un cabinet dont l&apos;information n&apos;est pas encore vérifiée n&apos;apparaît pas dans un résultat filtré.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {groups.map((g) => {
          const n = active[g.criterion.code]?.length ?? 0;
          return (
            <details key={g.criterion.code} open={n > 0} className="text-sm rounded-lg border border-line px-3 py-2">
              <summary className="cursor-pointer font-semibold">{g.criterion.label}{n > 0 && <span className="text-brand"> · {n}</span>}</summary>
              <fieldset className="mt-2">
                <legend className="sr-only">{g.criterion.question}</legend>
                <ul className="space-y-1">
                  {g.values.map((v) => (
                    <li key={v.code}>
                      <label className="inline-flex gap-2 items-center">
                        <input type="checkbox" name={g.criterion.code} value={v.code} defaultChecked={active[g.criterion.code]?.includes(v.code)} />
                        {v.label} <span className="text-ink-3">· {v.n}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </details>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 items-center mt-4">
        <button className="rounded-lg bg-brand text-white font-semibold px-4 py-2 text-sm">Filtrer</button>
        {on && <><span className="text-sm">{total.toLocaleString("fr-FR")} résultat(s)</span><Link href={path} className="text-sm underline">Effacer les filtres</Link></>}
      </div>
    </form>
  );
}
