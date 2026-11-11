import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MemberAction, inputCls } from "@/components/public/MemberForms";
import { CookieSettingsLink } from "@/components/public/CookieBanner";
import {
  deleteAccount, logoutMember, removeProject, removeSoftware, saveProject, saveSoftware, setNewsletter, updateProfile,
} from "@/lib/actions/member";
import { CONSENT_COOKIE, currentMember, HORIZONS, memberData, personalisationAccepted, RELATIONS, SIZES, TEAM_SIZES } from "@/lib/members";
import { serviceClient } from "@/lib/supabase/service";
import { requireSite, type SiteParams } from "../_lib";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false, follow: false } };

const label = <T extends readonly (readonly [string, string])[]>(list: T, k: string | null) => list.find(([v]) => v === k)?.[1] ?? k ?? "—";
const date = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {intro && <p className="text-sm text-ink-2">{intro}</p>}
      {children}
    </section>
  );
}

export default async function MySpace({ params, searchParams }: { params: SiteParams; searchParams: Promise<{ bienvenue?: string }> }) {
  const site = await requireSite((await params).site);
  const m = await currentMember(site.id);
  if (!m) redirect("/connexion");
  const welcome = (await searchParams).bienvenue === "1";
  const perso = personalisationAccepted((await cookies()).get(CONSENT_COOKIE)?.value);
  const data = await memberData(m.id);
  const db = serviceClient();
  const [{ data: cats }, { data: names }] = await Promise.all([
    db.from("categories").select("id,name,slug,kind").eq("site_id", site.id).neq("status", "archived").order("name"),
    db.from("software").select("name").eq("is_fictional", false).order("name").limit(1000),
  ]);
  const s = site.key;
  const catName = (slug: string | null) => (cats ?? []).find((c) => c.slug === slug)?.name ?? slug ?? "—";
  const sizeName = (k: string | null) => SIZES.find(([v]) => v === k)?.[1] ?? k;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Mon espace</h1>
          <p className="text-ink-2">{m.email}{m.first_name ? ` · ${m.first_name}` : ""}</p>
        </div>
        <form action={logoutMember}><button className="text-sm underline">Se déconnecter</button></form>
      </div>
      {welcome && <p role="status" className="rounded-lg p-3 bg-green-50 text-green-900">Compte activé. Complétez votre profil pour recevoir des sélections adaptées.</p>}

      <Section title="Mon profil" intro="Ces informations servent à adapter les sélections et la newsletter. Elles ne sont ni vendues ni transmises.">
        <MemberAction action={updateProfile} site={s} submit="Enregistrer mon profil" className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">Prénom<input name="first_name" defaultValue={m.first_name ?? ""} className={inputCls} /></label>
          <label className="text-sm">Fonction<input name="job_title" defaultValue={m.job_title ?? ""} className={inputCls} /></label>
          <label className="text-sm">Entreprise<input name="company_name" defaultValue={m.company_name ?? ""} className={inputCls} /></label>
          <label className="text-sm">Taille
            <select name="company_size" defaultValue={m.company_size ?? ""} className={inputCls}>
              <option value="">—</option>{SIZES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          <label className="text-sm">Secteur<input name="sector" defaultValue={m.sector ?? ""} className={inputCls} /></label>
          <label className="text-sm">Région<input name="region" defaultValue={m.region ?? ""} className={inputCls} /></label>
          <label className="text-sm">Taille de l&apos;équipe finance
            <select name="finance_team_size" defaultValue={m.finance_team_size ?? ""} className={inputCls}>
              <option value="">—</option>{TEAM_SIZES.map((k) => <option key={k} value={k}>{k} personne(s)</option>)}
            </select></label>
          <label className="text-sm">ERP ou logiciel comptable principal<input name="erp" defaultValue={m.erp ?? ""} className={inputCls} /></label>
          <label className="text-sm sm:col-span-2">Vos priorités du moment (facultatif)<textarea name="notes" rows={3} defaultValue={m.notes ?? ""} className={inputCls} /></label>
        </MemberAction>
      </Section>

      <Section title="Mes logiciels" intro="Les outils que vous utilisez, évaluez, connaissez ou avez quittés. Ceux déclarés dans « Trouver » sont ajoutés automatiquement.">
        {data.software.length > 0 && (
          <ul className="divide-y divide-line">
            {data.software.map((x) => (
              <li key={x.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong>{x.software_name}</strong> · {label(RELATIONS, x.relation)}{x.satisfaction ? ` · satisfaction ${x.satisfaction}/5` : ""}
                  {x.source === "search" && <span className="text-ink-3"> · déduit de vos recherches</span>}</span>
                <MemberAction action={removeSoftware} site={s} submit="Retirer" tone="ghost" className="flex gap-2">
                  <input type="hidden" name="id" value={x.id} />
                </MemberAction>
              </li>
            ))}
          </ul>
        )}
        <MemberAction action={saveSoftware} site={s} submit="Ajouter" className="grid sm:grid-cols-4 gap-3 items-end">
          <label className="text-sm sm:col-span-2">Logiciel<input name="software_name" list="sw-names" required className={inputCls} /></label>
          <datalist id="sw-names">{(names ?? []).map((n) => <option key={n.name} value={n.name} />)}</datalist>
          <label className="text-sm">Statut
            <select name="relation" className={inputCls}>{RELATIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-sm">Satisfaction
            <select name="satisfaction" defaultValue="" className={inputCls}><option value="">—</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>
        </MemberAction>
      </Section>

      <Section title="Mes projets" intro="Les sujets sur lesquels vous cherchez une solution, et quand.">
        {data.projects.length > 0 && (
          <ul className="divide-y divide-line">
            {data.projects.map((p) => (
              <li key={p.category_id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong>{(p.categories as { name?: string } | null)?.name}</strong> · {label(HORIZONS, p.horizon)}</span>
                <MemberAction action={removeProject} site={s} submit="Retirer" tone="ghost" className="flex gap-2">
                  <input type="hidden" name="category_id" value={p.category_id} />
                </MemberAction>
              </li>
            ))}
          </ul>
        )}
        <MemberAction action={saveProject} site={s} submit="Ajouter" className="grid sm:grid-cols-3 gap-3 items-end">
          <label className="text-sm sm:col-span-2">Sujet
            <select name="category_id" required defaultValue="" className={inputCls}>
              <option value="" disabled>Choisir…</option>{(cats ?? []).filter((c) => c.kind === "software").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label className="text-sm">Échéance
            <select name="horizon" className={inputCls}>{HORIZONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </MemberAction>
      </Section>

      <Section title="Mes recherches" intro={perso ? "Vos recherches « Trouver » sont enregistrées." : "Pour enregistrer vos recherches, acceptez le cookie de personnalisation."}>
        {!perso && <p className="text-sm"><CookieSettingsLink /></p>}
        {data.searches.length === 0 ? <p className="text-sm text-ink-3">Aucune recherche enregistrée.</p> : (
          <ul className="text-sm divide-y divide-line">
            {data.searches.slice(0, 30).map((x, i) => (
              <li key={i} className="py-2">{date(x.occurred_at)} · <strong>{catName(x.need_slug)}</strong>
                {x.company_size ? ` · ${sizeName(x.company_size)}` : ""}{x.stack.length ? ` · équipé : ${x.stack.join(", ")}` : ""}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ma navigation" intro="Les pages consultées sur ce site, enregistrées seulement avec votre accord (cookie de personnalisation).">
        {data.events.length === 0 ? <p className="text-sm text-ink-3">Aucune page enregistrée.</p> : (
          <ul className="text-sm divide-y divide-line max-h-72 overflow-auto">
            {data.events.slice(0, 100).map((x, i) => (
              <li key={i} className="py-1.5">{date(x.occurred_at)} · {x.event_type === "outbound_click" ? "clic vers un site" : "page"} <Link href={x.path} className="underline">{x.path}</Link></li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Newsletter et données">
        <MemberAction action={setNewsletter} site={s} submit={m.consent_newsletter ? "Me désinscrire de la newsletter" : "Recevoir la newsletter"} tone="ghost" className="flex gap-2">
          <input type="hidden" name="on" value={m.consent_newsletter ? "0" : "1"} />
        </MemberAction>
        <p className="text-sm"><a href="/mon-espace/export" className="underline">Télécharger toutes mes données (JSON)</a> · <CookieSettingsLink /></p>
        <MemberAction action={deleteAccount} site={s} submit="Supprimer mon compte" tone="danger" className="space-y-2"
          confirm="Supprimer définitivement votre compte, votre profil, vos recherches et votre navigation ?">
          <label className="flex gap-2 text-sm"><input type="checkbox" name="confirm" /> Je confirme : tout est effacé immédiatement et définitivement.</label>
        </MemberAction>
      </Section>
    </div>
  );
}
