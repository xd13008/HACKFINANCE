"use client";

import { useActionState } from "react";
import { createJobPosting, type JobState } from "@/lib/actions/jobs";
import { CONTRACTS, REMOTES } from "@/lib/jobs";

const input = "w-full rounded-lg border border-line px-3 py-2 bg-white focus:outline-2 focus:outline-brand mt-1";
const initial: JobState = { ok: false, message: "" };

export function JobForm({ site, products }: { site: string; products: { code: string; label: string; description: string | null; amount_cents: number }[] }) {
  const [state, action, pending] = useActionState(createJobPosting, initial);
  const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="site" value={site} />
      <fieldset className="grid sm:grid-cols-2 gap-3">
        <legend className="font-bold mb-2">Formule</legend>
        {products.map((p, i) => (
          <label key={p.code} className="flex gap-3 rounded-xl border border-line bg-white p-4 cursor-pointer has-[:checked]:border-ink">
            <input type="radio" name="product" value={p.code} defaultChecked={i === 0} className="mt-1" />
            <span><strong>{p.label}</strong> · {eur(p.amount_cents)} HT<span className="block text-sm text-ink-2">{p.description}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm sm:col-span-2 font-medium">Intitulé du poste (avec « H/F »)<input name="title" required maxLength={120} placeholder="Contrôleur de gestion H/F" className={input} /></label>
        <label className="text-sm font-medium">Entreprise qui recrute<input name="company_name" required className={input} /></label>
        <label className="text-sm font-medium">SIREN de l&apos;entreprise<input name="company_siren" required inputMode="numeric" placeholder="9 chiffres" className={input} /></label>
        <label className="text-sm font-medium">Ville<input name="city" required className={input} /></label>
        <label className="text-sm font-medium">Code postal<input name="postal_code" required inputMode="numeric" className={input} /></label>
        <label className="text-sm font-medium">Contrat<select name="contract" className={input}>{CONTRACTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-sm font-medium">Télétravail<select name="remote" className={input}>{REMOTES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-sm font-medium">Expérience demandée<input name="experience" placeholder="ex. 3 ans minimum" className={input} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-medium">Salaire annuel min. (€)<input name="salary_min" inputMode="numeric" className={input} /></label>
          <label className="text-sm font-medium">max. (€)<input name="salary_max" inputMode="numeric" className={input} /></label>
        </div>
        <label className="text-sm sm:col-span-2 font-medium">Description : missions, profil, conditions (300 caractères minimum)
          <textarea name="description" required rows={12} maxLength={10000} className={input} /></label>
        <label className="text-sm font-medium">Lien de candidature<input name="apply_url" type="url" placeholder="https://" className={input} /></label>
        <label className="text-sm font-medium">ou e-mail de candidature<input name="apply_email" type="email" className={input} /></label>
      </div>
      <label className="flex gap-2 text-sm items-start">
        <input type="checkbox" name="certify" required className="mt-1" />
        <span>Je certifie que ce poste est réel et ouvert, que l&apos;offre respecte le Code du travail (aucun critère discriminatoire, aucune limite d&apos;âge, rédaction en français) et que je suis habilité à la publier. L&apos;annonce est relue avant publication ; une annonce refusée est remboursée.</span>
      </label>
      {state.message && (
        <div role="status" className={`rounded-lg p-3 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
          <p className="font-semibold">{state.message}</p>
          {state.errors?.length ? <ul className="list-disc pl-5 mt-1">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
          {state.warnings?.length ? <ul className="list-disc pl-5 mt-1 text-amber-900">{state.warnings.map((e) => <li key={e}>{e}</li>)}</ul> : null}
        </div>
      )}
      <button disabled={pending} className="rounded-lg bg-brand text-white font-semibold px-5 py-2.5 disabled:opacity-60">{pending ? "…" : "Continuer vers le paiement"}</button>
    </form>
  );
}
