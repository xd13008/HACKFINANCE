import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { brevoMailer, type Mailer } from "@/lib/mail";
import { refundPayment, stripeConfigured } from "@/lib/stripe";

/**
 * Après les décisions (agent ou éditeur) sur les annonces payantes :
 * - annonce refusée et payée → remboursement Stripe automatique ;
 * - recruteur prévenu une seule fois par e-mail (publication ou refus, avec le motif).
 * Exécuté par le serveur (clé de service) dans la tâche planifiée /api/cron/jobs.
 */
export async function settleJobDecisions(db: SupabaseClient<Database>, mailer: Mailer = brevoMailer, refund = refundPayment) {
  const out = { refunded: 0, refundErrors: [] as string[], mailed: 0 };
  // 1. Remboursements : toute annonce payée puis refusée (par l'agent ou par un éditeur)
  const { data: rejected } = await db.from("job_offers").select("id").eq("source", "member").eq("status", "rejected").limit(500);
  const refundedJobs = new Set<string>();
  const rejIds = (rejected ?? []).map((r) => r.id);
  const { data: orders } = rejIds.length
    ? await db.from("job_orders").select("id,job_id,stripe_payment_intent").in("job_id", rejIds).eq("status", "paid")
    : { data: [] };
  for (const o of orders ?? []) {
    if (!o.stripe_payment_intent || !stripeConfigured()) { out.refundErrors.push(`${o.job_id} : paiement Stripe introuvable ou non configuré`); continue; }
    try {
      await refund(o.stripe_payment_intent, o.id);
      await db.from("job_orders").update({ status: "refunded" }).eq("id", o.id);
      out.refunded++; refundedJobs.add(o.job_id);
    } catch (e) { out.refundErrors.push(`${o.job_id} : ${(e as Error).message}`); }
  }

  // 2. E-mails : une seule fois par décision
  const { data: jobs } = await db.from("job_offers").select("id,title,status,reject_reason,notified_status,posted_by_member")
    .eq("source", "member").in("status", ["published", "rejected"]).limit(500);
  for (const j of (jobs ?? []).filter((x) => x.notified_status !== x.status)) {
    const { data: m } = j.posted_by_member ? await db.from("members").select("email").eq("id", j.posted_by_member).maybeSingle() : { data: null };
    if (m) {
      const sent = await mailer({
        to: m.email,
        subject: j.status === "published" ? `Votre annonce est en ligne : ${j.title}` : `Votre annonce n'a pas été publiée : ${j.title}`,
        text: j.status === "published"
          ? `Bonjour,\n\nVotre annonce « ${j.title} » est publiée. Suivez-la depuis « Mon espace ».\n`
          : `Bonjour,\n\nVotre annonce « ${j.title} » n'a pas été publiée. Motif : ${j.reject_reason ?? "non conforme à nos règles de publication"}.\n\n${refundedJobs.has(j.id) ? "Votre paiement a été remboursé ; le remboursement apparaît sous 5 à 10 jours." : "Le remboursement vous sera adressé sous quelques jours."}\n`,
      });
      if (!sent.ok) continue;
      out.mailed++;
    }
    await db.from("job_offers").update({ notified_status: j.status }).eq("id", j.id);
  }
  return out;
}
