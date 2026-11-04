import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">Page introuvable</h1>
      <p className="text-ink-2 mt-3">Cette page n&apos;existe pas ou n&apos;est plus publiée.</p>
      <p className="mt-6"><Link href="/" className="text-brand underline">Retour à l&apos;accueil</Link></p>
    </div>
  );
}
