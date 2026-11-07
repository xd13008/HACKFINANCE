import type { Metadata } from "next";
import { getInventory, listCategories } from "@/lib/data";
import { SimplePage } from "@/components/public/SimplePage";
import { PlacementForm } from "@/components/public/Forms";
import { staticMetadata } from "@/lib/seo";
import { requireSite, type SiteParams } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/publicite/annoncer", `Annoncer sur ${site.name}`, `Demandez une proposition pour apparaître sur ${site.name} : comparatifs, annuaire, guides, newsletter.`, { noindex: true });
}

export default async function AdvertisePage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const [cats, inventory] = await Promise.all([listCategories(site.id), getInventory(site.id)]);
  const types = [...new Set(inventory.map((i) => i.placement_type!))];
  return (
    <SimplePage site={site.key} title={`Annoncer sur ${site.name}`} path="/publicite/annoncer" pageType="form"
      intro="Décrivez votre besoin : nous vous envoyons une proposition avec les disponibilités et l'audience des rubriques visées.">
      <PlacementForm site={site.key} categories={cats.map((c) => ({ id: c.id, name: c.name }))} types={types} />
    </SimplePage>
  );
}
