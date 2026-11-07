import type { Metadata } from "next";
import { listCategories } from "@/lib/data";
import { SimplePage } from "@/components/public/SimplePage";
import { ListingForm } from "@/components/public/Forms";
import { staticMetadata } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/referencer-mon-logiciel", `Référencer mon logiciel — ${site.name}`, "Le référencement de base est gratuit et sans contrepartie. Après vérification, votre logiciel apparaît dans l'annuaire avec la mention « référencé, non testé » ; un test complet peut être programmé par la rédaction.".slice(0, 150), { noindex: true });
}

export default async function ListingPage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const cats = await listCategories(site.id, "software");
  return (
    <SimplePage site={site.key} title="Référencer mon logiciel" path="/referencer-mon-logiciel" pageType="form" intro="Le référencement de base est gratuit et sans contrepartie. Après vérification, votre logiciel apparaît dans l'annuaire avec la mention « référencé, non testé » ; un test complet peut être programmé par la rédaction.">
      <ListingForm site={site.key} kind="software" categories={cats.map((c) => ({ id: c.id, name: c.name }))} />
      <p className="text-sm text-ink-3 mt-6">Vous souhaitez plus de visibilité ? Consultez nos <a href="/publicite" className="underline">offres partenaires</a>.</p>
    </SimplePage>
  );
}
