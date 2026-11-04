"use server";

import { z } from "zod";
import { publicClient } from "@/lib/supabase/public";
import { getSite } from "@/lib/data";
import { listingChecks, normalizeUrl } from "@/lib/checks";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string>; download?: string };

const CONSENT = "J'accepte que mes données soient utilisées pour traiter ma demande, conformément à la politique de données personnelles.";

const email = z.string().trim().toLowerCase().email("E-mail invalide").max(200);
const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

function fail(err: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const i of err.issues) errors[String(i.path[0])] = i.message;
  return { ok: false, message: "Merci de corriger les champs signalés.", errors };
}

function fields(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith("[]")) o[k.slice(0, -2)] = [...((o[k.slice(0, -2)] as string[]) ?? []), String(v)];
    else o[k] = String(v);
  }
  return o;
}

async function context(fd: FormData) {
  // Pot de miel anti-robots : champ invisible qui doit rester vide.
  if (String(fd.get("company_url") ?? "")) return null;
  const site = await getSite(String(fd.get("site") ?? ""));
  return site;
}

const consent = z.literal("on", { error: "Le consentement est requis" });

// ---------------------------------------------------------------------------
const listingSchema = z.object({
  kind: z.enum(["software", "provider"]),
  company_name: text(200).min(2, "Nom requis"),
  product_name: optional(200),
  siren: optional(20).transform((v) => (v ? v.replace(/\s/g, "") : null)),
  website: text(300).min(4, "Site requis").transform(normalizeUrl).pipe(z.string().url("URL invalide")),
  category_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  profession: optional(100),
  city: optional(100),
  contact_name: text(200).min(2, "Nom requis"),
  contact_email: email,
  contact_role: optional(100),
  message: optional(4000),
  consent,
});

export async function submitListingRequest(_: FormState, fd: FormData): Promise<FormState> {
  const site = await context(fd);
  if (!site) return { ok: true, message: "Merci, votre demande a bien été reçue." };
  const parsed = listingSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  if (d.siren && !/^\d{9}$/.test(d.siren)) return { ok: false, message: "Le SIREN doit comporter 9 chiffres.", errors: { siren: "9 chiffres" } };

  const { error } = await publicClient().from("listing_requests").insert({
    site_id: site.id, kind: d.kind, company_name: d.company_name, product_name: d.product_name, siren: d.siren,
    website: d.website, category_id: d.category_id, profession: d.profession, city: d.city, contact_name: d.contact_name,
    contact_email: d.contact_email, contact_role: d.contact_role, message: d.message,
    consent_at: new Date().toISOString(), consent_text: CONSENT,
    checks: listingChecks({ siren: d.siren, contact_email: d.contact_email, website: d.website }),
  });
  if (error) return { ok: false, message: "Impossible d'enregistrer la demande. Réessayez dans un instant." };
  return { ok: true, message: "Merci ! Votre demande de référencement a été transmise à la rédaction. Le référencement de base est gratuit ; nous revenons vers vous sous 10 jours ouvrés." };
}

// ---------------------------------------------------------------------------
const placementSchema = z.object({
  advertiser_name: text(200).min(2, "Nom requis"),
  website: optional(300).transform((v) => (v ? normalizeUrl(v) : null)),
  contact_name: text(200).min(2, "Nom requis"),
  contact_email: email,
  contact_phone: optional(40),
  placement_types: z.array(z.enum(["category_sponsored", "enhanced_listing", "guide_banner", "newsletter", "simulator_sponsor", "directory_featured"])).default([]),
  category_ids: z.array(z.string().uuid()).default([]),
  period_start: optional(10),
  period_end: optional(10),
  budget_range: optional(100),
  message: optional(4000),
  consent,
});

export async function submitPlacementRequest(_: FormState, fd: FormData): Promise<FormState> {
  const site = await context(fd);
  if (!site) return { ok: true, message: "Merci, votre demande a bien été reçue." };
  const parsed = placementSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign"].map((k) => [k, fd.get(k) ? String(fd.get(k)) : null]));
  const { error } = await publicClient().from("placement_requests").insert({
    site_id: site.id, advertiser_name: d.advertiser_name, website: d.website, contact_name: d.contact_name,
    contact_email: d.contact_email, contact_phone: d.contact_phone, placement_types: d.placement_types,
    category_ids: d.category_ids, period_start: d.period_start, period_end: d.period_end, budget_range: d.budget_range,
    message: d.message, consent_at: new Date().toISOString(), consent_text: CONSENT, utm,
  });
  if (error) return { ok: false, message: "Impossible d'enregistrer la demande. Réessayez dans un instant." };
  return { ok: true, message: "Merci ! Notre équipe commerciale vous envoie une proposition sous 48 h ouvrées." };
}

// ---------------------------------------------------------------------------
const resourceSchema = z.object({
  resource_id: z.string().uuid(),
  email,
  company_size: optional(50),
  job_title: optional(100),
  consent_newsletter: z.string().optional().transform((v) => v === "on"),
  consent,
  origin_path: optional(300),
});

export async function submitResourceLead(_: FormState, fd: FormData): Promise<FormState> {
  const site = await context(fd);
  if (!site) return { ok: true, message: "Merci." };
  const parsed = resourceSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const db = publicClient();
  const { data: res } = await db.from("published_content").select("data").eq("id", d.resource_id).eq("site_id", site.id).maybeSingle();
  if (!res) return { ok: false, message: "Ressource introuvable." };
  const { error } = await db.from("resource_leads").insert({
    site_id: site.id, resource_content_id: d.resource_id, email: d.email, company_size: d.company_size, job_title: d.job_title,
    consent_newsletter: d.consent_newsletter, consent_at: new Date().toISOString(),
    consent_text: CONSENT + (d.consent_newsletter ? " J'accepte de recevoir la newsletter." : ""), origin_path: d.origin_path,
  });
  if (error) return { ok: false, message: "Impossible d'enregistrer la demande." };
  const file = (res.data as { file?: string })?.file;
  return { ok: true, message: "C'est prêt ! Votre téléchargement est disponible ci-dessous.", download: file ? `/${file}` : undefined };
}

// ---------------------------------------------------------------------------
const errorSchema = z.object({
  page_path: text(500).regex(/^\//, "Chemin invalide"),
  kind: z.enum(["error", "right_of_reply"]),
  reporter_name: optional(200),
  reporter_email: email,
  message: text(4000).min(10, "10 caractères minimum"),
  source_url: optional(500),
  consent,
});

export async function submitErrorReport(_: FormState, fd: FormData): Promise<FormState> {
  const site = await context(fd);
  if (!site) return { ok: true, message: "Merci." };
  const parsed = errorSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const { error } = await publicClient().from("error_reports").insert({
    site_id: site.id, page_path: d.page_path, kind: d.kind, reporter_name: d.reporter_name, reporter_email: d.reporter_email,
    message: d.message, source_url: d.source_url, consent_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: "Impossible d'enregistrer le signalement." };
  return { ok: true, message: "Merci. Votre signalement a été transmis à la rédaction ; nous y répondons sous 10 jours ouvrés." };
}
