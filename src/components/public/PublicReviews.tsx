import type { ReviewQuote, ReviewSource } from "@/lib/data";
import { formatDate } from "@/lib/format";

const PLATFORM: Record<string, string> = {
  g2: "G2", capterra: "Capterra", getapp: "GetApp", trustpilot: "Trustpilot", google: "Google",
  app_store: "App Store", play_store: "Google Play", appvizer: "Appvizer",
};
const SENTIMENT: Record<string, string> = { positive: "Point positif", negative: "Point négatif", mixed: "Avis nuancé" };

/**
 * « Ce que disent les avis publics » : notes relevées sur des plateformes tierces et courtes citations,
 * chacune avec son lien et sa date. Non vérifiés par la rédaction ; jamais intégrés à la note éditoriale.
 * Sélection équilibrée : autant de points négatifs que positifs quand ils existent.
 */
export function PublicReviews({ sources, quotes, name }: { sources: ReviewSource[]; quotes: ReviewQuote[]; name: string }) {
  if (!sources.length) return null;
  const byId = new Map(sources.map((s) => [s.id, s]));
  const pos = quotes.filter((q) => q.sentiment === "positive");
  const neg = quotes.filter((q) => q.sentiment !== "positive");
  // Équilibre : si les deux existent, autant de positifs que de négatifs (3 au plus chacun)
  const k = pos.length && neg.length ? Math.min(3, pos.length, neg.length) : 3;
  const shown = [...pos.slice(0, k), ...neg.slice(0, k)];
  const label = (s: ReviewSource) => (s.platform === "autre" ? s.platform_name ?? "Autre" : PLATFORM[s.platform] ?? s.platform);

  return (
    <section className="my-8" aria-labelledby="avis-publics">
      <h2 id="avis-publics" className="text-xl font-bold">Ce que disent les avis publics sur {name}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s) => (
          <li key={s.id} className="rounded-xl border border-line p-4">
            <p className="font-semibold">{label(s)}</p>
            <p className="text-2xl font-bold">
              {s.rating != null ? `${String(s.rating).replace(".", ",")}/${s.rating_scale}` : "—"}
            </p>
            <p className="text-sm text-ink-3">
              {s.review_count != null ? `${s.review_count} avis · ` : ""}relevé le {formatDate(s.captured_at)} ·{" "}
              <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" className="underline">voir la source</a>
            </p>
          </li>
        ))}
      </ul>
      {shown.length > 0 && (
        <ul className="mt-4 space-y-3">
          {shown.map((q) => {
            const s = byId.get(q.review_source_id);
            return (
              <li key={q.id} className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{SENTIMENT[q.sentiment]}</p>
                <blockquote cite={q.review_url} className="mt-1">« {q.quote} »{q.translated ? " (traduit par la rédaction)" : ""}</blockquote>
                <p className="mt-1 text-sm text-ink-3">
                  {q.author_label} · {s ? label(s) : "Source"}, {formatDate(q.review_date)} ·{" "}
                  <a href={q.review_url} rel="noopener noreferrer nofollow" target="_blank" className="underline">lire l&apos;avis original</a>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-3">
        Avis publiés sur des plateformes tierces, cités avec leur source. Ils ne sont pas vérifiés par la rédaction et
        n&apos;entrent pas dans notre note, qui repose uniquement sur notre test. Chaque plateforme applique sa propre procédure de contrôle.
      </p>
    </section>
  );
}
