import Link from "next/link";
import { categoryKeyFact } from "@/lib/category";
import { CategoryTabPage, tabData, tabMetadata } from "@/components/public/CategoryTabPage";

export const revalidate = 300;
type P = Promise<{ site: string; categorie: string }>;
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return tabMetadata(p.site, p.categorie, "podium", (h) => `Podium : les 3 meilleurs ${h.category.name.toLowerCase()}`, (h) => categoryKeyFact(h));
}

/** Onglet « Podium » : les trois meilleures notes des tests, avec leur point fort mesuré. */
export default async function Podium({ params }: { params: P }) {
  const p = await params;
  const { site, hub } = await tabData(p.site, p.categorie);
  const label = (k: string) => hub.criteria.find((c) => c.key === k)?.label ?? k;
  const best = (c: Record<string, number>) => Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  const medals = ["Or", "Argent", "Bronze"];
  return (
    <CategoryTabPage site={site} hub={hub} tab="podium" title={`Podium : ${hub.category.name}`} keyFact={categoryKeyFact(hub)}>
      {hub.tools.length === 0 ? <p className="m-0 rounded-2xl bg-surface-2 p-5">Aucune solution n&apos;a encore terminé son test : pas de podium pour l&apos;instant.</p> : (
        <ol className="m-0 p-0 list-none grid gap-4 md:grid-cols-3">
          {hub.tools.slice(0, 3).map((t, i) => {
            const [k, v] = best(t.criteria) ?? [];
            return (
              <li key={t.slug} className={`flex flex-col gap-3 rounded-3xl p-6 ${i === 0 ? "bg-accent" : "bg-white border border-line"}`}>
                <span className="text-xs font-bold uppercase tracking-wider">{i + 1}. {medals[i]}</span>
                <Link href={`/logiciels/${t.slug}`} className="font-display font-extrabold text-3xl no-underline">{t.name}</Link>
                <span className="font-display font-extrabold text-5xl">{fmt(t.score)}<span className="text-xl">/10</span></span>
                {k && <span className="text-sm">Point fort mesuré : <strong>{label(k)}</strong> ({fmt(v!)}/10)</span>}
                <span className="text-sm">{t.entry == null ? "Prix sur devis" : t.entry === 0 ? "Offre gratuite" : `Dès ${t.entry} € HT/mois`}</span>
                <Link href={`/logiciels/${t.slug}`} className="mt-auto inline-flex items-center justify-center min-h-11 rounded-lg bg-ink text-white font-semibold no-underline">Voir le test détaillé</Link>
              </li>
            );
          })}
        </ol>
      )}
      {hub.tools.length > 3 && (
        <section>
          <h2 className="m-0 mb-3 text-2xl font-extrabold">La suite du classement</h2>
          <ol start={4} className="m-0 pl-6 flex flex-col gap-2">{hub.tools.slice(3).map((t) => <li key={t.slug}><Link href={`/logiciels/${t.slug}`} className="font-semibold">{t.name}</Link> · {fmt(t.score)}/10</li>)}</ol>
        </section>
      )}
      <p className="m-0 text-sm text-ink-3">Notes sur 10 issues des tests de la rédaction, sur le même cas pour toutes les solutions. Aucun emplacement payant dans ce classement.</p>
    </CategoryTabPage>
  );
}
