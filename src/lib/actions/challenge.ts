"use server";

import { z } from "zod";
import { getSite } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { serviceClient } from "@/lib/supabase/service";
import { brevoMailer } from "@/lib/mail";
import { criteriaFor, formatValue, type GridCriterion } from "@/lib/grid";
import { siteUrl } from "@/lib/seo";
import { CHALLENGE_CONSENT } from "@/lib/consents";

/**
 * « Challenger ma solution » (maquette, écran 8). Prestataires : alternatives de la même ville et du même métier,
 * sans classement (ordre : informations vérifiées). Réponses : enregistrées côté serveur seulement, comparatif envoyé
 * par e-mail ; aucune donnée transmise à un éditeur ou un cabinet sans l'accord explicite du visiteur.
 */

/** Critères de la grille de lecture comparés dans le parcours (les plus utiles au choix). */
const PROVIDER_CODES = ["clients", "missions_comptables", "missions_audit", "fonctions_recrutees", "logiciels", "delai_reponse", "facturation_electronique", "tarif", "effectif"];

export type ProviderChallenge = {
  current: { slug: string; name: string; city: string | null; categorySlug: string; categoryName: string; regulated: boolean };
  criteria: { code: string; label: string }[];
  rows: { slug: string; name: string; city: string | null; current: boolean; values: Record<string, string | null> }[];
};

export async function loadProviderChallenge(slug: string): Promise<ProviderChallenge | null> {
  const db = publicClient();
  const { data: cur } = await db.from("providers_by_category").select("id,slug,name,city,city_slug,department,category_id,regulated_profession").eq("slug", slug).limit(5);
  if (!cur?.length) return null;
  const { data: cats } = await db.from("categories").select("id,slug,name").in("id", cur.map((c) => c.category_id!)).eq("status", "published");
  const p = cur.find((c) => cats?.some((k) => k.id === c.category_id));
  const cat = cats?.find((k) => k.id === p?.category_id);
  if (!p || !cat) return null;
  // Même métier, même ville ; complété par le département si la ville compte moins de 5 autres fiches.
  const pick = async (col: "city_slug" | "department", val: string | null) => val
    ? (await db.from("providers_by_category").select("id,slug,name,city").eq("category_id", cat.id).eq(col, val).neq("id", p.id!).order("name").limit(60)).data ?? []
    : [];
  const pool = [...await pick("city_slug", p.city_slug)];
  if (pool.length < 5) for (const x of await pick("department", p.department)) if (!pool.some((y) => y.id === x.id)) pool.push(x);
  const ids = [p.id!, ...pool.map((x) => x.id!)];
  const [{ data: facts }, { data: crit }] = await Promise.all([
    db.from("provider_facts").select("provider_id,criterion,value").in("provider_id", ids).eq("status", "validated"),
    db.from("provider_criteria").select("*").in("code", PROVIDER_CODES),
  ]);
  const criteria = criteriaFor((crit ?? []) as unknown as GridCriterion[], cat.slug);
  const known = (id: string) => (facts ?? []).filter((f) => f.provider_id === id).length;
  const alternatives = pool.sort((a, b) => known(b.id!) - known(a.id!) || a.name!.localeCompare(b.name!, "fr")).slice(0, 5);
  const values = (id: string) => Object.fromEntries(criteria.map((c) => [c.code, formatValue(c, (facts ?? []).find((f) => f.provider_id === id && f.criterion === c.code)?.value)]));
  return {
    current: { slug: p.slug!, name: p.name!, city: p.city, categorySlug: cat.slug, categoryName: cat.name, regulated: !!p.regulated_profession },
    criteria: criteria.map((c) => ({ code: c.code, label: c.label })),
    rows: [{ slug: p.slug!, name: p.name!, city: p.city, current: true, values: values(p.id!) },
      ...alternatives.map((a) => ({ slug: a.slug!, name: a.name!, city: a.city, current: false, values: values(a.id!) }))],
  };
}

export async function loadBarometer(target: { software?: string; provider?: string }) {
  const db = publicClient();
  const id = target.software
    ? (await db.from("software").select("id").eq("slug", target.software).maybeSingle()).data?.id
    : target.provider ? (await db.from("providers_public").select("id").eq("slug", target.provider).maybeSingle()).data?.id : null;
  if (!id) return null;
  const { data } = await db.rpc("satisfaction_barometer", target.software ? { p_software: id } : { p_provider: id });
  return data as { n: number; avg?: number } | null;
}

// ---------------------------------------------------------------------------
export type ChallengeState = { ok: boolean; message: string; errors?: Record<string, string> };

