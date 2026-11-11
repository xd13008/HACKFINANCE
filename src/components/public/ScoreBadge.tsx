export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-3xl px-4 py-2" : size === "sm" ? "text-sm px-2 py-0.5" : "text-xl px-3 py-1";
  return (
    <span className={`inline-flex items-baseline gap-0.5 rounded-lg bg-brand text-white font-bold ${cls}`} aria-label={`Note ${score} sur 10`}>
      {score.toFixed(1).replace(".", ",")}<span className="text-xs font-normal opacity-80">/10</span>
    </span>
  );
}

export function CriterionBar({ label, score, weight }: { label: string; score: number; weight?: number }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,12rem)_1fr_3rem] items-center gap-3 text-sm">
      <span className="text-ink-2">{label}{weight != null && <span className="text-ink-3"> ({weight} %)</span>}</span>
      <span className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
        <span className="block h-full rounded-full bg-brand" style={{ width: `${score * 10}%` }} />
      </span>
      <span className="text-right font-medium tabular-nums">{score.toFixed(1).replace(".", ",")}</span>
    </div>
  );
}
