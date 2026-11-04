"use client";

import { useActionState } from "react";
import {
  submitErrorReport, submitListingRequest, submitPlacementRequest, submitResourceLead, type FormState,
} from "@/lib/actions/public";
import { trackEvent } from "./Tracker";

const initial: FormState = { ok: false, message: "" };
const input = "w-full rounded-lg border border-line px-3 py-2 bg-white focus:outline-2 focus:outline-brand";

function Field({ label, name, error, required, children }: { label: string; name: string; error?: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}{required && <span aria-hidden className="text-red-700"> *</span>}</span>
      <span className="block mt-1">{children ?? <input name={name} required={required} className={input} />}</span>
      {error && <span className="text-red-700 text-xs">{error}</span>}
    </label>
  );
}

function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px]" >
      <label>Ne pas remplir<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
    </div>
  );
}

function Consent({ error }: { error?: string }) {
  return (
    <label className="flex gap-2 text-sm items-start">
      <input type="checkbox" name="consent" required className="mt-1" />
      <span>J&apos;accepte que mes données soient utilisées pour traiter ma demande, conformément à la <a href="/donnees-personnelles" className="underline">politique de données personnelles</a>.{error && <span className="block text-red-700 text-xs">{error}</span>}</span>
    </label>
  );
}

function Result({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p role="status" className={`rounded-lg p-3 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{state.message}</p>;
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return <button disabled={pending} className="rounded-lg bg-brand text-white font-semibold px-5 py-2.5 disabled:opacity-60">{pending ? "Envoi…" : label}</button>;
}

export function ListingForm({ site, kind, categories }: { site: string; kind: "software" | "provider"; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(async (s: FormState, fd: FormData) => {
    const r = await submitListingRequest(s, fd);
    if (r.ok) trackEvent(site, "form_submit", { props: { form: "listing", kind } });
    return r;
  }, initial);
  if (state.ok) return <Result state={state} />;
  const e = state.errors ?? {};
  return (
    <form action={action} className="relative space-y-4 max-w-xl">
      <input type="hidden" name="site" value={site} /><input type="hidden" name="kind" value={kind} /><Honeypot />
      <Field label={kind === "software" ? "Éditeur (raison sociale)" : "Nom du cabinet"} name="company_name" required error={e.company_name} />
      {kind === "software" && <Field label="Nom du logiciel" name="product_name" error={e.product_name} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Site web" name="website" required error={e.website} />
        <Field label="SIREN" name="siren" error={e.siren} />
      </div>
      <Field label="Catégorie" name="category_id" error={e.category_id}>
        <select name="category_id" className={input} defaultValue="">
          <option value="">— Choisir —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {kind === "provider" && <Field label="Ville" name="city" error={e.city} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Votre nom" name="contact_name" required error={e.contact_name} />
        <Field label="Fonction" name="contact_role" error={e.contact_role} />
      </div>
      <Field label="E-mail professionnel (sur le domaine de votre site)" name="contact_email" required error={e.contact_email}>
        <input type="email" name="contact_email" required className={input} />
      </Field>
      <Field label="Présentation (facultatif)" name="message" error={e.message}><textarea name="message" rows={4} className={input} /></Field>
      <Consent error={e.consent} />
      <Result state={state} />
      <Submit pending={pending} label="Envoyer ma demande" />
    </form>
  );
}

const PLACEMENT_LABELS: Record<string, string> = {
  category_sponsored: "Position sponsorisée sur un comparatif", enhanced_listing: "Fiche enrichie", guide_banner: "Encart dans les guides",
  newsletter: "Newsletter", simulator_sponsor: "Sponsoring d'un simulateur", directory_featured: "Mise en avant dans l'annuaire",
};

export function PlacementForm({ site, categories, types }: { site: string; categories: { id: string; name: string }[]; types: string[] }) {
  const [state, action, pending] = useActionState(async (s: FormState, fd: FormData) => {
    const r = await submitPlacementRequest(s, fd);
    if (r.ok) trackEvent(site, "form_submit", { props: { form: "placement" } });
    return r;
  }, initial);
  if (state.ok) return <Result state={state} />;
  const e = state.errors ?? {};
  return (
    <form action={action} className="relative space-y-4 max-w-xl">
      <input type="hidden" name="site" value={site} /><Honeypot />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Société" name="advertiser_name" required error={e.advertiser_name} />
        <Field label="Site web" name="website" error={e.website} />
        <Field label="Votre nom" name="contact_name" required error={e.contact_name} />
        <Field label="Téléphone" name="contact_phone" error={e.contact_phone} />
      </div>
      <Field label="E-mail" name="contact_email" required error={e.contact_email}><input type="email" name="contact_email" required className={input} /></Field>
      <fieldset className="text-sm">
        <legend className="font-medium mb-1">Emplacements souhaités</legend>
        <div className="grid sm:grid-cols-2 gap-1">
          {types.map((t) => <label key={t} className="flex gap-2"><input type="checkbox" name="placement_types[]" value={t} />{PLACEMENT_LABELS[t] ?? t}</label>)}
        </div>
      </fieldset>
      {categories.length > 0 && (
        <fieldset className="text-sm">
          <legend className="font-medium mb-1">Catégories visées</legend>
          <div className="grid sm:grid-cols-2 gap-1">
            {categories.map((c) => <label key={c.id} className="flex gap-2"><input type="checkbox" name="category_ids[]" value={c.id} />{c.name}</label>)}
          </div>
        </fieldset>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Début" name="period_start"><input type="date" name="period_start" className={input} /></Field>
        <Field label="Fin" name="period_end"><input type="date" name="period_end" className={input} /></Field>
        <Field label="Budget mensuel" name="budget_range">
          <select name="budget_range" className={input} defaultValue="">
            <option value="">—</option><option>&lt; 500 € / mois</option><option>500 – 1 000 € / mois</option><option>1 000 – 3 000 € / mois</option><option>&gt; 3 000 € / mois</option>
          </select>
        </Field>
      </div>
      <Field label="Message" name="message"><textarea name="message" rows={4} className={input} /></Field>
      <Consent error={e.consent} />
      <Result state={state} />
      <Submit pending={pending} label="Demander une proposition" />
    </form>
  );
}

export function ResourceForm({ site, resourceId, path }: { site: string; resourceId: string; path: string }) {
  const [state, action, pending] = useActionState(async (s: FormState, fd: FormData) => {
    const r = await submitResourceLead(s, fd);
    if (r.ok) trackEvent(site, "resource_download", { entityId: resourceId });
    return r;
  }, initial);
  if (state.ok) {
    return (
      <div className="space-y-3"><Result state={state} />
        {state.download && <a href={state.download} className="inline-block rounded-lg bg-brand text-white font-semibold px-5 py-2.5" download>Télécharger le fichier</a>}
      </div>
    );
  }
  const e = state.errors ?? {};
  return (
    <form action={action} className="relative space-y-3 rounded-xl border border-line p-5 my-6 max-w-xl">
      <p className="font-semibold">Recevoir le modèle</p>
      <input type="hidden" name="site" value={site} /><input type="hidden" name="resource_id" value={resourceId} /><input type="hidden" name="origin_path" value={path} /><Honeypot />
      <Field label="E-mail professionnel" name="email" required error={e.email}><input type="email" name="email" required className={input} /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Taille d'entreprise" name="company_size">
          <select name="company_size" className={input} defaultValue=""><option value="">—</option><option>1-9</option><option>10-49</option><option>50-249</option><option>250+</option></select>
        </Field>
        <Field label="Fonction" name="job_title" />
      </div>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="consent_newsletter" /> Je souhaite recevoir la newsletter (facultatif)</label>
      <Consent error={e.consent} />
      <Result state={state} />
      <Submit pending={pending} label="Télécharger gratuitement" />
    </form>
  );
}

export function ErrorReportForm({ site, page }: { site: string; page: string }) {
  const [state, action, pending] = useActionState(submitErrorReport, initial);
  if (state.ok) return <Result state={state} />;
  const e = state.errors ?? {};
  return (
    <form action={action} className="relative space-y-4 max-w-xl">
      <input type="hidden" name="site" value={site} /><Honeypot />
      <Field label="Page concernée" name="page_path" required error={e.page_path}><input name="page_path" defaultValue={page} required className={input} /></Field>
      <Field label="Type de demande" name="kind">
        <select name="kind" className={input}><option value="error">Signaler une erreur</option><option value="right_of_reply">Droit de réponse (éditeur, cabinet)</option></select>
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom" name="reporter_name" />
        <Field label="E-mail" name="reporter_email" required error={e.reporter_email}><input type="email" name="reporter_email" required className={input} /></Field>
      </div>
      <Field label="Message" name="message" required error={e.message}><textarea name="message" rows={5} required className={input} /></Field>
      <Field label="Source à l'appui (URL)" name="source_url" />
      <Consent error={e.consent} />
      <Result state={state} />
      <Submit pending={pending} label="Envoyer" />
    </form>
  );
}
