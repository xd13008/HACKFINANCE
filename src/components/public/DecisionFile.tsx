import Link from "next/link";
import type { Criterion, Fact, PricingPlan, RankedSoftware, Score, TestRun } from "@/lib/data";
import { entryMonthlyPrice, eur } from "@/lib/decision";
import { formatDate } from "@/lib/format";
import { CostSimulator } from "./CostSimulator";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const H2 = ({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) => (
  <header className="mb-4">
    <p className="text-xs font-bold uppercase tracking-wider text-ink-3">{kicker}</p>
    <h2 id={id} className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight scroll-mt-24">{children}</h2>
  </header>
);

export type DecisionSection = { id: string; label: string };

/** En-tête du dossier : verdict, 4 indicateurs, sommaire. Uniquement des données publiées (test validé, prix validés). */
export function DecisionHeader({ name, test, overall, rank, rankTotal, categoryName, plans, sections }: {
  name: string; test: TestRun | null; overall: number | null; rank: number | null; rankTotal: number; categoryName: string | null;
  plans: PricingPlan[]; sections: DecisionSection[];
}) {
  const entry = entryMonthlyPrice(plans);
  const kpis: [string, string, string][] = [
    ["Note de la rédaction", overall != null ? `${fmt(overall)}/10` : "Non testé", test ? "Test réel, preuves archivées" : "Fiche référencée"],
    ["Classement", rank != null ? `${rank}${rank === 1 ? "ᵉʳ" : "ᵉ"} sur ${rankTotal}` : "—", categoryName ?? "Catégorie à venir"],
    ["Prix d’entrée", entry == null ? (plans.length ? "Sur devis" : "—") : entry === 0 ? "Gratuit" : `${eur(entry)} HT/mois`, plans.length ? "Prix publics relevés et datés" : "Tarifs non publiés"],
    ["Testé le", test ? formatDate(test.tested_at) : "—", test?.product_version ? `Version ${test.product_version}` : "Version non précisée"],
  ];
  return (
    <div className="my-6 flex flex-col gap-4">
      {test?.verdict && (
        <section aria-labelledby="verdict" className="p-6 rounded-2xl bg-ink text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Notre verdict</p>
          <h2 id="verdict" className="sr-only">Notre verdict sur {name}</h2>
          <p className="mt-2 text-lg sm:text-xl font-semibold leading-snug">{test.verdict}</p>
        </section>
      )}
      <dl className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map(([k, v, sub]) => (
          <div key={k} className="p-4 rounded-xl bg-white border border-line shadow-sm">
            <dt className="text-xs font-semibold text-ink-3">{k}</dt>
            <dd className="font-display font-extrabold text-2xl leading-tight mt-1">{v}</dd>
            <dd className="text-xs text-ink-3 mt-1">{sub}</dd>
          </div>
        ))}
      </dl>
      <nav aria-label="Sommaire du dossier" className="flex flex-wrap gap-2">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="inline-flex items-center min-h-10 px-3 rounded-lg border border-line bg-white text-sm font-semibold hover:border-ink">{s.label}</a>)}
      </nav>
    </div>
  );
}

