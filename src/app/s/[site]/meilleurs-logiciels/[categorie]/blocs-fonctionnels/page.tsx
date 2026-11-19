import Link from "next/link";
import type { BlockLevel } from "@/lib/category";
import { CategoryTabPage, tabData, tabMetadata } from "@/components/public/CategoryTabPage";
import { formatDate } from "@/lib/format";

export const revalidate = 300;
type P = Promise<{ site: string; categorie: string }>;
const SYMBOL: Record<BlockLevel, string> = { inclus: "✓", option: "Option", absent: "—" };
const STYLE: Record<BlockLevel, string> = { inclus: "bg-lime-100 text-lime-900", option: "bg-surface-2", absent: "text-ink-3" };
const LABEL: Record<BlockLevel, string> = { inclus: "Inclus dans l'offre d'entrée", option: "Offre supérieure ou option payante", absent: "Absent" };

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return tabMetadata(p.site, p.categorie, "blocs-fonctionnels", (h) => `${h.category.name} : qui fait vraiment quoi`,
    (h) => `${h.blocks.length} fonctions vérifiées pendant les tests de la rédaction, logiciel par logiciel.`, (h) => h.blocks.length > 0 && [...h.blockFacts.values()].some((m) => m.size > 0));
}

/** Maquette, écran 13 : blocs fonctionnels. Chaque case est un fait validé (constat du test, offre, source datée). */
export default async function Blocs({ params }: { params: P }) {
  const p = await params;
  const { site, hub } = await tabData(p.site, p.categorie);
  const tools = hub.tools.slice(0, 6);
  const facts = (sid: string, code: string) => hub.blockFacts.get(sid)?.get(code);
  const verified = hub.blocks.reduce((n, b) => n + tools.filter((t) => facts(t.id, b.code)).length, 0);
  const keyFact = hub.blocks.length
    ? `${hub.blocks.length} fonctions comparées sur ${tools.length} logiciel(s) testé(s) ; ${verified} constat(s) vérifié(s) par la rédaction.`
    : "La grille des fonctions de cette catégorie est en préparation.";
  return (
    <CategoryTabPage site={site} hub={hub} tab="blocs-fonctionnels" title={`${hub.category.name} : qui fait vraiment quoi`} keyFact={keyFact}>
      {hub.blocks.length === 0 || tools.length === 0 ? (
        <p className="m-0 rounded-2xl bg-surface-2 p-5">{hub.blocks.length === 0 ? "La rédaction n'a pas encore défini les fonctions à comparer dans cette catégorie." : "Aucune solution n'a encore terminé son test."}</p>
      ) : (
        <>
          <section>
            <h2 className="m-0 mb-1.5 text-2xl font-extrabold">Vue d&apos;ensemble</h2>
            <p className="m-0 mb-3.5 text-ink-2">Chaque case est vérifiée pendant le test, sur le même cas pour tous. « ? » : pas encore vérifié.</p>
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[640px] border-collapse text-sm text-center">
                <thead><tr className="bg-brand text-white"><th scope="col" className="p-3 text-left">Fonction</th>{tools.map((t) => <th key={t.id} scope="col" className="p-3">{t.name}</th>)}</tr></thead>
                <tbody>
                  {hub.blocks.map((b) => (
                    <tr key={b.code} className="border-t border-line">
                      <th scope="row" className="p-3 text-left"><a href={`#${b.code}`} className="font-bold">{b.label}</a></th>
                      {tools.map((t) => { const f = facts(t.id, b.code); return <td key={t.id} className={`p-3 font-extrabold ${f?.level === "option" ? "text-xs " : ""}${f ? STYLE[f.level] : "text-ink-3"}`} title={f ? LABEL[f.level] : "Non vérifié"}>{f ? SYMBOL[f.level] : "?"}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="m-0 mt-2 text-xs text-ink-3">✓ inclus dans l&apos;offre d&apos;entrée · Option : offre supérieure ou option payante · — absent · ? non vérifié.</p>
          </section>
          {hub.blocks.map((b) => (
            <section key={b.code} id={b.code} className="scroll-mt-20">
              <h2 className="m-0 mb-1.5 text-2xl font-extrabold">{b.label}</h2>
              {b.why && <p className="m-0 mb-4 max-w-3xl text-ink-2 leading-relaxed">{b.why}</p>}
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                {tools.map((t) => {
                  const f = facts(t.id, b.code);
                  return (
                    <li key={t.id} className="grid gap-3.5 items-center rounded-2xl border border-line bg-white px-4 py-3.5 sm:grid-cols-[minmax(140px,200px)_80px_minmax(0,1fr)_minmax(140px,200px)]">
                      <Link href={`/logiciels/${t.slug}`} className="font-extrabold">{t.name}</Link>
                      <span className={`text-center font-extrabold rounded-lg py-1.5 ${f ? STYLE[f.level] : "text-ink-3"}`}>{f ? SYMBOL[f.level] : "?"}</span>
                      <span className="text-sm text-ink-2">{f?.how ?? (f ? LABEL[f.level] : "Non vérifié")}{f && <span className="block text-xs text-ink-3"><a href={f.source_url} rel="nofollow noopener" target="_blank" className="underline">source</a>, relevé le {formatDate(f.collected_at)}</span>}</span>
                      <span className="text-[13px] text-ink-3">{f?.plan ? `Offre : ${f.plan}` : f?.level === "absent" ? "Non proposé" : ""}</span>
                    </li>
                  );
                })}
              </ul>
              {b.advice && <p className="m-0 mt-4 rounded-2xl bg-surface-2 px-4 py-3.5"><strong>Notre conseil :</strong> {b.advice}</p>}
            </section>
          ))}
        </>
      )}
    </CategoryTabPage>
  );
}
