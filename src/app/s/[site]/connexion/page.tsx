import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/public/SimplePage";
import { LoginForm } from "@/components/public/MemberForms";
import { staticMetadata } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/connexion", `Connexion — ${site.name}`, "Connexion à votre espace par un lien envoyé par e-mail, sans mot de passe.", { noindex: true });
}

export default async function LoginPage({ params, searchParams }: { params: SiteParams; searchParams: Promise<{ lien?: string }> }) {
  const site = await requireSite((await params).site);
  const expired = (await searchParams).lien === "expire";
  return (
    <SimplePage site={site.key} title="Connexion" path="/connexion" pageType="form"
      intro="Indiquez votre e-mail : nous vous envoyons un lien de connexion valable 30 minutes. Aucun mot de passe.">
      {expired && <p role="alert" className="rounded-lg p-3 mb-4 bg-amber-50 text-amber-900 text-sm">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau ci-dessous.</p>}
      <LoginForm site={site.key} />
      <p className="text-sm text-ink-3 mt-6">Pas encore de compte ? <Link href="/inscription" className="underline">Créer mon compte</Link>.</p>
    </SimplePage>
  );
}