/** Synthèse en 4 cases : idéal pour, points forts, points faibles, coût. */
export function DecisionSynthesis({ test, plans }: { test: TestRun; plans: PricingPlan[] }) {
  const entry = entryMonthlyPrice(plans);
  return (
    <section aria-labelledby="synthese" className="my-10">
      <H2 id="synthese" kicker="En 30 secondes">La synthèse</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-5 rounded-2xl bg-accent text-ink"><p className="font-bold">Idéal pour</p><p className="mt-1">{test.best_for ?? "Profil non précisé par la rédaction."}</p></div>
        <div className="p-5 rounded-2xl bg-white border border-line shadow-sm"><p className="font-bold">Ce qu’on paie</p>
          <p className="mt-1">{entry == null ? "Tarifs sur devis : demandez une offre écrite." : entry === 0 ? "Une offre gratuite existe ; les offres payantes sont détaillées plus bas." : `À partir de ${eur(entry)} HT par mois, selon l’offre et le nombre de sociétés.`}</p></div>
        <div className="p-5 rounded-2xl bg-white border border-line shadow-sm"><p className="font-bold text-lime-900">Points forts</p><ul className="mt-1 flex flex-col gap-1">{test.pros.map((p) => <li key={p}>+ {p}</li>)}</ul></div>
        <div className="p-5 rounded-2xl bg-white border border-line shadow-sm"><p className="font-bold text-orange-900">Points faibles</p><ul className="mt-1 flex flex-col gap-1">{test.cons.map((p) => <li key={p}>– {p}</li>)}</ul></div>
      </div>
    </section>
  );
}

/** Tableau du test : critère, poids, note, justification, preuve. */
export function DecisionTest({ criteria, scores, overall, test }: { criteria: Criterion[]; scores: Score[]; overall: number; test: TestRun }) {
  const byKey = new Map(scores.map((s) => [s.criterion_key, s]));
  const evidence = (Array.isArray(test.evidence) ? test.evidence : []) as { label?: string }[];
  return (
    <section aria-labelledby="test" className="my-10">
      <H2 id="test" kicker="Ce que nous avons vérifié">Le test, critère par critère</H2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-surface-2 text-left"><tr><th scope="col" className="p-3">Critère</th><th scope="col" className="p-3">Poids</th><th scope="col" className="p-3">Note</th><th scope="col" className="p-3">Ce que nous avons constaté</th></tr></thead>
          <tbody>
            {criteria.map((c) => {
              const s = byKey.get(c.key);
              if (!s) return null;
              return (
                <tr key={c.key} className="border-t border-line align-top">
                  <th scope="row" className="p-3 text-left font-semibold">{c.label}</th>
                  <td className="p-3 tabular-nums">{c.weight} %</td>
                  <td className="p-3"><span className="inline-block min-w-12 text-center rounded-md bg-surface-2 px-2 py-1 font-bold tabular-nums">{fmt(Number(s.score))}</span></td>
                  <td className="p-3 text-ink-2">{s.justification}</td>
                </tr>
              );
            })}
            <tr className="border-t border-line bg-surface-2"><th scope="row" className="p-3 text-left">Note globale pondérée</th><td className="p-3">100 %</td><td className="p-3"><span className="inline-block min-w-12 text-center rounded-md bg-ink text-white px-2 py-1 font-bold tabular-nums">{fmt(overall)}</span></td><td className="p-3 text-ink-2">Calculée automatiquement à partir des notes ci-dessus.</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        <strong>Preuves archivées :</strong> {evidence.length ? evidence.map((e) => e.label ?? "capture").join(" · ") : "aucune"}.
        Conservées par la rédaction et présentées à l’éditeur en cas de contestation.
      </p>
    </section>
  );
}

export function DecisionCost({ name, plans, multiEntity }: { name: string; plans: PricingPlan[]; multiEntity: boolean | null }) {
  if (!plans.length) return null;
  return (
    <section aria-labelledby="cout" className="my-10">
      <H2 id="cout" kicker="Votre budget">Combien ça vous coûtera</H2>
      <CostSimulator name={name} multiEntity={multiEntity}
        plans={plans.map((p) => ({ plan_name: p.plan_name, price_eur: p.price_eur, billing_period: p.billing_period, per_unit: p.per_unit }))} />
    </section>
  );
}