const schema = z.object({
  site: z.string().min(1),
  target_type: z.enum(["software", "provider", "spreadsheet"]),
  target_slug: z.string().max(200).optional().transform((v) => v || null),
  category_slug: z.string().max(200).optional().transform((v) => v || null),
  satisfaction: z.coerce.number().int().min(0).max(10),
  reasons: z.array(z.string().max(80)).max(12).default([]),
  contract_end: z.enum(["moins-3-mois", "3-12-mois", "inconnu"]).optional().or(z.literal("")).transform((v) => v || null),
  company_size: z.enum(["tpe", "pme1", "pme2", "eti"]).optional().or(z.literal("")).transform((v) => v || null),
  company: z.string().trim().max(200).optional().transform((v) => v || null),
  email: z.string().trim().toLowerCase().email("E-mail professionnel invalide").max(200),
  consent_comparison: z.literal("on", { error: "Cochez l'envoi du comparatif pour le recevoir." }),
  contact: z.array(z.string().max(200)).max(5).default([]),
  consent_reminder: z.literal("on").optional(),
  link: z.string().max(500),
});

function fieldsOf(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith("[]")) o[k.slice(0, -2)] = [...((o[k.slice(0, -2)] as string[]) ?? []), String(v)];
    else o[k] = String(v);
  }
  return o;
}

export async function submitChallenge(_: ChallengeState, fd: FormData): Promise<ChallengeState> {
  if (String(fd.get("company_url") ?? "")) return { ok: true, message: "Merci." }; // pot de miel anti-robots
  const parsed = schema.safeParse(fieldsOf(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] = i.message;
    return { ok: false, message: "Merci de corriger les champs signalés.", errors };
  }
  const d = parsed.data;
  const site = await getSite(d.site);
  if (!site) return { ok: false, message: "Portail inconnu." };
  const pub = publicClient();
  const sw = d.target_type === "software" && d.target_slug ? (await pub.from("software").select("id,name").eq("slug", d.target_slug).maybeSingle()).data : null;
  const pr = d.target_type === "provider" && d.target_slug ? (await pub.from("providers_public").select("id,name").eq("slug", d.target_slug).maybeSingle()).data : null;
  const cat = d.category_slug ? (await pub.from("categories").select("id").eq("site_id", site.id).eq("slug", d.category_slug).maybeSingle()).data : null;
  if (d.target_type !== "spreadsheet" && !sw && !pr) return { ok: false, message: "Solution de départ introuvable." };
  // Alternatives que le visiteur accepte d'entendre : uniquement des fiches publiées.
  const contactIds = d.contact.length
    ? d.target_type === "provider"
      ? ((await pub.from("providers_public").select("id").in("slug", d.contact)).data ?? []).map((x) => x.id!)
      : ((await pub.from("software").select("id").in("slug", d.contact).eq("status", "published")).data ?? []).map((x) => x.id)
    : [];
  const consentText = CHALLENGE_CONSENT + (contactIds.length ? ` J'accepte d'être recontacté par les ${contactIds.length} alternative(s) cochée(s), et elles seules.` : "")
    + (d.consent_reminder ? " Prévenez-moi avant l'échéance de mon contrat." : "");
  const db = serviceClient();
  const { data: row, error } = await db.from("challenge_responses").insert({
    site_id: site.id, target_type: d.target_type, software_id: sw?.id ?? null, provider_id: pr?.id ?? null, category_id: cat?.id ?? null,
    satisfaction: d.satisfaction, reasons: d.reasons, contract_end: d.contract_end, company_size: d.company_size, company: d.company,
    email: d.email, consent_comparison: true, consent_contact_ids: contactIds, consent_reminder: !!d.consent_reminder, consent_text: consentText,
  }).select("id").single();
  if (error || !row) return { ok: false, message: "Impossible d'enregistrer votre demande. Réessayez dans un instant." };

  const url = `${siteUrl(site)}${d.link.startsWith("/") ? d.link : "/challenger"}`;
  const from = sw?.name ?? pr?.name ?? "votre tableur";
  const mail = await brevoMailer({
    to: d.email,
    subject: `Votre comparatif : les alternatives à ${from}`,
    text: `Bonjour,\n\nVoici votre comparatif des alternatives à ${from}, sur les critères que vous avez choisis :\n${url}\n\n`
      + "Notes issues des tests de la rédaction, faits sourcés et datés. Aucun résultat sponsorisé.\n"
      + (contactIds.length ? `Vous avez accepté d'être recontacté par ${contactIds.length} alternative(s) : nous leur transmettrons votre demande, et à elles seules.\n` : "Personne d'autre n'a reçu vos coordonnées.\n")
      + `\nVous pouvez demander la suppression de vos données à tout moment en répondant à ce message.\n\n${site.name}`,
  });
  await db.from("challenge_responses").update({ mail_status: mail.ok ? "sent" : "failed" }).eq("id", row.id);
  return mail.ok
    ? { ok: true, message: "Votre comparatif part dans votre boîte e-mail." }
    : { ok: true, message: "Vos réponses sont enregistrées. L'envoi d'e-mail n'est pas encore activé : gardez le lien du comparatif en ligne ci-dessous." };
}
