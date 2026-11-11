import type { ReviewQuote, ReviewSource, ReviewSummary } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { ReviewList, type QuoteView } from "./ReviewList";

export const PLATFORM: Record<string, string> = {
  g2: "G2", capterra: "Capterra", getapp: "GetApp", trustpilot: "Trustpilot", google: "Google",
  app_store: "App Store", play_store: "Google Play", appvizer: "Appvizer",
};

export function Stars({ value, scale }: { value: number; scale: number }) {
  const five = Math.round((value / scale) * 5 * 2) / 2;
  const label = `${String(value).replace(".", ",")} sur ${scale}`;
  return (
    <span role="img" aria-label={label} className="tracking-tight text-amber-700">
      {"★".repeat(Math.floor(five))}{five % 1 ? "⯪" : ""}<span className="text-line">{"★".repeat(5 - Math.ceil(five))}</span>
    </span>
  );
}

/**
 * « Ce que disent les utilisateurs » : notes publiées par chaque plateforme (telles qu'elles les affichent),
 * synthèse rédigée et validée, courtes citations avec lien vers l'avis original.
 * Avis tiers non vérifiés par la rédaction ; jamais intégrés à la note éditoriale ni en AggregateRating.
 */
export function PublicReviews({ sources, quotes, summary, name }: { sources: ReviewSource[]; quotes: ReviewQuote[]; summary: ReviewSummary | null; name: string }) {
  if (!sources.length) return null;
  const label = (s: ReviewSource) => (s.platform === "autre" ? s.platform_name ?? "Autre" : PLATFORM[s.platform] ?? s.platform);
  const byId = new Map(sources.map((s) => [s.id, s]));
  const views: QuoteView[] = quotes.map((q) => {
    const s = byId.get(q.review_source_id);
    return {
      id: q.id, quote: q.quote, translated: q.translated, author: q.author_label, url: q.review_url,
      date: q.review_date, dateLabel: formatDate(q.review_date), sentiment: q.sentiment,
      platform: s ? label(s) : "Source", rating: q.rating == null ? null : Number(q.rating), scale: s?.rating_scale ?? 5,
    };
  });

  return (
    <section className="my-10" aria-labelledby="avis-publics">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Avis publics · sources citées</p>
      <h2 id="avis-publics" className="mt-1 font-display font-extrabold text-2xl sm:text-3xl tracking-tight scroll-mt-24">Ce que disent les utilisateurs de {name}</h2>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s) => (
          <li key={s.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">{label(s)}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{s.rating != null ? String(s.rating).replace(".", ",") : "—"}</span>
              <span className="text-sm text-ink-3">/ {s.rating_scale}</span>
            </p>
            {s.rating != null && <Stars value={Number(s.rating)} scale={s.rating_scale} />}
            <p className="mt-1 text-xs text-ink-3">
              {s.review_count != null ? `${s.review_count} avis sur ${label(s)} · ` : ""}relevé le {formatDate(s.captured_at)} ·{" "}
              <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" className="underline">source</a>
            </p>
          </li>
        ))}
      </ul>

      {summary && (
        <div className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
            Synthèse de la rédaction · {summary.based_on} avis publics lus
            {summary.period_start && summary.period_end ? ` (du ${formatDate(summary.period_start)} au ${formatDate(summary.period_end)})` : ""}
          </p>
          <p className="mt-2 leading-relaxed">{summary.summary}</p>
          {(summary.likes.length > 0 || summary.watchouts.length > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-sm font-bold">Ce qu&apos;ils apprécient</p>
                <ul className="mt-2 space-y-1 text-sm">{summary.likes.map((l) => <li key={l}>+ {l}</li>)}</ul>
              </div>
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-sm font-bold">Points de vigilance</p>
                <ul className="mt-2 space-y-1 text-sm">{summary.watchouts.map((w) => <li key={w}>! {w}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      )}

      {views.length > 0 && <ReviewList quotes={views} />}

      <p className="mt-4 text-xs text-ink-3">
        Avis publiés sur des plateformes tierces et cités avec leur source : ils ne sont pas vérifiés par la rédaction,
        chaque plateforme appliquant sa propre procédure de contrôle. Les notes affichées sont celles des plateformes, à la date du relevé.
        Ces avis n&apos;entrent pas dans notre note, qui repose uniquement sur notre test.
      </p>
    </section>
  );
}
