"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSite } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/service";
import { brevoMailer } from "@/lib/mail";
import { NEWSLETTER_CONSENT as NEWSLETTER, signupConsent } from "@/lib/member-text";
import {
  closeSession, currentMember, issueToken, HORIZONS, RELATIONS, SESSION_COOKIE, SIZES, TEAM_SIZES,
} from "@/lib/members";

export type MemberState = { ok: boolean; message: string; errors?: Record<string, string> };

const SENT = "C'est envoyé. Ouvrez l'e-mail que nous venons de vous adresser et cliquez sur le lien (valable 30 minutes pour une connexion, 7 jours pour une inscription).";

const email = z.string().trim().toLowerCase().email("E-mail invalide").max(254);
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const sizeKeys = SIZES.map(([k]) => k) as [string, ...string[]];

function fail(err: z.ZodError): MemberState {
  const errors: Record<string, string> = {};
  for (const i of err.issues) errors[String(i.path[0])] = i.message;
  return { ok: false, message: "Merci de corriger les champs signalés.", errors };
}
const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));

async function origin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function siteOf(fd: FormData) {
  if (String(fd.get("company_url") ?? "")) return null;   // pot de miel
  return getSite(String(fd.get("site") ?? ""));
}

async function sendLink(memberId: string, to: string, kind: "confirm" | "login", siteName: string) {
  const { token } = await issueToken(memberId, kind);
  const path = kind === "confirm" ? "/inscription/confirmer" : "/connexion/lien";
  const url = `${await origin()}${path}?t=${token}`;
  return brevoMailer({
    to,
    subject: kind === "confirm" ? `Confirmez votre inscription à ${siteName}` : `Votre lien de connexion à ${siteName}`,
    text: kind === "confirm"
      ? `Bonjour,\n\nPour activer votre compte ${siteName}, cliquez sur ce lien (valable 7 jours) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : aucun compte ne sera créé.\n`
      : `Bonjour,\n\nPour vous connecter à ${siteName}, cliquez sur ce lien (valable 30 minutes) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n`,
  });
}

// ---------------------------------------------------------------------------
const signupSchema = z.object({
  email,
  first_name: opt(80),
  job_title: opt(100),
  company_name: opt(200),
  company_size: z.enum(sizeKeys).optional().or(z.literal("")).transform((v) => v || null),
  sector: opt(100),
  consent: z.literal("on", { error: "Votre accord est nécessaire pour créer le compte" }),
  consent_newsletter: z.string().optional().transform((v) => v === "on"),
  source_path: opt(300),
});

/** Inscription : compte en attente, e-mail de confirmation (double validation). Ne révèle jamais si l'e-mail existe déjà. */
export async function signupMember(_: MemberState, fd: FormData): Promise<MemberState> {
  const site = await siteOf(fd);
  if (!site) return { ok: true, message: SENT };
  const parsed = signupSchema.safeParse(obj(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const db = serviceClient();
  const { data: existing } = await db.from("members").select("id,status").eq("site_id", site.id).eq("email", d.email).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const now = new Date().toISOString();
    const { data, error } = await db.from("members").insert({
      site_id: site.id, email: d.email, first_name: d.first_name, job_title: d.job_title, company_name: d.company_name,
      company_size: d.company_size, sector: d.sector, consent_newsletter: d.consent_newsletter,
      newsletter_consent_at: d.consent_newsletter ? now : null,
      consent_text: signupConsent(site.name) + (d.consent_newsletter ? NEWSLETTER : ""), consent_at: now, source_path: d.source_path,
    }).select("id").single();
    if (error) return { ok: false, message: "Inscription impossible pour le moment. Réessayez dans quelques minutes." };
    id = data.id;
  }
  const sent = await sendLink(id, d.email, existing && existing.status !== "pending" ? "login" : "confirm", site.name);
  return sent.ok ? { ok: true, message: SENT } : { ok: false, message: "L'e-mail n'a pas pu être envoyé. Réessayez plus tard." };
}

/** Lien de connexion par e-mail (sans mot de passe). Même réponse que l'e-mail soit connu ou non. */
export async function requestLogin(_: MemberState, fd: FormData): Promise<MemberState> {
  const site = await siteOf(fd);
  if (!site) return { ok: true, message: SENT };
  const parsed = email.safeParse(String(fd.get("email") ?? ""));
  if (!parsed.success) return { ok: false, message: "E-mail invalide.", errors: { email: "E-mail invalide" } };
  const { data: m } = await serviceClient().from("members").select("id,status").eq("site_id", site.id).eq("email", parsed.data).maybeSingle();
  if (m) {
    const sent = await sendLink(m.id, parsed.data, m.status === "pending" ? "confirm" : "login", site.name);
    if (!sent.ok) return { ok: false, message: "L'e-mail n'a pas pu être envoyé. Réessayez plus tard." };
  }
  return { ok: true, message: SENT };
}

// ---------------------------------------------------------------------------
async function me(fd: FormData) {
  const site = await getSite(String(fd.get("site") ?? ""));
  const m = site ? await currentMember(site.id) : null;
  return m ? { site: site!, m } : null;
}
const SESSION_LOST: MemberState = { ok: false, message: "Votre session a expiré. Reconnectez-vous." };

const profileSchema = z.object({
  first_name: opt(80), job_title: opt(100), company_name: opt(200),
  company_size: z.enum(sizeKeys).optional().or(z.literal("")).transform((v) => v || null),
  sector: opt(100), region: opt(100),
  finance_team_size: z.enum(TEAM_SIZES).optional().or(z.literal("")).transform((v) => v || null),
  erp: opt(100), notes: opt(2000),
});

export async function updateProfile(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  const parsed = profileSchema.safeParse(obj(fd));
  if (!parsed.success) return fail(parsed.error);
  const { error } = await serviceClient().from("members").update({ ...parsed.data, last_seen_at: new Date().toISOString() }).eq("id", ctx.m.id);
  revalidatePath("/s/[site]/mon-espace", "page");
  return error ? { ok: false, message: "Enregistrement impossible." } : { ok: true, message: "Profil enregistré." };
}

const softwareSchema = z.object({
  software_name: z.string().trim().min(1, "Nom requis").max(120),
  relation: z.enum(RELATIONS.map(([k]) => k) as [string, ...string[]]),
  satisfaction: z.string().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().min(1).max(5).nullable()),
});

