"use server";

import { z } from "zod";
import { getSite } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { serviceClient } from "@/lib/supabase/service";
import { brevoMailer } from "@/lib/mail";
import { CONTACT_CONSENT, CONTACT_FEEDBACK, CONTACT_NEWSLETTER } from "@/lib/consents";

/**
 * Mise en relation (maquette, écran 4). Enregistrée côté serveur ; transmise ensuite par l'équipe aux seules solutions
 * cochées par le visiteur (back-office « Mises en relation »). Aucune demande sur un sujet réglementé (règle 5, contrôle en base).
 */
export type ContactState = { ok: boolean; message: string; errors?: Record<string, string> };

const schema = z.object({
  site: z.string().min(1),
  category: z.string().min(1, "Choisissez votre besoin"),
  company_size: z.enum(["tpe", "pme1", "pme2", "eti"], { error: "Indiquez la taille de l'entreprise" }),
  timing: z.enum(["immediat", "3-mois", "6-mois", "information"]).optional().or(z.literal("")).transform((v) => v || null),
  budget: z.enum(["moins-100", "100-250", "250-500", "plus-500", "inconnu"]).optional().or(z.literal("")).transform((v) => v || null),
  details: z.string().trim().max(1500).optional().transform((v) => v || ""),
  targets: z.array(z.string().max(200)).min(1, "Cochez au moins une solution").max(5, "5 solutions au plus"),
  contact_name: z.string().trim().min(2, "Nom requis").max(120),
  job_title: z.string().trim().max(120).optional().transform((v) => v || null),
  email: z.string().trim().toLowerCase().email("E-mail professionnel invalide").max(200),
  phone: z.string().trim().max(25).regex(/^[0-9 +().-]*$/, "Téléphone invalide").optional().transform((v) => v || null),
  company: z.string().trim().min(2, "Entreprise requise").max(200),
  consent: z.literal("on", { error: "Votre accord est nécessaire pour transmettre la demande" }),
  newsletter: z.literal("on").optional(),
  feedback: z.literal("on").optional(),
  origin: z.string().max(300).optional(),
});

function fieldsOf(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith("[]")) o[k.slice(0, -2)] = [...((o[k.slice(0, -2)] as string[]) ?? []), String(v)];
    else o[k] = String(v);
  }
  return o;
}

export async function submitContactRequest(_: ContactState, fd: FormData): Promise<ContactState> {
  if (String(fd.get("company_url") ?? "")) return { ok: true, message: "Merci." }; // pot de miel anti-robots
  const parsed = schema.safeParse(fieldsOf(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Merci de corriger les champs signalés.", errors };
  }
  const d = parsed.data;
  const site = await getSite(d.site);
  if (!site) return { ok: false, message: "Portail inconnu." };
  const pub = publicClient();
  const { data: cat } = await pub.from("categories").select("id,name").eq("site_id", site.id).eq("slug", d.category).eq("status", "published").maybeSingle();
  if (!cat) return { ok: false, message: "Besoin introuvable.", errors: { category: "Besoin introuvable" } };
  // Destinataires : logiciels publiés de la catégorie, cochés par le visiteur, et eux seuls.
  const { data: links } = await pub.from("software_categories").select("software_id").eq("category_id", cat.id);
  const { data: sw } = await pub.from("software").select("id,name").in("slug", d.targets).eq("status", "published").in("id", (links ?? []).map((l) => l.software_id));
  if (!sw?.length) return { ok: false, message: "Cochez au moins une solution de ce besoin.", errors: { targets: "Cochez au moins une solution" } };
  const consentText = `${CONTACT_CONSENT} Solutions cochées : ${sw.map((s) => s.name).join(", ")}.`
    + (d.newsletter ? ` ${CONTACT_NEWSLETTER}` : "") + (d.feedback ? ` ${CONTACT_FEEDBACK}` : "");
  const db = serviceClient();
  const { data: req, error } = await db.from("contact_requests").insert({
    site_id: site.id, category_id: cat.id, need: `${cat.name}${d.details ? ` : ${d.details}` : ""}`.slice(0, 2000), company: d.company, company_size: d.company_size,
    contact_name: d.contact_name, job_title: d.job_title, email: d.email, phone: d.phone, timing: d.timing, budget: d.budget,
    consent_text: consentText, consent_newsletter: !!d.newsletter, consent_feedback: !!d.feedback, origin_path: d.origin ?? null,
  }).select("id").single();
  if (error || !req) return { ok: false, message: error?.code === "42501" ? "Ce besoin ne permet pas de mise en relation." : "Impossible d'enregistrer la demande. Réessayez dans un instant." };
  await db.from("contact_request_targets").insert(sw.map((s) => ({ request_id: req.id, software_id: s.id })));
  await brevoMailer({
    to: d.email,
    subject: `Votre demande : ${cat.name}`,
    text: `Bonjour ${d.contact_name},\n\nNous avons bien reçu votre demande « ${cat.name} ». Elle sera transmise uniquement à : ${sw.map((s) => s.name).join(", ")}.\n`
      + "Aucun autre destinataire ne recevra vos coordonnées. Vous pouvez retirer votre accord ou demander la suppression de vos données en répondant à ce message.\n\n"
      + site.name,
  });
  return { ok: true, message: `Demande enregistrée. Elle sera transmise uniquement à : ${sw.map((s) => s.name).join(", ")}. Un e-mail de confirmation récapitule vos choix.` };
}
