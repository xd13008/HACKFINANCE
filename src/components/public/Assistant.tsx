"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { connectsTo, entryMonthlyPrice, eur, fitScore, type SizeKey } from "@/lib/decision";
import type { ProviderCard, ToolCard } from "@/lib/universe";

export type AssistantNeed = {
  slug: string; name: string; kind: "software" | "provider";
  criteria: { key: string; label: string }[];
  tools: ToolCard[]; providers: ProviderCard[];
};
export type AssistantUniverse = { slug: string; name: string; needs: AssistantNeed[]; providers: ProviderCard[] };

const SIZES: [SizeKey, string, string][] = [
  ["tpe", "TPE", "moins de 10 salariés"], ["pme1", "Petite PME", "10 à 49 salariés"], ["pme2", "PME", "50 à 249 salariés"],
  ["eti", "ETI", "250 salariés et plus"], ["crea", "En création", "moins de 2 ans"], ["growth", "En forte croissance", "levée ou rachat récent"],
];
const STACKS: [string, string[]][] = [
  ["Logiciel comptable", ["Pennylane", "Sage", "Cegid", "EBP", "QuickBooks", "MyUnisoft", "Tiime", "ACD", "Inqom"]],
  ["ERP", ["Odoo", "Microsoft Dynamics", "SAP", "Oracle NetSuite", "Divalto", "Sage X3"]],
  ["Banque, trésorerie et dépenses", ["Qonto", "Shine", "Agicap", "Spendesk", "Libeo"]],
  ["Tableur", ["Excel", "Google Sheets"]],
];
const ADVICE: Record<"small" | "large", [string, string][]> = {
  small: [["Simplicité", "privilégiez une mise en route en moins d’une journée, sans intégrateur."], ["Connexions", "vérifiez que vos banques et votre logiciel comptable remontent automatiquement."], ["Engagement", "un abonnement sans engagement annuel vous laisse changer si la croissance s’accélère."]],
  large: [["Multi-sociétés", "indispensable dès deux entités : vue groupe et flux intragroupe éliminés."], ["Connexion native", "à votre ERP ou logiciel comptable : elle évite ressaisies et écarts."], ["Gouvernance", "droits par utilisateur, circuits de validation et piste d’audit."]],
};
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Assistant « Vous partez de zéro » : 3 questions, puis 5 solutions classées selon le profil (aucun sponsorisé). */
export function Assistant({ universes }: { universes: AssistantUniverse[] }) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<SizeKey | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  const [needSlug, setNeedSlug] = useState<string | null>(null);

  const need = universes.flatMap((u) => u.needs.map((n) => ({ u, n }))).find((x) => x.n.slug === needSlug);
  const picks = useMemo(() => {
    if (!need) return [];
    return need.n.tools
      .map((t) => ({ t, fit: fitScore({ score: t.score, targetSizes: t.targetSizes, integrations: t.integrations }, size, stack) }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 5);
  }, [need, size, stack]);
  // Recherche enregistrée dans le profil seulement si le cookie de personnalisation est accepté (contrôle côté serveur).
  useEffect(() => {
    if (!need || step < 4) return;
    const results = need.n.kind === "software" ? picks.map((p) => p.t.slug) : need.n.providers.slice(0, 10).map((p) => p.slug);
    fetch("/api/member/search", {
      method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ size, stack, universe: need.u.slug, need: need.n.slug, results }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needSlug, step]);
  const sizeLabel = SIZES.find(([k]) => k === size);
  const small = size === "tpe" || size === "pme1" || size === "crea";
  const experts = need ? (need.n.providers.length ? need.n.providers : need.u.providers).slice(0, 4) : [];
  const cheapest = [...picks].filter((p) => entryMonthlyPrice(p.t.plans) != null).sort((a, b) => entryMonthlyPrice(a.t.plans)! - entryMonthlyPrice(b.t.plans)!)[0];
  const bestScore = [...picks].sort((a, b) => b.t.score - a.t.score)[0];

  const card = (on: boolean) => `flex flex-col items-start gap-1 min-h-24 p-5 rounded-xl text-left border ${on ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink"}`;
  const chip = (on: boolean) => `inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border text-[15px] font-semibold ${on ? "bg-ink text-white border-ink" : "bg-page border-line hover:border-ink"}`;

  if (step <= 3) {
    const q = [
      ["Quelle est votre entreprise ?", "Taille et étape de vie : les bonnes solutions ne sont pas les mêmes."],
      ["Quels outils utilisez-vous déjà ?", "Plusieurs choix possibles. Nous privilégions les solutions qui s’y connectent."],
      ["Quel est votre besoin prioritaire ?", "Un seul choix. Vous pourrez explorer les autres ensuite."],
    ][step - 1];
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <span className="text-sm font-bold uppercase tracking-wider text-ink-3">Étape {step} sur 3</span>
          <div className="flex gap-1.5 w-60" aria-hidden="true">{[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded ${i <= step ? "bg-ink" : "bg-line"}`} />)}</div>
          {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="min-h-10 px-3 rounded-lg border border-line bg-white text-sm">← Question précédente</button>}
        </div>
        <div className="flex flex-wrap gap-10 items-start">
          <div className="flex-1 basis-80 max-w-md flex flex-col gap-4">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">{q[0]}</h1>
            <p className="text-lg text-ink-2">{q[1]}</p>
            {step === 2 && (
              <div className="flex flex-col gap-3 mt-2">
                <span className="text-sm text-ink-2" aria-live="polite">{stack.length ? `${stack.length} outil(s) : ${stack.join(", ")}` : "Aucun outil sélectionné : ce n’est pas grave."}</span>
                <button type="button" onClick={() => setStep(3)} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold">Continuer →</button>
              </div>
            )}
          </div>
          <div className="flex-[999_1_32rem] min-w-0 flex flex-col gap-3">
            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SIZES.map(([k, label, sub]) => (
                  <button key={k} type="button" aria-pressed={size === k} onClick={() => { setSize(k); setStep(2); }} className={card(size === k)}>
                    <span className="font-display font-extrabold text-2xl">{label}</span><span className="text-sm opacity-75">{sub}</span>
                  </button>
                ))}
              </div>
            )}
            {step === 2 && STACKS.map(([family, tools]) => (
              <section key={family} className="p-5 rounded-xl bg-white border border-line">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">{family}</h2>
                <div className="flex flex-wrap gap-2">
                  {tools.map((t) => {
                    const on = stack.includes(t);
                    return <button key={t} type="button" aria-pressed={on} onClick={() => setStack(on ? stack.filter((x) => x !== t) : [...stack, t])} className={chip(on)}><span aria-hidden="true">{on ? "✓" : "+"}</span>{t}</button>;
                  })}
                </div>
              </section>
            ))}
            {step === 3 && (universes.some((u) => u.needs.length) ? universes.filter((u) => u.needs.length).map((u) => (
              <section key={u.slug} className="p-5 rounded-xl bg-white border border-line">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">{u.name}</h2>
                <div className="flex flex-wrap gap-2">
                  {u.needs.map((n) => <button key={n.slug} type="button" aria-pressed={needSlug === n.slug} onClick={() => { setNeedSlug(n.slug); setStep(4); }} className={chip(needSlug === n.slug)}>{n.name} <span aria-hidden="true">→</span></button>)}
                </div>
              </section>
            )) : <p className="p-5 rounded-xl bg-surface-2">Les premiers comparatifs sont en cours de validation par la rédaction.</p>)}
          </div>
        </div>
      </div>
    );
  }

  if (!need) return null;
  const criteria = need.n.criteria.slice(0, 5);
  return (
    <div>
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">Votre sélection personnalisée</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">
            {need.n.kind === "software" ? `${need.n.name} : les solutions faites pour vous` : `${need.n.name} : les prestataires référencés`}
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            {[sizeLabel ? `${sizeLabel[1]} · ${sizeLabel[2]}` : null, stack.length ? `Équipé : ${stack.join(", ")}` : "Sans outil existant", `Univers : ${need.u.name}`].filter(Boolean).map((r) => (
              <span key={r} className="inline-flex items-center min-h-9 px-3 rounded-lg bg-white/10 text-sm font-semibold">{r}</span>
            ))}
            <button type="button" onClick={() => { setStep(1); setNeedSlug(null); }} className="min-h-9 px-3 rounded-lg border border-white/40 text-sm">Modifier mes réponses</button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-3">
        {need.n.kind === "software" && picks.length === 0 && <p className="p-5 rounded-xl bg-surface-2">Tests en cours dans cette catégorie : revenez bientôt, ou consultez les prestataires ci-dessous.</p>}
        {picks.map(({ t, fit }, i) => {
          const entry = entryMonthlyPrice(t.plans);
          const badge = i === 0 ? "Meilleur choix pour vous" : t === bestScore?.t ? "Le mieux noté" : t === cheapest?.t ? "Le moins cher" : stack.some((s) => connectsTo(t.integrations, s)) ? "Compatible avec vos outils" : null;
          return (
            <article key={t.slug} className={`flex flex-wrap gap-5 items-center p-5 rounded-2xl bg-white border ${i === 0 ? "border-ink shadow-md" : "border-line shadow-sm"}`}>
              <span className={`size-12 rounded-lg grid place-items-center font-display font-extrabold text-xl ${i === 0 ? "bg-accent text-ink" : "bg-surface-2"}`}>{i + 1}</span>
              <div className="flex-[999_1_18rem] min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold"><Link href={`/logiciels/${t.slug}`}>{t.name}</Link></h2>
                  {badge && <span className={`text-xs font-bold rounded-md px-2 py-1 ${i === 0 ? "bg-accent text-ink" : "bg-surface-2"}`}>{badge}</span>}
                </div>
                {t.tagline && <p className="text-sm text-ink-2">{t.tagline}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {stack.length ? stack.map((s) => {
                    const ok = connectsTo(t.integrations, s);
                    return <span key={s} className={`text-xs font-semibold rounded-md px-2 py-1 ${ok ? "bg-lime-100 text-lime-900" : "bg-orange-50 text-orange-900"}`}>{ok ? "✓" : "⚠ connexion non référencée ·"} {s}</span>;
                  }) : <span className="text-xs font-semibold rounded-md px-2 py-1 bg-surface-2">Fonctionne sans outil existant</span>}
                </div>
              </div>
              <div className="flex-1 basis-52 flex flex-col gap-2">
                <div className="flex justify-between gap-3 p-3 rounded-lg bg-surface-2">
                  <span className="flex flex-col"><span className="text-xs text-ink-3">Adéquation</span><span className="text-xl font-extrabold">{Math.round(fit * 10)} %</span></span>
                  <span className="flex flex-col text-right"><span className="text-xs text-ink-3">Note rédaction</span><span className="text-lg font-extrabold">{fmt(t.score)}/10</span></span>
                </div>
                <span className="text-sm text-ink-3">{entry == null ? "Sur devis" : entry === 0 ? "Offre gratuite disponible" : `Dès ${eur(entry)} HT/mois`}</span>
                <Link href={`/logiciels/${t.slug}`} className="inline-flex items-center justify-center min-h-11 rounded-lg bg-ink text-white font-semibold text-sm">Voir le test détaillé</Link>
              </div>
            </article>
          );
        })}
        {picks.length > 0 && <p className="text-xs text-ink-3">Adéquation = note de la rédaction (tests réels) ajustée à votre taille et à la compatibilité avec vos outils. Aucun emplacement sponsorisé dans cette sélection.</p>}

        {picks.length > 1 && criteria.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display font-extrabold text-2xl mb-3">Le comparatif rapide</h2>
            <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-surface-2 text-left"><tr><th scope="col" className="p-3">Critère</th>{picks.map(({ t }) => <th key={t.slug} scope="col" className="p-3">{t.name}</th>)}</tr></thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.key} className="border-t border-line"><th scope="row" className="p-3 text-left font-semibold">{c.label}</th>{picks.map(({ t }) => <td key={t.slug} className="p-3">{t.criteria[c.key] != null ? fmt(Number(t.criteria[c.key])) : "—"}</td>)}</tr>
                  ))}
                  <tr className="border-t border-line"><th scope="row" className="p-3 text-left font-semibold">Prix d’entrée HT/mois</th>{picks.map(({ t }) => { const e = entryMonthlyPrice(t.plans); return <td key={t.slug} className="p-3">{e == null ? "Sur devis" : e === 0 ? "Gratuit" : eur(e)}</td>; })}</tr>
                </tbody>
              </table>
            </div>
            <Link href={`/meilleurs-logiciels/${need.n.slug}`} className="inline-block mt-3 font-bold underline">Voir toute la catégorie et filtrer →</Link>
          </section>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="p-6 rounded-2xl bg-accent text-ink">
            <h2 className="font-display font-extrabold text-2xl mb-2">Ce qui compte pour votre profil</h2>
            {ADVICE[small ? "small" : "large"].map(([t, d]) => <p key={t} className="mt-2"><strong>{t}</strong> — {d}</p>)}
          </section>
          <section className="p-6 rounded-2xl bg-white border border-line shadow-sm">
            <h2 className="font-display font-extrabold text-2xl mb-2">Besoin d’aide pour la mise en place ?</h2>
            {experts.length ? (
              <ul className="flex flex-col gap-2">
                {experts.map((p) => <li key={`${p.metierSlug}/${p.slug}`}><Link href={`/prestataires/${p.metierSlug}/${p.slug}`} className="flex justify-between gap-3 p-3 rounded-lg bg-surface-2"><span><strong>{p.name}</strong> · {p.metierName}{p.city ? ` · ${p.city}` : ""}</span><span aria-hidden="true">→</span></Link></li>)}
              </ul>
            ) : <p className="text-ink-2">Aucun prestataire référencé pour l’instant dans cet univers.</p>}
            <p className="text-xs text-ink-3 mt-2">Annuaire factuel, sans classement.</p>
          </section>
        </div>
        <Link href={`/univers/${need.u.slug}`} className="self-start mt-4 inline-flex items-center min-h-11 px-5 rounded-lg border border-line bg-white font-bold">Tout l’univers {need.u.name} →</Link>
      </div>
    </div>
  );
}
