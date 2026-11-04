import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client « service » (contourne la RLS) — réservé aux tâches planifiées techniques
 * (import Search Console). Jamais utilisé pour l'éditorial ni par les agents.
 */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurée");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

/** Vérifie l'en-tête d'une tâche planifiée (Vercel Cron envoie « Authorization: Bearer $CRON_SECRET »). */
export function isAuthorizedCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
