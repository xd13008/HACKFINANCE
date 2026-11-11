import type { Metadata } from "next";
import Link from "next/link";
import { JobForm } from "@/components/public/JobForm";
import { currentMember } from "@/lib/members";
import { publicClient } from "@/lib/supabase/public";
import { requireSite, type SiteParams } from "../../_lib";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publier une offre d'emploi", robots: { index: false, follow: false } };

export default async function PublishJob({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const [m, { data: products }] = await Promise.all([
    currentMember(site.id),
    publicClient().from("job_products").select("code,label,description,amount_cents").order("sort"),
  ]);
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-3xl font-extrabold">Publier une offre d&apos;emploi</h1>
      <p className="text-ink-2">Votre annonce est vue par des DAF, comptables et contrôleurs de gestion. Elle est relue sous 2 jours ouvrés, puis publiée pour la durée choisie. Paiement par carte, facture envoyée par e-mail.</p>
      {!m ? (
        <div className="rounded-xl border border-line bg-white p-5 space-y-2">
          <p className="font-semibold">Un compte est nécessaire pour publier et suivre vos annonces.</p>
          <p><Link href="/connexion" className="underline">Me connecter</Link> · <Link href="/inscription" className="underline">Créer un compte gratuit</Link></p>
        </div>
      ) : <JobForm site={site.key} products={products ?? []} />}
    </div>
  );
}
