/**
 * Agent de vérification des offres, contre le Supabase local (modèle factice : aucun appel payant).
 * Vérifie : filtre des univers sans coût, recommandation seule tant que l'admin n'a pas autorisé la publication,
 * pas de double vérification, publication et refus automatiques une fois autorisés, remboursement et e-mail uniques.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Llm } from "@/lib/agents/llm";
import { runJobReview } from "@/lib/agents";
import { settleJobDecisions } from "@/lib/jobs-settle";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SITE = "10000000-0000-4000-a000-000000000001";
const DESC = "Au sein de la direction financière d'une PME, vous prenez en charge la clôture, le reporting et le budget. ".repeat(3);

const reachable = !!SERVICE && await fetch(`${URL}/auth/v1/health`, { headers: { apikey: ANON } }).then((r) => r.ok).catch(() => false);
async function as(email: string) {
  const db = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email, password: "demo-local-2026" });
  if (error) throw error;
  return db;
}
type Review = { id: string; verdict: "approve" | "reject" | "escalate"; universe: string | null; reasons: string[]; confidence: number };
/** Faux modèle : décide d'après l'intitulé, enregistre les identifiants reçus. */
function fakeLlm(decide: Record<string, Omit<Review, "id">>) {
  const seen: string[][] = [];
  const llm = (async (req: { user: string }) => {
    const ids = [...req.user.matchAll(/^id: ([0-9a-f-]{36})$/gm)].map((m) => m[1]);
    const titles = [...req.user.matchAll(/^intitulé: (.+)$/gm)].map((m) => m[1]);
    seen.push(ids);
    return { data: { reviews: ids.map((id, i) => ({ id, ...decide[titles[i]] })) } as never, costUsd: 0.01, model: "fake" };
  }) as unknown as Llm;
  return { llm, seen };
}

