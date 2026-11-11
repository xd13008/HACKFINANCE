import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { verifyStripeSignature } from "@/lib/stripe";

type Session = { id: string; payment_status?: string; payment_intent?: string | null; invoice?: string | null; metadata?: { order_id?: string } };

/**
 * Webhook Stripe : seule preuve de paiement. Commande payée → annonce « en attente de relecture » (jamais publiée ici :
 * la publication reste une décision d'un éditeur, imposée par la base).
 */
export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) {
    return new NextResponse("Signature invalide", { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: Session } };
  const s = event.data.object;
  const orderId = s.metadata?.order_id;
  if (!orderId || !/^[0-9a-f-]{36}$/.test(orderId)) return NextResponse.json({ ignored: true });
  const db = serviceClient();

  if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && s.payment_status === "paid") {
    const { data: order } = await db.from("job_orders").update({
      status: "paid", paid_at: new Date().toISOString(), stripe_session_id: s.id,
      stripe_payment_intent: s.payment_intent ?? null, stripe_invoice_id: s.invoice ?? null,
    }).eq("id", orderId).eq("status", "pending").select("job_id").maybeSingle();
    if (order) await db.from("job_offers").update({ status: "pending_review" }).eq("id", order.job_id).eq("status", "awaiting_payment");
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    await db.from("job_orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending").eq("stripe_session_id", s.id);
  }
  return NextResponse.json({ received: true });
}
