import Link from "next/link";

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {intro && <p className="text-ink-2 text-sm mt-1 max-w-3xl">{intro}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="rounded-xl border border-line bg-surface p-4 h-full">
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-ink-3 mt-1">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block hover:ring-2 ring-brand rounded-xl">{body}</Link> : body;
}

const TONES: Record<string, string> = {
  neutral: "bg-surface-2 text-ink-2",
  info: "bg-blue-100 text-blue-900",
  good: "bg-green-100 text-green-900",
  warn: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-900",
};
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block text-xs font-medium rounded px-1.5 py-0.5 ${TONES[tone]}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  draft: "neutral", submitted: "info", approved: "good", published: "good", superseded: "neutral", unpublished: "warn", blocked: "bad",
  new: "info", checking: "info", accepted: "good", rejected: "bad", duplicate: "neutral",
  qualified: "info", quote_sent: "warn", signed: "good", active: "good", ended: "neutral", lost: "bad", scheduled: "info",
  validated: "good", completed: "info", withdrawn: "neutral", open: "warn", done: "good", dismissed: "neutral",
  verified: "good", unverified: "warn", in_review: "info", corrected: "good", answered: "good",
};
export const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumis", approved: "Approuvé", published: "Publié", superseded: "Remplacé", unpublished: "Dépublié", blocked: "Bloqué",
  new: "Nouvelle", checking: "En vérification", accepted: "Acceptée", rejected: "Refusée", duplicate: "Doublon",
  qualified: "Qualifiée", quote_sent: "Devis envoyé", signed: "Signée", active: "Active", ended: "Terminée", lost: "Perdue", scheduled: "Programmée",
  validated: "Validé", completed: "Terminé", withdrawn: "Retiré", open: "Ouverte", done: "Traitée", dismissed: "Classée",
  verified: "Vérifiée", unverified: "Non vérifiée", in_review: "En revue", corrected: "Corrigé", answered: "Répondu",
};
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-ink-3 border-b border-line">{head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {rows.length === 0 && <p className="text-sm text-ink-3 py-4">{empty ?? "Aucun élément."}</p>}
    </div>
  );
}

export const inputCls = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm";
export const btnCls = "inline-flex items-center rounded-lg bg-brand text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50";
export const btnGhost = "inline-flex items-center rounded-lg border border-line text-sm px-3 py-1.5 hover:bg-surface-2";
export const btnDanger = "inline-flex items-center rounded-lg bg-red-700 text-white text-sm font-medium px-3 py-1.5";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <span className="block mt-1">{children}</span>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </label>
  );
}
