/**
 * Site de test (versions « preview » de Vercel) : la base de test est connectée avec le préfixe TEST
 * (TEST_SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_TEST_SUPABASE_URL…), la base de production ne servant que la production.
 * Copie ces réglages sous les noms attendus par le code (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL…).
 * Sans effet hors preview : la production n'est jamais touchée.
 * Utilisé par next.config.ts (build), src/instrumentation.ts (exécution) et scripts/migrate-prod.mjs (migrations).
 * @param {Record<string, string | undefined>} env
 * @returns {string[]} noms copiés
 */
export function applyPreviewEnv(env = process.env) {
  if (env.VERCEL_ENV !== "preview") return [];
  const copied = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    const target = key.startsWith("NEXT_PUBLIC_TEST_") ? `NEXT_PUBLIC_${key.slice("NEXT_PUBLIC_TEST_".length)}`
      : key.startsWith("TEST_") ? key.slice("TEST_".length) : null;
    if (target) { env[target] = value; copied.push(target); }
  }
  return copied.sort();
}
