type Check = { code: string; ok: boolean; blocking: boolean; message: string };

export function SeoReport({ report }: { report: { passed: boolean; checks: Check[] } | null }) {
  if (!report) return null;
  return (
    <div>
      <p className={`text-sm font-semibold mb-2 ${report.passed ? "text-green-700" : "text-red-700"}`}>
        {report.passed ? "✅ Checklist SEO conforme" : "⛔ Checklist SEO non conforme : soumission impossible"}
      </p>
      <ul className="space-y-1 text-sm">
        {report.checks.map((c) => (
          <li key={c.code} className="flex gap-2">
            <span aria-hidden>{c.ok ? "✅" : c.blocking ? "⛔" : "⚠️"}</span>
            <span className={c.ok ? "text-ink-2" : c.blocking ? "text-red-700" : "text-amber-700"}>{c.message}{!c.ok && !c.blocking && " (recommandé)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
