import Link from "next/link";

export type Crumb = { name: string; path: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-ink-3 mb-4">
      <ol className="flex flex-wrap gap-1">
        {items.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            {i < items.length - 1 ? (
              <Link href={c.path} className="hover:underline">{c.name}</Link>
            ) : (
              <span aria-current="page" className="text-ink-2">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
