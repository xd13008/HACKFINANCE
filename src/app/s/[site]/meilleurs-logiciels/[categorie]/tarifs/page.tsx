import Link from "next/link";
import { CategoryTabPage, tabData, tabMetadata } from "@/components/public/CategoryTabPage";
import { TariffSimulator } from "@/components/public/TariffSimulator";
import { formatDate } from "@/lib/format";

export const revalidate = 300;
type P = Promise<{ site: string; categorie: string }>;
const PERIOD: Record<string, string> = { month: "/mois", year: "/an", one_time: " une fois", quote: "", free: "" };

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return tabMetadata(p.site, p.categorie, "tarifs", (h) => `Prix des ${h.category.name.toLowerCase()} : le vrai coût par profil`,
    (h) => `Prix publics relevés et datés pour ${h.tools.length} solution(s) testée(s) ; coût annuel selon votre nombre de sociétés et d'utilisateurs.`, (h) => h.plans.size > 0);
}

/** Maquette, écran 14 : tarifs et coût par profil. Uniquement des prix publics validés, avec source et date. */
export default async function Tarifs({ params }: { params: P }) {
  const p = await params;
  const { site, hub } = await tabData(p.site, p.categorie);
  const entries = hub.tools.map((t) => t.entry).filter((v): v is number => v != null);
  const keyFact = entries.length
    ? `Prix publics relevés pour ${hub.tools.length} solution(s) testée(s) : de ${Math.min(...entries)} à ${Math.max(...entries)} € HT par mois en entrée de gamme.`
    : "Aucun prix public validé pour l'instant dans cette catégorie.";
  const rows = hub.tools.flatMap((t) => (hub.plans.get(t.id) ?? []).map((pl) => ({ t, pl })));
  return (
    <CategoryTabPage site={site} hub={hub} tab="tarifs" title={`Prix des ${hub.category.name.toLowerCase()} : le vrai coût par profil`} keyFact={keyFact}>
      {hub.tools.length > 0 && <TariffSimulator tools={hub.tools.map((t) => ({ slug: t.slug, name: t.name, setup: hub.setupFees.get(t.id) ?? null,
        plans: (hub.plans.get(t.id) ?? []).map((pl) => ({ plan_name: pl.plan_name, price_eur: pl.price_eur, billing_period: pl.billing_period, per_unit: pl.per_unit, conditions: pl.conditions })) }))} />}
      <section>
        <h2 className="m-0 mb-3 text-2xl font-extrabold">Toutes les offres, sourcées et datées</h2>
        {rows.length === 0 ? <p className="m-0 text-ink-2">Aucune offre validée pour l&apos;instant.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead><tr className="bg-brand text-white text-left"><th scope="col" className="p-3">Logiciel</th><th scope="col" className="p-3">Offre</th><th scope="col" className="p-3">Prix public HT</th><th scope="col" className="p-3">Conditions</th><th scope="col" className="p-3">Source</th></tr></thead>
              <tbody>
                {rows.map(({ t, pl }) => (
                  <tr key={pl.id} className="border-t border-line">
                    <th scope="row" className="p-3 text-left"><Link href={`/logiciels/${t.slug}`}>{t.name}</Link></th>
                    <td className="p-3">{pl.plan_name}</td>
                    <td className="p-3 font-extrabold">{pl.billing_period === "quote" || pl.price_eur == null ? "Sur devis" : pl.billing_period === "free" ? "Gratuit" : `${Number(pl.price_eur).toLocaleString("fr-FR")} €${PERIOD[pl.billing_period] ?? ""}`}{pl.per_unit ? ` ${pl.per_unit}` : ""}</td>
                    <td className="p-3 text-ink-2">{pl.conditions ?? "—"}</td>
                    <td className="p-3"><a href={pl.source_url} rel="nofollow noopener" target="_blank" className="underline">page tarifs</a>, {formatDate(pl.source_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {rows.length > 0 && (
        <section>
          <h2 className="m-0 mb-3 text-2xl font-extrabold">Les coûts cachés à vérifier</h2>
          <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Mise en place", "Paramétrage et accompagnement au démarrage : demandez un devis écrit."], ["Prix par société", "La facture grimpe vite au-delà de quelques sociétés avec une tarification par entité."],
              ["Utilisateurs supplémentaires", "Vérifiez le prix d'un utilisateur au-delà de ceux inclus dans le forfait."], ["Engagement", "Un engagement long bloque le changement d'outil : négociez une clause de sortie."]]
              .map(([t, d]) => <li key={t} className="rounded-2xl border border-line bg-white p-4"><strong>{t}</strong><p className="m-0 mt-1.5 text-sm text-ink-2">{d}</p></li>)}
          </ul>
        </section>
      )}
    </CategoryTabPage>
  );
}