describe.skipIf(!reachable)("agent de vérification des offres (Supabase local, modèle factice)", () => {
  const svc = createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });
  let admin: Awaited<ReturnType<typeof as>>, agent: Awaited<ReturnType<typeof as>>;
  const job = async (title: string, source: "france_travail" | "member" = "france_travail", member?: string) => {
    const { data, error } = await svc.from("job_offers").insert({
      site_id: SITE, source, external_id: source === "member" ? null : `T${Math.random().toString(36).slice(2, 10)}`,
      slug: `agent-test-${Math.random().toString(36).slice(2, 10)}`, title, family: "comptabilite", contract: "cdi", description: DESC,
      status: "pending_review", posted_by_member: member ?? null,
    }).select("id").single();
    if (error) throw error;
    return data.id;
  };
  const status = async (id: string) => (await svc.from("job_offers").select("status").eq("id", id).single()).data!.status;

  beforeAll(async () => {
    [admin, agent] = await Promise.all([as("admin@exemple.test"), as("agent@exemple.test")]);
    await admin.from("agent_settings").update({ enabled: true, max_cost_per_run: 1, max_cost_per_month: 50 }).eq("agent", "verification_offres");
    await svc.from("job_settings").delete().eq("site_id", SITE);
    await svc.from("job_offers").delete().like("slug", "agent-test-%");
  });
  afterAll(async () => {
    await admin.from("agent_settings").update({ enabled: false }).eq("agent", "verification_offres");
    await svc.from("job_settings").delete().eq("site_id", SITE);
    await svc.from("job_offers").delete().like("slug", "agent-test-%");
    await svc.from("members").delete().eq("email", "recruteur.agent@exemple.test");
  });

  it("sans autorisation de l'admin : recommande seulement ; filtre les postes hors univers sans appeler le modèle", async () => {
    const ok = await job("Contrôleur de gestion H/F");
    const bank = await job("Conseiller bancaire H/F");
    const doubt = await job("Trésorier H/F");
    const { llm, seen } = fakeLlm({
      "Contrôleur de gestion H/F": { verdict: "approve", universe: "pilotage-performance", reasons: ["Poste de contrôle de gestion"], confidence: 0.9 },
      "Trésorier H/F": { verdict: "approve", universe: "tresorerie-cash", reasons: ["Peu d'informations"], confidence: 0.5 },
    });
    const r = await runJobReview({ db: agent, llm });
    expect(r.status).toBe("succeeded");
    expect(seen.flat()).not.toContain(bank);                       // refusé par les règles, sans coût
    expect(seen.flat()).toEqual(expect.arrayContaining([ok, doubt]));
    expect([await status(ok), await status(bank), await status(doubt)]).toEqual(["pending_review", "pending_review", "pending_review"]);
    const { data: rev } = await svc.from("job_reviews").select("job_id,verdict,applied").in("job_id", [ok, bank, doubt]);
    expect(Object.fromEntries((rev ?? []).map((x) => [x.job_id, `${x.verdict}/${x.applied}`])))
      .toEqual({ [ok]: "approve/false", [bank]: "reject/false", [doubt]: "escalate/false" });  // confiance 0,5 → doute
    const again = fakeLlm({});
    await runJobReview({ db: agent, llm: again.llm });
    expect(again.seen.flat()).toHaveLength(0);                     // pas de seconde vérification
  });

  it("autorisé par l'admin : publie, refuse, rembourse et prévient une seule fois", async () => {
    await admin.from("job_settings").upsert({ site_id: SITE, auto_publish: true }, { onConflict: "site_id" });
    const { data: m } = await svc.from("members").insert({ site_id: SITE, email: "recruteur.agent@exemple.test", status: "active", consent_text: "t", consent_at: new Date().toISOString() }).select("id").single();
    const good = await job("Credit manager H/F");
    const scam = await job("Comptable H/F");
    const paidLow = await job("DAF H/F", "member", m!.id);
    const paidBad = await job("Responsable comptable H/F", "member", m!.id);
    await svc.from("job_orders").insert([
      { job_id: paidLow, member_id: m!.id, product_code: "annonce-30", amount_cents: 19000, status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: "pi_low" },
      { job_id: paidBad, member_id: m!.id, product_code: "annonce-30", amount_cents: 19000, status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: "pi_bad" },
    ]);
    const { llm } = fakeLlm({
      "Credit manager H/F": { verdict: "approve", universe: "encaissement", reasons: ["Crédit management en entreprise"], confidence: 0.95 },
      "Comptable H/F": { verdict: "reject", universe: null, reasons: ["Frais d'inscription demandés au candidat"], confidence: 0.92 },
      "DAF H/F": { verdict: "reject", universe: null, reasons: ["Description vague"], confidence: 0.8 },               // payée : seuil 0,85 → doute
      "Responsable comptable H/F": { verdict: "reject", universe: null, reasons: ["Annonce pour une formation payante"], confidence: 0.95 },
    });
    await runJobReview({ db: agent, llm });
    expect(await status(good)).toBe("published");
    expect(await status(scam)).toBe("rejected");
    expect(await status(paidLow)).toBe("pending_review");
    expect(await status(paidBad)).toBe("rejected");

    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x"); vi.stubEnv("STRIPE_TAX_RATE_ID", "txr_x");
    const refunds: string[] = [], mails: string[] = [];
    const refund = async (pi: string) => { refunds.push(pi); return { id: "re_1", status: "succeeded" }; };
    const mailer = async (x: { subject: string }) => { mails.push(x.subject); return { ok: true }; };
    const s1 = await settleJobDecisions(svc, mailer, refund);
    const s2 = await settleJobDecisions(svc, mailer, refund);
    vi.unstubAllEnvs();
    expect(refunds).toEqual(["pi_bad"]);
    expect((await svc.from("job_orders").select("status").eq("job_id", paidBad).single()).data!.status).toBe("refunded");
    expect(mails).toEqual(["Votre annonce n'a pas été publiée : Responsable comptable H/F"]);
    expect(s1.refunded).toBe(1);
    expect(s2.mailed + s2.refunded).toBe(0);
  });
});
