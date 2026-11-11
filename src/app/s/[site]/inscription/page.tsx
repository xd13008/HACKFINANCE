import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/public/SimplePage";
import { SignupForm } from "@/components/public/MemberForms";
import { staticMetadata } from "@/lib/seo";
import { SIZES } from "@/lib/members";
import { signupConsent } from "@/lib/member-text";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/inscription", `Créer mon compte — ${site.name}`,
    "Un compte gratuit pour retrouver vos recherches, déclarer vos outils et recevoir des sélections adaptées à votre entreprise.", { noindex: true });
}

export default async function SignupPage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  return (
    <SimplePage site={site.key} title="Créer mon compte" path="/inscription" pageType="form"
      intro="Gratuit. Retrouvez vos recherches, déclarez vos outils et vos projets, et recevez des sélections adaptées à votre entreprise.">
      <SignupForm site={site.key} consent={signupConsent(site.name)} sizes={SIZES} from="/inscription" />
      <p className="text-sm text-ink-3 mt-6">Déjà inscrit ? <Link href="/connexion" className="underline">Recevoir un lien de connexion</Link>. Aucun mot de passe.</p>
    </SimplePage>
  );
}