export async function saveSoftware(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  const parsed = softwareSchema.safeParse(obj(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const db = serviceClient();
  const { data: known } = await db.from("software").select("id,name").ilike("name", d.software_name.replace(/[%_]/g, "")).eq("is_fictional", false).limit(1).maybeSingle();
  const name = known?.name ?? d.software_name;
  const { data: mine } = await db.from("member_software").select("id,software_name").eq("member_id", ctx.m.id);
  const row = (mine ?? []).find((r) => r.software_name.toLowerCase() === name.toLowerCase());
  const values = { relation: d.relation, satisfaction: d.satisfaction, source: "declared", software_id: known?.id ?? null };
  const { error } = row
    ? await db.from("member_software").update(values).eq("id", row.id)
    : await db.from("member_software").insert({ member_id: ctx.m.id, software_name: name, ...values });
  revalidatePath("/s/[site]/mon-espace", "page");
  return error ? { ok: false, message: "Enregistrement impossible." } : { ok: true, message: `${name} enregistré.` };
}

export async function removeSoftware(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  await serviceClient().from("member_software").delete().eq("id", String(fd.get("id"))).eq("member_id", ctx.m.id);
  revalidatePath("/s/[site]/mon-espace", "page");
  return { ok: true, message: "Retiré." };
}

export async function saveProject(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  const parsed = z.object({
    category_id: z.string().uuid("Choisissez une rubrique"),
    horizon: z.enum(HORIZONS.map(([k]) => k) as [string, ...string[]]),
  }).safeParse(obj(fd));
  if (!parsed.success) return fail(parsed.error);
  const { error } = await serviceClient().from("member_projects")
    .upsert({ member_id: ctx.m.id, ...parsed.data }, { onConflict: "member_id,category_id" });
  revalidatePath("/s/[site]/mon-espace", "page");
  return error ? { ok: false, message: "Enregistrement impossible." } : { ok: true, message: "Projet enregistré." };
}

export async function removeProject(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  await serviceClient().from("member_projects").delete().eq("member_id", ctx.m.id).eq("category_id", String(fd.get("category_id")));
  revalidatePath("/s/[site]/mon-espace", "page");
  return { ok: true, message: "Retiré." };
}

export async function setNewsletter(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  const on = fd.get("on") === "1";
  await serviceClient().from("members").update({
    consent_newsletter: on, newsletter_consent_at: on ? new Date().toISOString() : null,
    consent_text: signupConsent(ctx.site.name) + (on ? NEWSLETTER : ""),
  }).eq("id", ctx.m.id);
  revalidatePath("/s/[site]/mon-espace", "page");
  return { ok: true, message: on ? "Newsletter activée." : "Vous ne recevrez plus la newsletter." };
}

export async function logoutMember() {
  await closeSession();
  redirect("/");
}

/** Droit à l'effacement : suppression immédiate du compte, du profil, des recherches et de la navigation rattachée. */
export async function deleteAccount(_: MemberState, fd: FormData): Promise<MemberState> {
  const ctx = await me(fd);
  if (!ctx) return SESSION_LOST;
  if (fd.get("confirm") !== "on") return { ok: false, message: "Cochez la case pour confirmer la suppression." };
  const { error } = await serviceClient().from("members").delete().eq("id", ctx.m.id);
  if (error) return { ok: false, message: "Suppression impossible. Écrivez-nous via « Signaler une erreur »." };
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/?compte=supprime");
}