const FACT_LABELS: Record<string, string> = {
  free_plan: "Offre gratuite", bank_connections: "Banques connectées", multi_entity: "Plusieurs sociétés",
  target_sizes: "Tailles d’entreprise", hosting: "Hébergement des données", min_price_eur: "Prix d’entrée (€ HT/mois)",
  free_trial: "Essai gratuit", no_commitment: "Sans engagement", bank_protocols: "Protocoles bancaires", accounts_included: "Comptes bancaires inclus",
  pa_status: "Plateforme agréée (DGFiP)", e_invoice_formats: "Formats de facture électronique", ereporting: "E-reporting", api: "API",
  accounting_exports: "Logiciels comptables connectés", ocr: "Lecture automatique des justificatifs", corporate_cards: "Cartes de paiement",
  mileage: "Indemnités kilométriques", approval_workflow: "Circuit de validation", po_matching: "Rapprochement avec les commandes",
  supplier_payments: "Paiement des fournisseurs", e_invoice_reception: "Réception des factures électroniques",
};
/** Oui/Non, listes (tailles en sigles : « TPE, PME » ; noms de logiciels tels quels), nombres et textes. */
const factValue = (v: unknown) => (v === true ? "Oui" : v === false ? "Non"
  : Array.isArray(v) ? v.map((x) => (/^(tpe|pme|eti)$/.test(String(x)) ? String(x).toUpperCase() : String(x))).join(", ") : String(v));

/** Carte d'identité : chaque fait validé avec sa source et sa date. */
export function DecisionIdentity({ facts, integrations, website }: { facts: Map<string, Fact> | undefined; integrations: { name: string }[]; website: string | null }) {
  const rows = [...(facts?.values() ?? [])];
  if (!rows.length && !integrations.length) return null;
  return (
    <section aria-labelledby="identite" className="my-10">
      <H2 id="identite" kicker="Faits sourcés et datés">La carte d’identité</H2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((f) => (
          <div key={f.id} className="flex justify-between gap-4 p-4 rounded-xl bg-white border border-line">
            <dt className="text-ink-2">{FACT_LABELS[f.fact_type] ?? f.fact_type}</dt>
            <dd className="text-right"><span className="font-semibold">{factValue(f.value)}</span><br />
              <a href={f.source_url} rel="nofollow noopener" target="_blank" className="text-xs text-ink-3 underline">source, relevée le {formatDate(f.collected_at)}</a></dd>
          </div>
        ))}
        {integrations.length > 0 && (
          <div className="sm:col-span-2 p-4 rounded-xl bg-white border border-line">
            <dt className="text-ink-2 mb-2">Se connecte à</dt>
            <dd className="flex flex-wrap gap-1.5">{integrations.map((i) => <span key={i.name} className="text-sm font-semibold rounded-md bg-surface-2 px-2 py-1">{i.name}</span>)}</dd>
          </div>
        )}
      </dl>
      {website && <p className="mt-2 text-xs text-ink-3">Site officiel : {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>}
    </section>
  );
}

