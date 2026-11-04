import Link from "next/link";
import type { Metadata } from "next";
import { getInventory } from "@/lib/data";
import { SimplePage } from "@/components/public/SimplePage";
import { absoluteUrl } from "@/lib/seo";
import { formatEur } from "@/lib/format";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

const TYPE_LABEL: Record<string, string> = {
  category_sponsored: "Position sponsorisée sur un comparatif", enhanced_listing: "Fiche enrichie", guide_banner: "Encart dans les guides",
  newsletter: "Newsletter", simulator_sponsor: "Sponsoring de simulateur", directory_featured: "Mise en avant dans l'annuaire",
};

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return {
    title: `Publicité et partenariats — ${site.name}`,
    description: `Comment ${site.name} se finance : positions sponsorisées signalées, fiches enrichies, affiliation. Séparation stricte avec l'éditorial.`,
    alternates: { canonical: absoluteUrl(site, "/publicite") },
  };
}

export default async function AdvertisingPolicy({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const inventory = await getInventory(site.id);
  return (
    <SimplePage site={site.key} title="Publicité et partenariats" path="/publicite" pageType="page"
      intro={`${site.name} est financé par de la visibilité signalée. Aucun partenaire ne peut modifier une note, un classement ou un verdict.`}>
      <div className="prose-ed">
        <h2>Nos règles</h2>
        <ul>
          <li>Chaque position payante porte la mention « Sponsorisé » (ou « Mis en avant », « Partenaire ») et s&apos;affiche dans un bloc distinct du classement éditorial.</li>
          <li>Le classement éditorial est calculé uniquement à partir des notes de nos tests. Les critères et pondérations sont publiés sur la <Link href="/methode">page méthode</Link>.</li>
          <li>Les liens d&apos;affiliation sont signalés. Ils peuvent nous rapporter une commission, sans effet sur la note.</li>
          <li>Le référencement de base dans l&apos;annuaire est gratuit.</li>
        </ul>
        <h2>Emplacements disponibles</h2>
      </div>
      <table className="w-full text-sm border border-line my-4">
        <thead className="bg-surface-2"><tr><th className="p-2 text-left">Emplacement</th><th className="p-2 text-left">Rubrique</th><th className="p-2 text-left">À partir de</th></tr></thead>
        <tbody>
          {inventory.map((i) => (
            <tr key={i.id} className="border-t border-line">
              <td className="p-2">{TYPE_LABEL[i.placement_type!]}{i.slot && i.slot > 1 ? ` (position ${i.slot})` : ""}</td>
              <td className="p-2 text-ink-2">{i.category_name ?? "Tout le site"}</td>
              <td className="p-2 tabular-nums">{formatEur(Number(i.indicative_price_month))} HT / mois</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-3">Prix indicatifs, établis selon l&apos;audience potentielle de chaque rubrique.</p>
      <p className="mt-6"><Link href="/publicite/annoncer" className="inline-block rounded-lg bg-brand text-white font-semibold px-5 py-3">Demander une proposition</Link></p>
    </SimplePage>
  );
}
