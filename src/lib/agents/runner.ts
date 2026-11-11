import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Llm, LlmRequest } from "./llm";

export type Db = SupabaseClient<Database>;
export type AgentName = "veille" | "redaction" | "controle_qualite" | "verification_offres";
export type AgentResult = { summary: string; output: Record<string, unknown> };

export class BudgetExceeded extends Error {}

/**
 * Client Supabase authentifié avec le compte « agent » : toutes les écritures passent par la RLS
 * (brouillons uniquement). Jamais la clé service_role.
 */
/**
 * Identifiants du compte « agent ». Par défaut, créés au déploiement par scripts/migrate-prod.mjs (ensureAgentAccount) :
 * mot de passe dérivé de la clé de service, jamais écrit nulle part. AGENT_EMAIL / AGENT_PASSWORD restent possibles.
 */
export const DEFAULT_AGENT_EMAIL = "agent.interne@radarfinances.com";
export function agentCredentials() {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.AGENT_EMAIL ?? DEFAULT_AGENT_EMAIL;
  const password = process.env.AGENT_PASSWORD
    ?? (service ? createHmac("sha256", service).update("radar-agent-account-v1").digest("base64url") : null);
  return { email, password };
}

export async function agentDb(): Promise<Db> {
  const { email, password } = agentCredentials();
  if (!password) throw new Error("Compte agent non configuré (clé de service absente)");
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Connexion du compte agent impossible : ${error.message}`);
  return db;
}

/**
 * Exécute un agent avec ses garde-fous : activation, plafond mensuel, plafond par exécution,
 * journal dans agent_runs (coût, durée, erreur).
 */
export async function runAgent(
  name: AgentName,
  ctx: { db: Db; llm: Llm; targetId?: string | null; triggeredBy?: string | null; input?: Record<string, unknown> },
  work: (deps: { db: Db; llm: Llm; settings: { allowed_domains: string[] } }) => Promise<AgentResult>,
): Promise<{ runId: string | null; status: "succeeded" | "failed" | "skipped"; summary: string; costUsd: number }> {
  const { db } = ctx;
  const { data: settings } = await db.from("agent_settings").select("*").eq("agent", name).maybeSingle();
  if (!settings?.enabled) return { runId: null, status: "skipped", summary: `Agent « ${name} » désactivé`, costUsd: 0 };
  const { data: monthCost } = await db.rpc("agent_month_cost", { p_agent: name });
  if (Number(monthCost ?? 0) >= Number(settings.max_cost_per_month)) {
    return { runId: null, status: "skipped", summary: `Plafond mensuel atteint (${settings.max_cost_per_month} $)`, costUsd: 0 };
  }

  const { data: { user } } = await db.auth.getUser();
  const started = Date.now();
  const { data: run, error: runErr } = await db.from("agent_runs").insert({
    agent: name, input: (ctx.input ?? {}) as never, status: "running", started_by: user!.id,
    target_id: ctx.targetId ?? null, triggered_by: ctx.triggeredBy ?? null,
  }).select("id").single();
  if (runErr) throw new Error(`Journalisation impossible : ${runErr.message}`);

  let spent = 0;
  const maxRun = Number(settings.max_cost_per_run);
  const metered: Llm = async <T,>(req: LlmRequest<T>) => {
    if (spent >= maxRun) throw new BudgetExceeded(`Plafond par exécution atteint (${maxRun} $)`);
    const r = await ctx.llm(req);
    spent += r.costUsd;
    return r;
  };

  try {
    const result = await work({ db, llm: metered, settings: { allowed_domains: settings.allowed_domains ?? [] } });
    await db.from("agent_runs").update({
      status: "succeeded", output: { summary: result.summary, ...result.output } as never, cost_usd: Number(spent.toFixed(4)),
      duration_ms: Date.now() - started, finished_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { runId: run.id, status: "succeeded", summary: result.summary, costUsd: spent };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("agent_runs").update({
      status: "failed", error: message.slice(0, 2000), cost_usd: Number(spent.toFixed(4)),
      duration_ms: Date.now() - started, finished_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { runId: run.id, status: "failed", summary: message, costUsd: spent };
  }
}
