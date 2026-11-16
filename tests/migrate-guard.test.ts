import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/** Le site de test (versions « preview ») ne doit jamais écrire dans la base de production. */
const run = (env: Record<string, string>) =>
  execFileSync("node", ["scripts/migrate-prod.mjs"], { env: { PATH: process.env.PATH!, ...env } as unknown as NodeJS.ProcessEnv, encoding: "utf8", timeout: 20_000 });

describe("déploiement : protection de la base de production", () => {
  it("une version de test reliée à la base de production n'écrit rien", () => {
    // Hôte injoignable : si le script tentait de se connecter, il échouerait au lieu de sortir proprement.
    const out = run({ VERCEL_ENV: "preview", POSTGRES_URL_NON_POOLING: "postgresql://postgres.ngcjecjwjztkdkfuszly:x@127.0.0.1:1/postgres" });
    expect(out).toContain("aucune écriture");
  });
  it("la détection passe aussi par l'URL Supabase", () => {
    const out = run({ VERCEL_ENV: "preview", POSTGRES_URL_NON_POOLING: "postgresql://u:x@127.0.0.1:1/postgres",
      NEXT_PUBLIC_SUPABASE_URL: "https://ngcjecjwjztkdkfuszly.supabase.co" });
    expect(out).toContain("aucune écriture");
  });
  it("hors Vercel, rien n'est exécuté", () => {
    expect(run({})).toContain("ignoré");
  });
});
