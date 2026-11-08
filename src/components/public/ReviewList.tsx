"use client";

import { useMemo, useState } from "react";

export type QuoteView = {
  id: string; quote: string; translated: boolean; author: string; url: string; date: string; dateLabel: string;
  sentiment: string; platform: string; rating: number | null; scale: number;
};

const SORTS = [
  { key: "recent", label: "Plus récents" },
  { key: "best", label: "Mieux notés" },
  { key: "worst", label: "Moins bien notés" },
] as const;

function stars(rating: number, scale: number) {
  const n = Math.round((rating / scale) * 5);
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** Liste des citations, triable. Par défaut, les plus récentes. */
export function ReviewList({ quotes }: { quotes: QuoteView[] }) {
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("recent");
  const sorted = useMemo(() => {
    const norm = (q: QuoteView) => (q.rating == null ? -1 : q.rating / q.scale);
    const list = [...quotes];
    if (sort === "recent") list.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "best") list.sort((a, b) => norm(b) - norm(a));
    if (sort === "worst") list.sort((a, b) => (norm(a) < 0 ? 1 : norm(b) < 0 ? -1 : norm(a) - norm(b)));
    return list;
  }, [quotes, sort]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Trier les avis">
        {SORTS.map((s) => (
          <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}
            className={`min-h-10 rounded-full border-2 border-ink px-4 text-sm font-semibold ${sort === s.key ? "bg-ink text-surface" : "bg-surface"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-3">
        {sorted.map((q) => (
          <li key={q.id} className="rounded-2xl border-2 border-ink p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{q.author}</span>{" "}
                <a href={q.url} rel="noopener noreferrer nofollow" target="_blank"
                  className="ml-1 rounded-full border border-ink px-2 py-0.5 text-xs font-semibold no-underline">via {q.platform} ↗</a>
              </p>
              {q.rating != null && (
                <span role="img" aria-label={`${String(q.rating).replace(".", ",")} sur ${q.scale}`} className="text-accent">{stars(q.rating, q.scale)}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-3">{q.dateLabel}</p>
            <blockquote cite={q.url} className="mt-2">« {q.quote} »{q.translated ? " (traduit par la rédaction)" : ""}</blockquote>
            <a href={q.url} rel="noopener noreferrer nofollow" target="_blank" className="mt-2 inline-block text-sm underline">
              Lire l&apos;avis complet sur {q.platform}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
