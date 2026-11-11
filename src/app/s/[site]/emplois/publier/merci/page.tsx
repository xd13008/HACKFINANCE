import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Paiement reçu", robots: { index: false, follow: false } };

export default function Thanks() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
      <h1 className="text-3xl font-extrabold">Merci, votre paiement est en cours de confirmation</h1>
      <p>Votre facture arrive par e-mail. L&apos;annonce passe ensuite en relecture : elle est publiée sous 2 jours ouvrés si elle respecte nos règles, sinon remboursée.</p>
      <p><Link href="/mon-espace#annonces" className="underline">Suivre mon annonce dans « Mon espace »</Link></p>
    </div>
  );
}
