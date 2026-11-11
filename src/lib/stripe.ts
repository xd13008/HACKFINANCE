import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paiement des annonces par Stripe Checkout (API REST, sans SDK).
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET et STRIPE_TAX_RATE_ID (TVA 20 %, créée une fois dans Stripe) côté serveur.
 * Stripe émet la facture (invoice_creation) ; le paiement est confirmé uniquement par le webhook signé.
 */
export type CheckoutInput = {
  orderId: string; label: string; amountCents: number; email: string; successUrl: string; cancelUrl: string;
};

export function stripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_TAX_RATE_ID);
}

export function checkoutParams(i: CheckoutInput, taxRate: string) {
  return new URLSearchParams({
    mode: "payment", locale: "fr", customer_email: i.email, client_reference_id: i.orderId,
    "metadata[order_id]": i.orderId, "payment_intent_data[metadata][order_id]": i.orderId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(i.amountCents),
    "line_items[0][price_data][product_data][name]": i.label,
    "line_items[0][tax_rates][0]": taxRate,
    "invoice_creation[enabled]": "true",
    "billing_address_collection": "required",
    "tax_id_collection[enabled]": "true",
    success_url: i.successUrl, cancel_url: i.cancelUrl,
  });
}

export async function createCheckout(i: CheckoutInput, fetcher: typeof fetch = fetch) {
  const key = process.env.STRIPE_SECRET_KEY, tax = process.env.STRIPE_TAX_RATE_ID;
  if (!key || !tax) throw new Error("Paiement non configuré");
  const res = await fetcher("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: checkoutParams(i, tax),
  });
  const body = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !body.id || !body.url) throw new Error(body.error?.message ?? `Stripe ${res.status}`);
  return { id: body.id, url: body.url };
}

/** Vérifie l'en-tête Stripe-Signature (HMAC SHA-256 de « t.payload », tolérance 5 minutes). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now(), tolerance = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2)) as Record<string, string>;
  const t = Number(parts.t);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(now / 1000 - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export function signStripePayload(payload: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

/** Remboursement intégral d'un paiement (annonce refusée). Clé d'idempotence : un seul remboursement par commande. */
export async function refundPayment(paymentIntent: string, orderId: string, fetcher: typeof fetch = fetch) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Paiement non configuré");
  const res = await fetcher("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded", "idempotency-key": `refund-${orderId}` },
    body: new URLSearchParams({ payment_intent: paymentIntent, reason: "requested_by_customer", "metadata[order_id]": orderId }),
  });
  const body = (await res.json()) as { id?: string; status?: string; error?: { message?: string } };
  if (!res.ok || !body.id) throw new Error(body.error?.message ?? `Stripe ${res.status}`);
  return { id: body.id, status: body.status };
}
