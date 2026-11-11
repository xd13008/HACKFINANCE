import Link from "next/link";
import type { ProviderPublic } from "@/lib/data";

export function ProviderList({ providers, categorySlug }: { providers: ProviderPublic[]; categorySlug: string }) {
  if (!providers.length) return <p className="text-ink-3 my-6">Aucun professionnel référencé pour le moment.</p>;
  return (
    <section className="my-6" aria-labelledby="annuaire">
      <h2 id="annuaire" className="font-display font-extrabold text-2xl mb-1">Annuaire</h2>
      <p className="text-sm text-ink-3 mb-4">Ordre alphabétique. Cet annuaire n&apos;est pas un classement.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {providers.map((pr) => (
          <li key={pr.id} className="rounded-xl border border-line bg-white p-4">
            <Link href={`/prestataires/${categorySlug}/${pr.slug}`} className="font-bold hover:text-brand">{pr.name}</Link>
            <p className="text-sm text-ink-2">{[pr.postal_code, pr.city].filter(Boolean).join(" ")}{pr.region && ` · ${pr.region}`}{pr.deal_size_range && ` · opérations ${pr.deal_size_range}`}</p>
            <p className="text-xs mt-1">{pr.verification_status === "verified" ? "✅ Fiche vérifiée" : "Fiche non vérifiée"}</p>
            {pr.specialties && pr.specialties.length > 0 && (
              <ul className="flex flex-wrap gap-1 mt-2">{pr.specialties.map((s) => <li key={s} className="text-xs bg-surface-2 rounded px-2 py-0.5">{s}</li>)}</ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

