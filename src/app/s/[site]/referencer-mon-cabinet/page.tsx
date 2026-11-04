import type { Metadata } from "next";
import { listCategories } from "@/lib/data";
import { SimplePage } from "@/components/public/SimplePage";
import { ListingForm } from "@/components/public/Forms";
import { absoluteUrl } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return { title: `Référencer mon cabinet — ${site.name}`, description: "Le référencement de base est gratuit. Après vérification (SIREN, site, domaine de l'e-mail), votre fiche est publiée dans l'annuaire, sans classement.".slice(0, 150), alternates: { canonical: absoluteUrl(site, "/referencer-mon-cabinet") } };
}

export default async function ListingPage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const cats = await listCategories(site.id, "provider");
  return (
    <SimplePage site={site.key} title="Référencer mon cabinet" path="/referencer-mon-cabinet" pageType="form" intro="Le référencement de base est gratuit. Après vérification (SIREN, site, domaine de l'e-mail), votre fiche est publiée dans l'annuaire, sans classement.">
      <ListingForm site={site.key} kind="provider" categories={cats.map((c) => ({ id: c.id, name: c.name }))} />
      <p className="text-sm text-ink-3 mt-6">Vous souhaitez plus de visibilité ? Consultez nos <a href="/publicite" className="underline">offres partenaires</a>.</p>
    </SimplePage>
  );
}
