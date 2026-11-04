import Link from "next/link";
import type { getSponsored } from "@/lib/data";
import { OutboundLink } from "./OutboundLink";

type Placement = Awaited<ReturnType<typeof getSponsored>>[number];

/**
 * Bloc publicitaire TOUJOURS distinct du classement éditorial et toujours étiqueté.
 * La mention et la séparation visuelle répondent à l'obligation de transparence des classements.
 */
export function SponsoredBlock({ placements, title = "Partenaires" }: { placements: Placement[]; title?: string }) {
  if (!placements.length) return null;
  return (
    <aside aria-label="Contenus sponsorisés" className="my-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-amber-900">{title}</h2>
        <Link href="/publicite" className="text-xs text-amber-900 underline">Pourquoi ces partenaires ?</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {placements.map((p) => {
          const name = p.software?.name ?? p.provider?.name ?? "";
          return (
            <li key={p.id} data-sponsored-impression={p.id} data-entity={p.software_id ?? p.provider_id ?? undefined}
                className="bg-white rounded-lg p-3 border border-amber-200">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wide bg-amber-400 text-amber-950 rounded px-1.5 py-0.5 mb-1">
                {p.label}
              </span>
              <p className="font-semibold">{name}</p>
              {p.headline && <p className="text-sm text-ink-2">{p.headline}</p>}
              {p.cta_url && (
                <OutboundLink href={p.cta_url} kind="sponsored" entityId={p.software_id ?? p.provider_id} placementId={p.id}
                  className="inline-block mt-2 text-sm font-medium text-brand underline">
                  {p.cta_label ?? "Voir l'offre"}
                </OutboundLink>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
