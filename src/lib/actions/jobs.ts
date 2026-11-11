"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSite } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/service";
import { currentMember } from "@/lib/members";
import { checkJobOffer, CONTRACTS, familyFor, jobSlug, REMOTES, universeOf } from "@/lib/jobs";
import { createCheckout, stripeConfigured } from "@/lib/stripe";

export type JobState = { ok: boolean; message: string; errors?: string[]; warnings?: string[] };

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const money = z.string().trim().optional().transform((v) => (v ? Math.round(Number(v.replace(/\s/g, "").replace(",", "."))) : null))
  .pipe(z.number().int().min(0).max(1_000_000).nullable());

const schema = z.object({
  product: z.string().regex(/^[a-z0-9-]{2,40}$/),
  title: z.string().trim().min(1).max(160),
  company_name: z.string().trim().min(2, "Nom de l'entreprise requis").max(200),
  company_siren: z.string().trim().transform((v) => v.replace(/\s/g, "")).pipe(z.string().regex(/^[0-9]{9}$/, "SIREN : 9 chiffres")),
  city: z.string().trim().min(2, "Ville requise").max(120),
  postal_code: z.string().trim().regex(/^[0-9]{5}$/, "Code postal : 5 chiffres"),
  contract: z.enum(CONTRACTS.map(([k]) => k) as [string, ...string[]]),
  remote: z.enum(REMOTES.map(([k]) => k) as [string, ...string[]]),
  experience: opt(100),
  salary_min: money, salary_max: money,
  description: z.string().trim().max(10000),
  apply_url: opt(1000).pipe(z.string().url("Lien de candidature invalide").regex(/^https?:\/\//).nullable()),
  apply_email: opt(254).pipe(z.string().email("E-mail de candidature invalide").nullable()),
  certify: z.literal("on", { error: "Cochez la case de certification" }),
});

async function origin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")}://${host}`;
}

/** Ouvre le paiement Stripe d'une commande et renvoie l'adresse de la page de paiement. */
async function checkoutFor(orderId: string, label: string, amountCents: number, email: string) {
  const base = await origin();
  const s = await createCheckout({
    orderId, label, amountCents, email,
    successUrl: `${base}/emplois/publier/merci?commande=${orderId}`, cancelUrl: `${base}/mon-espace#annonces`,
  });
  await serviceClient().from("job_orders").update({ stripe_session_id: s.id }).eq("id", orderId);
  return s.url;
}

/** Dépôt d'une annonce : contrôles légaux, enregistrement « en attente de paiement », puis paiement Stripe. */
export async function createJobPosting(_: JobState, fd: FormData): Promise<JobState> {
  const site = await getSite(String(fd.get("site") ?? ""));
  const m = site ? await currentMember(site.id) : null;
  if (!site || !m) return { ok: false, message: "Connectez-vous pour publier une annonce." };
  const parsed = schema.safeParse(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])));
  if (!parsed.success) return { ok: false, message: "Merci de corriger les champs signalés.", errors: parsed.error.issues.map((i) => i.message) };
  const d = parsed.data;
  const check = checkJobOffer(d);
  if (check.errors.length) return { ok: false, message: "L'annonce ne respecte pas les règles de publication.", errors: check.errors, warnings: check.warnings };

  const db = serviceClient();
  const { data: product } = await db.from("job_products").select("*").eq("code", d.product).eq("active", true).maybeSingle();
  if (!product) return { ok: false, message: "Formule inconnue." };
  const { data: provider } = await db.from("providers").select("id").eq("siren", d.company_siren).maybeSingle();
  const { data: job, error } = await db.from("job_offers").insert({
    site_id: site.id, source: "member", slug: jobSlug(d.title, d.city, randomBytes(4).toString("hex")), title: d.title,
    company_name: d.company_name, company_siren: d.company_siren, provider_id: provider?.id ?? null, city: d.city,
    postal_code: d.postal_code, department: d.postal_code.startsWith("20") ? (Number(d.postal_code) < 20200 ? "2A" : "2B") : d.postal_code.startsWith("97") ? d.postal_code.slice(0, 3) : d.postal_code.slice(0, 2),
    universe_slug: universeOf(d.title)!, family: familyFor(d.title, universeOf(d.title)!), contract: d.contract, remote: d.remote, experience: d.experience, salary_min: d.salary_min,
    salary_max: d.salary_max, description: d.description, apply_url: d.apply_url, apply_email: d.apply_email,
    featured: product.featured, status: "awaiting_payment", posted_by_member: m.id,
  }).select("id").single();
  if (error || !job) return { ok: false, message: "Enregistrement impossible. Réessayez." };
  const { data: order } = await db.from("job_orders").insert({ job_id: job.id, member_id: m.id, product_code: product.code, amount_cents: product.amount_cents })
    .select("id").single();
  revalidatePath("/s/[site]/mon-espace", "page");
  if (!stripeConfigured() || !order) {
    return { ok: false, message: "Annonce enregistrée, mais le paiement en ligne n'est pas encore ouvert. Elle reste en attente de paiement dans « Mon espace »." };
  }
  let url: string;
  try { url = await checkoutFor(order.id, `${product.label} — ${d.title}`, product.amount_cents, m.email); }
  catch { return { ok: false, message: "Le paiement n'a pas pu démarrer. L'annonce reste en attente dans « Mon espace »." }; }
  redirect(url);
}

/** Reprendre le paiement d'une annonce restée en attente. */
export async function payJob(_: { ok: boolean; message: string }, fd: FormData): Promise<{ ok: boolean; message: string }> {
  const site = await getSite(String(fd.get("site") ?? ""));
  const m = site ? await currentMember(site.id) : null;
  if (!site || !m) return { ok: false, message: "Connectez-vous." };
  const db = serviceClient();
  const { data: job } = await db.from("job_offers").select("id,title,status").eq("id", String(fd.get("job_id"))).eq("posted_by_member", m.id).maybeSingle();
  if (!job || job.status !== "awaiting_payment") return { ok: false, message: "Cette annonce n'attend pas de paiement." };
  const { data: order } = await db.from("job_orders").select("id,amount_cents,job_products(label)").eq("job_id", job.id).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!order || !stripeConfigured()) return { ok: false, message: "Le paiement en ligne n'est pas encore ouvert." };
  let url: string;
  try { url = await checkoutFor(order.id, `${(order.job_products as { label?: string } | null)?.label ?? "Annonce"} — ${job.title}`, order.amount_cents, m.email); }
  catch { return { ok: false, message: "Le paiement n'a pas pu démarrer." }; }
  redirect(url);
}
