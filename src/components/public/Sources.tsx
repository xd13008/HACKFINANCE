import type { Source } from "@/lib/data";
import { formatDate } from "@/lib/format";

export function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <section className="mt-10 text-sm" aria-labelledby="sources-title">
      <h2 id="sources-title" className="font-semibold text-base mb-2">Sources</h2>
      <ul className="space-y-1 text-ink-2">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" className="underline">{s.title ?? s.url}</a>
            {" "}— consulté le {formatDate(s.accessed_at)}
          </li>
        ))}
      </ul>
    </section>
  );
}
