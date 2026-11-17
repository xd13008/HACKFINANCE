import { describe, expect, it } from "vitest";
import { applyPreviewEnv } from "@/lib/preview-env.mjs";

describe("site de test : réglages de la base de test (préfixe TEST)", () => {
  it("copie les réglages TEST sous leurs noms habituels, sur une version preview", () => {
    const env: Record<string, string | undefined> = {
      VERCEL_ENV: "preview", TEST_SUPABASE_SERVICE_ROLE_KEY: "s", NEXT_PUBLIC_TEST_SUPABASE_URL: "https://test.supabase.co",
      TEST_POSTGRES_URL_NON_POOLING: "postgres://test", NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
    };
    expect(applyPreviewEnv(env)).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "POSTGRES_URL_NON_POOLING", "SUPABASE_SERVICE_ROLE_KEY"]);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("s");
  });
  it("ne touche à rien en production", () => {
    const env: Record<string, string | undefined> = { VERCEL_ENV: "production", TEST_SUPABASE_URL: "x", SUPABASE_URL: "prod" };
    expect(applyPreviewEnv(env)).toEqual([]);
    expect(env.SUPABASE_URL).toBe("prod");
  });
});
