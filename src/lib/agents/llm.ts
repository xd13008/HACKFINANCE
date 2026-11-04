import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const AGENT_MODEL = "claude-opus-5-5";

/** Prix $/million de tokens (Claude API, nov. 2026). Les réponses servies par un modèle de repli sont estimées au tarif Opus 5. */
const PRICES: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
  default: { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};

export type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

export function costUsd(model: string, u: Usage): number {
  const p = PRICES[model] ?? PRICES.default;
  return (
    (u.input_tokens * p.in + u.output_tokens * p.out + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) /
    1_000_000
  );
}

export type LlmRequest<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};
export type LlmResult<T> = { data: T; costUsd: number; model: string };

/** Interface injectable : en test, on fournit une implémentation factice (aucun appel payant). */
export type Llm = <T>(req: LlmRequest<T>) => Promise<LlmResult<T>>;

export class AgentRefusal extends Error {}

/**
 * Appel unique à Claude, sortie structurée validée par Zod. Aucun outil n'est fourni au modèle :
 * il ne peut ni naviguer, ni envoyer de message, ni déclencher de paiement — il renvoie des données.
 * Repli serveur activé (« default ») si le modèle principal décline la requête.
 */
export const claudeLlm: Llm = async <T>(req: LlmRequest<T>): Promise<LlmResult<T>> => {
  const client = new Anthropic();
  const res = await client.beta.messages.parse({
    model: AGENT_MODEL,
    max_tokens: req.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: req.effort, format: betaZodOutputFormat(req.schema) },
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: req.user }],
  });
  const cost = costUsd(res.model, res.usage as Usage);
  if (res.stop_reason === "refusal") throw new AgentRefusal(`Requête déclinée (${res.stop_details?.category ?? "inconnue"})`);
  if (res.stop_reason === "max_tokens") throw new Error("Réponse tronquée (max_tokens atteint)");
  if (res.parsed_output == null) throw new Error("Sortie structurée invalide");
  return { data: res.parsed_output as T, costUsd: cost, model: res.model };
};