/** Alternatives : les autres solutions du même classement éditorial (aucun sponsorisé). */
export function DecisionAlternatives({ items, categorySlug, categoryName }: { items: RankedSoftware[]; categorySlug: string; categoryName: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="alternatives" className="my-10">
      <H2 id="alternatives" kicker="Avant de signer">Les alternatives testées</H2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((r) => (
          <li key={r.software.id}>
            <Link href={`/logiciels/${r.software.slug}`} className="flex flex-col gap-1 h-full p-5 rounded-2xl bg-white border border-line shadow-sm hover:border-ink">
              <span className="text-xs text-ink-3">{r.rank}{r.rank === 1 ? "ᵉʳ" : "ᵉ"} du classement</span>
              <span className="text-lg font-extrabold">{r.software.name}</span>
              <span className="text-sm text-ink-2">{r.software.tagline}</span>
              <span className="mt-auto pt-2 font-bold">{fmt(r.overall)}/10 →</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/meilleurs-logiciels/${categorySlug}`} className="inline-block mt-3 font-bold underline">Tout le classement {categoryName} →</Link>
    </section>
  );
}

/** Méthode : protocole, testeur, valideur, indépendance. */
export function DecisionMethod({ test, tester, validator }: { test: TestRun; tester?: string | null; validator?: string | null }) {
  return (
    <section aria-labelledby="methode" className="my-10 p-6 rounded-2xl bg-surface-2">
      <H2 id="methode" kicker="Transparence">Notre méthode</H2>
      <ul className="flex flex-col gap-2 text-sm">
        <li><strong>Protocole :</strong> {test.protocol}</li>
        <li><strong>Test réalisé</strong> le {formatDate(test.tested_at)}{test.product_version ? `, version ${test.product_version}` : ""}{tester ? `, par ${tester}` : ""}.</li>
        {test.validated_at && <li><strong>Validé</strong> le {formatDate(test.validated_at)}{validator ? ` par ${validator}` : ""}, membre de la rédaction.</li>}
        <li><strong>Indépendance :</strong> {test.requested_by_vendor ? "test réalisé à la demande de l’éditeur ; la note suit la même méthode publiée." : "test réalisé à l’initiative de la rédaction."} Aucun éditeur ne peut acheter une note ni une place dans le classement.</li>
      </ul>
      <Link href="/methode" className="inline-block mt-3 text-sm font-bold underline">Lire la méthodologie complète →</Link>
    </section>
  );
}

/** 5 matchs : les solutions testées de la même catégorie dont la note est la plus proche. Chaque match ouvre le duel. */
export function DecisionMatches({ self, ranking, criteria }: { self: RankedSoftware; ranking: RankedSoftware[]; criteria: Criterion[] }) {
  const others = ranking.filter((r) => r.software.id !== self.software.id)
    .sort((a, b) => Math.abs(a.overall - self.overall) - Math.abs(b.overall - self.overall) || a.rank - b.rank)
    .slice(0, 5);
  if (!others.length) return null;
  const ahead = (x: RankedSoftware, y: RankedSoftware) => criteria.filter((c) => (x.criteria[c.key] ?? 0) > (y.criteria[c.key] ?? 0)).map((c) => c.label.toLowerCase());
  const duel = (a: string, b: string) => `/comparer/${[a, b].sort().join("-vs-")}`;
  return (
    <section aria-labelledby="matchs" className="my-10">
      <H2 id="matchs" kicker="Face à face">{`${others.length} match${others.length > 1 ? "s" : ""} avec ${self.software.name}`}</H2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((o) => {
          const win = ahead(self, o), lose = ahead(o, self);
          return (
            <li key={o.software.id}>
              <Link href={duel(self.software.slug, o.software.slug)} className="flex flex-col gap-3 h-full p-5 rounded-2xl bg-white border border-line shadow-sm hover:border-ink">
                <span className="text-xs font-semibold text-ink-3">Même catégorie · {Math.abs(o.overall - self.overall) < 0.05 ? "même note" : `écart de ${fmt(Math.abs(o.overall - self.overall))} point${Math.abs(o.overall - self.overall) >= 2 ? "s" : ""}`}</span>
                <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span><strong className="block">{self.software.name}</strong><span className="font-display font-extrabold text-2xl">{fmt(self.overall)}</span></span>
                  <span className="rounded-md bg-accent px-2 py-1 text-xs font-extrabold">VS</span>
                  <span className="text-right"><strong className="block">{o.software.name}</strong><span className="font-display font-extrabold text-2xl">{fmt(o.overall)}</span></span>
                </span>
                <span className="text-sm text-ink-2 flex flex-col gap-1">
                  {win.length > 0 && <span><strong className="text-ink">{self.software.name}</strong> devant sur : {win.join(", ")}</span>}
                  {lose.length > 0 && <span><strong className="text-ink">{o.software.name}</strong> devant sur : {lose.join(", ")}</span>}
                </span>
                <span className="mt-auto text-sm font-bold underline">Voir le match détaillé →</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-3">Notes de la rédaction sur 10, même protocole pour toutes les solutions. Aucun match n’est sponsorisé.</p>
    </section>
  );
}
