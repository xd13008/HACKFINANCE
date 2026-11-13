import Link from "next/link";
import type { Category, CityFacts as Facts } from "@/lib/data";
import { DEPARTEMENTS, MIN_INDEXABLE } from "@/lib/departements";
import type { Location } from "./LocalDirectory";
import { postalLabel } from "@/lib/postal";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const fr = (n: number) => n.toLocaleString("fr-FR");

/**
 * Encadré « En bref » d'une page ville : uniquement des faits calculés sur les fiches publiées
 * (répartition géographique, département, autres annuaires de la ville). Rend chaque page ville unique
 * sans texte rédigé à valider. Source : registre public des entreprises.
 */
export function CityFacts({ cat, city, citySlug, department, facts, locations, imported }: {
  cat: Category; city: string; citySlug: string; department?: string; facts: Facts | null; locations: Location[]; imported: string | null;
}) {
  if (!facts || facts.total === 0) return null;
  const label = cat.short_name ?? cat.name.toLowerCase();
  const codes = facts.postal_codes.filter((c) => c.code);
  const top = codes.slice(0, 3);
  const inDep = department ? locations.filter((l) => l.department === department && l.city_slug) : [];
  const depTotal = inDep.reduce((n, l) => n + l.providers, 0);
  const neighbours = inDep.filter((l) => l.city_slug !== citySlug && l.providers >= MIN_INDEXABLE).slice(0, 5);
  const others = facts.other_directories.filter((o) => o.n >= MIN_INDEXABLE);
  return (
    <section aria-labelledby="en-bref" className="my-6 rounded-xl border border-line bg-white p-5 max-w-3xl">
      <h2 id="en-bref" className="font-display font-extrabold text-xl mb-3">En bref : {label} à {city}</h2>
      <ul className="space-y-2 text-ink-2 list-disc pl-5">
        {codes.length > 1 && (
          <li>
            Les {fr(facts.total)} fiches publiées se répartissent sur {codes.length} codes postaux.
            {" "}Les plus représentés : {top.map((c, i) => (
              <span key={c.code}>{i ? (i === top.length - 1 ? " et " : ", ") : ""}{postalLabel(c.code)} : {fr(c.n)} ({pct(c.n, facts.total)} %)</span>
            ))}.
          </li>
        )}
        {codes.length === 1 && <li>Toutes les fiches publiées sont situées dans le code postal {postalLabel(codes[0].code)}.</li>}
        {department && depTotal > facts.total && (
          <li>
            {city} regroupe {pct(facts.total, depTotal)} % des {fr(depTotal)} fiches publiées du département
            {DEPARTEMENTS[department] ? ` ${DEPARTEMENTS[department]} (${department})` : ` ${department}`}.
            {neighbours.length > 0 && <> Autres villes : {neighbours.map((n, i) => (
              <span key={n.city_slug}>{i ? ", " : ""}<Link href={`/prestataires/${cat.slug}/${n.city_slug}`} className="underline">{n.city}</Link> ({fr(n.providers)})</span>
            ))}.</>}
          </li>
        )}
        {others.length > 0 && (
          <li>
            Également à {city} : {others.map((o, i) => (
              <span key={o.slug}>{i ? ", " : ""}<Link href={`/prestataires/${o.slug}/${citySlug}`} className="underline">{o.name.toLowerCase()}</Link> ({fr(o.n)})</span>
            ))}.
          </li>
        )}
        <li>
          {facts.verified
            ? `${fr(facts.verified)} fiche(s) vérifiée(s) par la rédaction (SIREN, site, références) ; les autres sont issues du registre public et marquées « non vérifiée ».`
            : "Aucune fiche n'est encore vérifiée par la rédaction : toutes sont issues du registre public des entreprises et marquées « non vérifiée »."}
        </li>
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        Source : registre public des entreprises (<a href="https://annuaire-entreprises.data.gouv.fr" className="underline" rel="noopener">annuaire des entreprises de l&apos;État</a>)
        {imported ? `, fiches mises à jour en ${imported}` : ""}. Chiffres calculés sur les fiches publiées de cet annuaire.
      </p>
    </section>
  );
}
