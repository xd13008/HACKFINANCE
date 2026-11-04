import Link from "next/link";

export type RelatedLink = { path: string; label: string; kind?: string };

/** Maillage interne calculé à partir de la taxonomie (voir lib/linking.ts). */
export function Related({ title = "À lire aussi", links }: { title?: string; links: RelatedLink[] }) {
  if (!links.length) return null;
  return (
    <nav aria-label={title} className="mt-10 rounded-xl bg-surface-2 p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.path}>
            <Link href={l.path} className="text-brand underline underline-offset-2">{l.label}</Link>
            {l.kind && <span className="text-xs text-ink-3 ml-2">{l.kind}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
