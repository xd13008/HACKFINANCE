"use client";

import { useActionState } from "react";
import { requestLogin, signupMember, type MemberState } from "@/lib/actions/member";

const initial: MemberState = { ok: false, message: "" };
export const inputCls = "w-full rounded-lg border border-line px-3 py-2 bg-white focus:outline-2 focus:outline-brand";

function Result({ state }: { state: MemberState }) {
  if (!state.message) return null;
  return <p role="status" className={`rounded-lg p-3 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{state.message}</p>;
}
function Honeypot() {
  return <div aria-hidden className="absolute -left-[9999px]"><label>Ne pas remplir<input name="company_url" tabIndex={-1} autoComplete="off" /></label></div>;
}
function Err({ e }: { e?: string }) {
  return e ? <span className="text-red-700 text-xs">{e}</span> : null;
}

export function SignupForm({ site, consent, sizes, from }: { site: string; consent: string; sizes: readonly (readonly [string, string])[]; from?: string }) {
  const [state, action, pending] = useActionState(signupMember, initial);
  if (state.ok) return <Result state={state} />;
  const e = state.errors ?? {};
  return (
    <form action={action} className="relative space-y-4 max-w-xl">
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="source_path" value={from ?? ""} />
      <Honeypot />
      <label className="block text-sm"><span className="font-medium">E-mail professionnel <span aria-hidden className="text-red-700">*</span></span>
        <input name="email" type="email" required autoComplete="email" className={`${inputCls} mt-1`} /><Err e={e.email} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm"><span className="font-medium">Prénom</span><input name="first_name" autoComplete="given-name" className={`${inputCls} mt-1`} /></label>
        <label className="block text-sm"><span className="font-medium">Fonction</span><input name="job_title" placeholder="DAF, RAF, contrôleur de gestion…" className={`${inputCls} mt-1`} /></label>
        <label className="block text-sm"><span className="font-medium">Entreprise</span><input name="company_name" autoComplete="organization" className={`${inputCls} mt-1`} /></label>
        <label className="block text-sm"><span className="font-medium">Taille</span>
          <select name="company_size" defaultValue="" className={`${inputCls} mt-1`}>
            <option value="">—</option>{sizes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label className="block text-sm sm:col-span-2"><span className="font-medium">Secteur d&apos;activité</span><input name="sector" className={`${inputCls} mt-1`} /></label>
      </div>
      <label className="flex gap-2 text-sm items-start">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>{consent} <a href="/donnees-personnelles" className="underline">Politique de données personnelles</a>.<Err e={e.consent} /></span>
      </label>
      <label className="flex gap-2 text-sm items-start">
        <input type="checkbox" name="consent_newsletter" className="mt-1" />
        <span>Je souhaite recevoir la newsletter (facultatif, désinscription en un clic).</span>
      </label>
      <Result state={state} />
      <button disabled={pending} className="rounded-lg bg-brand text-white font-semibold px-5 py-2.5 disabled:opacity-60">{pending ? "Envoi…" : "Créer mon compte"}</button>
    </form>
  );
}

export function LoginForm({ site }: { site: string }) {
  const [state, action, pending] = useActionState(requestLogin, initial);
  if (state.ok) return <Result state={state} />;
  return (
    <form action={action} className="relative space-y-4 max-w-md">
      <input type="hidden" name="site" value={site} /><Honeypot />
      <label className="block text-sm"><span className="font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className={`${inputCls} mt-1`} /></label>
      <Result state={state} />
      <button disabled={pending} className="rounded-lg bg-brand text-white font-semibold px-5 py-2.5 disabled:opacity-60">{pending ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
    </form>
  );
}

/** Formulaire de « Mon espace » relié à une server action, avec message de résultat. */
export function MemberAction({ action, site, submit, children, className = "space-y-3", tone = "primary", confirm }: {
  action: (s: MemberState, fd: FormData) => Promise<MemberState>; site: string; submit: string; children?: React.ReactNode;
  className?: string; tone?: "primary" | "ghost" | "danger"; confirm?: string;
}) {
  const [state, run, pending] = useActionState(action, initial);
  const cls = tone === "danger" ? "bg-red-700 text-white" : tone === "ghost" ? "border border-line bg-white" : "bg-brand text-white";
  return (
    <form action={run} className={className} onSubmit={(ev) => { if (confirm && !window.confirm(confirm)) ev.preventDefault(); }}>
      <input type="hidden" name="site" value={site} />
      {children}
      <div className="flex items-center gap-3 flex-wrap">
        <button disabled={pending} className={`rounded-lg text-sm font-semibold px-4 py-2 disabled:opacity-60 ${cls}`}>{pending ? "…" : submit}</button>
        {state.message && <span role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
