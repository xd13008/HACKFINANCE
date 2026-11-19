"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitContactRequest, type ContactState } from "@/lib/actions/contact";
import { CONTACT_CONSENT, CONTACT_FEEDBACK, CONTACT_NEWSLETTER } from "@/lib/consents";

export type LeadCategory = { slug: string; name: string; tools: { slug: string; name: string; vendor: string; note: string }[] };

/** Maquette, écran 4 : formulaire de mise en relation. Aucune case cochée par défaut ; transmission aux seules solutions cochées. */
export function LeadForm({ site, categories, initialCategory, highlight, origin }: { site: string; categories: LeadCategory[]; initialCategory: string; highlight: string | null; origin: string }) {
  const [cat, setCat] = useState(initialCategory || categories[0]?.slug || "");
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContactRequest, { ok: false, message: "" });
  const current = categories.find((c) => c.slug === cat);
  const tools = [...(current?.tools ?? [])].sort((a, b) => Number(b.slug === highlight) - Number(a.slug === highlight));
  const err = (k: string) => state.errors?.[k] && <span className="text-sm font-normal text-red-800">{state.errors[k]}</span>;
  const input = "min-h-11 rounded-lg border border-line bg-white px-3 font-normal";
  if (state.ok) return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-6">
      <h2 className="m-0 font-display font-extrabold text-3xl">Demande enregistrée</h2>
      <p className="m-0 text-ink-2">{state.message}</p>
      <Link href="/" className="self-start underline">Retour à l&apos;accueil</Link>
    </div>
  );
  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="site" value={site} /><input type="hidden" name="origin" value={origin} />
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <fieldset className="border-0 p-0 m-0 grid gap-4 sm:grid-cols-2">
        <legend className="text-xl font-extrabold mb-3">Votre besoin</legend>
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">Besoin
          <select name="category" value={cat} onChange={(e) => setCat(e.target.value)} className={input}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>{err("category")}</label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Taille de l&apos;entreprise
          <select name="company_size" defaultValue="" required className={input}><option value="" disabled>Choisir</option><option value="tpe">Moins de 10 salariés</option><option value="pme1">10 à 49 salariés</option><option value="pme2">50 à 249 salariés</option><option value="eti">250 salariés et plus</option></select>{err("company_size")}</label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Délai de décision
          <select name="timing" defaultValue="" className={input}><option value="">Non précisé</option><option value="immediat">Moins de 3 mois</option><option value="3-mois">3 à 6 mois</option><option value="6-mois">Plus de 6 mois</option><option value="information">Je me renseigne</option></select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Budget mensuel envisagé
          <select name="budget" defaultValue="" className={input}><option value="">Non précisé</option><option value="moins-100">Moins de 100 € HT</option><option value="100-250">100 à 250 € HT</option><option value="250-500">250 à 500 € HT</option><option value="plus-500">Plus de 500 € HT</option><option value="inconnu">Je ne sais pas</option></select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">Précisez si besoin (optionnel)<textarea name="details" maxLength={1500} rows={3} className={`${input} py-2`} /></label>
      </fieldset>
      <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
        <legend className="text-xl font-extrabold mb-3">À qui transmettre votre demande ?</legend>
        {tools.length === 0 ? <p className="m-0 text-ink-2">Aucune solution n&apos;est encore référencée pour ce besoin.</p> : tools.map((t) => (
          <label key={t.slug} className={`flex items-start gap-3 rounded-2xl border p-3.5 ${t.slug === highlight ? "border-ink bg-white" : "border-line bg-white"}`}>
            <input type="checkbox" name="targets[]" value={t.slug} className="size-[18px] mt-0.5 accent-ink" />
            <span><strong>{t.name}</strong>{t.vendor && t.vendor !== t.name ? ` — ${t.vendor}` : ""}<span className="block text-sm text-ink-3">{t.note}</span></span>
          </label>
        ))}
        <p className="m-0 text-sm text-ink-3">Aucune case n&apos;est cochée par défaut. Vous pouvez ne choisir qu&apos;une solution (5 au plus).</p>{err("targets")}
      </fieldset>
      <fieldset className="border-0 p-0 m-0 grid gap-4 sm:grid-cols-2">
        <legend className="text-xl font-extrabold mb-3">Vos coordonnées professionnelles</legend>
        <label className="flex flex-col gap-1 text-sm font-semibold">Prénom et nom<input name="contact_name" required maxLength={120} autoComplete="name" className={input} />{err("contact_name")}</label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Fonction<input name="job_title" maxLength={120} autoComplete="organization-title" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">E-mail professionnel<input name="email" type="email" required maxLength={200} autoComplete="email" className={input} />{err("email")}</label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Téléphone (optionnel)<input name="phone" type="tel" maxLength={25} autoComplete="tel" className={input} />{err("phone")}</label>
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">Entreprise<input name="company" required maxLength={200} autoComplete="organization" className={input} />{err("company")}</label>
      </fieldset>
      <fieldset className="border-0 p-0 m-0 flex flex-col gap-3">
        <legend className="text-xl font-extrabold mb-3">Votre accord</legend>
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="consent" required className="size-[18px] mt-0.5 accent-ink" /><span><strong>Obligatoire.</strong> {CONTACT_CONSENT}</span></label>{err("consent")}
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="newsletter" className="size-[18px] mt-0.5 accent-ink" /><span><strong>Optionnel.</strong> {CONTACT_NEWSLETTER} Désinscription en un clic.</span></label>
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="feedback" className="size-[18px] mt-0.5 accent-ink" /><span><strong>Optionnel.</strong> {CONTACT_FEEDBACK}</span></label>
        <details className="text-sm"><summary className="cursor-pointer underline">Ce que nous faisons de vos données</summary>
          <p className="mt-2 text-ink-2">Finalité : transmettre votre demande aux solutions choisies. Base légale : votre consentement, retirable à tout moment. Destinataires : les seules solutions cochées,
            listées dans l&apos;e-mail de confirmation ; chacune devient responsable de traitement pour sa propre relation commerciale. Conservation : 3 ans. Droits : accès, rectification,
            effacement et retrait du consentement, voir <Link href="/donnees-personnelles" className="underline">Données personnelles</Link> ; réclamation possible auprès de la CNIL.</p></details>
      </fieldset>
      {!state.ok && state.message && <p role="alert" className="m-0 text-sm text-red-800">{state.message}</p>}
      <button type="submit" disabled={pending} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold disabled:opacity-60">{pending ? "Envoi…" : "Envoyer ma demande aux solutions choisies"}</button>
      <p className="m-0 text-xs text-ink-3">Les demandes de crédit, d&apos;affacturage, d&apos;assurance ou de placement ne sont pas proposées sur ce site : ces sujets sont traités en information générale uniquement.</p>
    </form>
  );
}
