import Link from "next/link";
import { categoryKeyFact } from "@/lib/category";
import { CategoryTabPage, tabData, tabMetadata } from "@/components/public/CategoryTabPage";

export const revalidate = 300;
type P = Promise<{ site: string; categorie: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return tabMetadata(p.site, p.categorie, "matchs", (h) => `Matchs : ${h.category.name} comparés deux à deux`, (h) => categoryKeyFact(h), (h) => h.duels.length > 0);
}

/** Onglet « Matchs » : duels rédigés et validés, puis toute paire de solutions testées dans le comparateur. */
export default async function Matchs({ params }: { params: P }) {
  const p = await params;
  const { site, hub } = await tabData(p.site, p.categorie);
  const pairs = hub.tools.slice(0, 6).flatMap((a, i) => hub.tools.slice(i + 1, 6).map((b) => [a, b] as const)).slice(0, 9);
  return (
    <CategoryTabPage site={site} hub={hub} tab="matchs" title={`Matchs : ${hub.category.name}`} keyFact={categoryKeyFact(hub)}>
      <section>
        <h2 className="m-0 mb-3 text-2xl font-extrabold">Les matchs de la rédaction</h2>
        {hub.duels.length === 0 ? <p className="m-0 text-ink-2">Aucun match rédigé pour l&apos;instant dans cette catégorie.</p> : (
          <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2">{hub.duels.map((d) => <li key={d.path}><Link href={d.path} className="block rounded-2xl bg-brand text-white p-5 font-bold no-underline">{d.h1} →</Link></li>)}</ul>
        )}
      </section>
      {pairs.length > 0 && (
        <section>
          <h2 className="m-0 mb-1 text-2xl font-extrabold">Comparer deux solutions testées</h2>
          <p className="m-0 mb-3 text-ink-2">Notes, faits et prix côte à côte, sans texte rédigé.</p>
          <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.map(([a, b]) => <li key={a.slug + b.slug}><Link href={`/comparer?l=${a.slug}&l=${b.slug}`} className="block rounded-2xl border border-line bg-white p-4 font-semibold no-underline hover:border-ink">{a.name} <span className="text-ink-3">vs</span> {b.name} →</Link></li>)}
          </ul>
        </section>
      )}
      {hub.alternatives.length > 0 && (
        <section>
          <h2 className="m-0 mb-3 text-2xl font-extrabold">Les alternatives</h2>
          <ul className="m-0 pl-5">{hub.alternatives.map((a) => <li key={a.path}><Link href={a.path}>{a.h1}</Link></li>)}</ul>
        </section>
      )}
    </CategoryTabPage>
  );
}
