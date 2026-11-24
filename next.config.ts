import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { applyPreviewEnv } from "./src/lib/preview-env.mjs";

// Site de test : la base de test (préfixe TEST) remplace la base de production avant que Next n'intègre
// les variables NEXT_PUBLIC_* au code. Sans effet en production.
const copied = applyPreviewEnv();
const inline = Object.fromEntries(copied.filter((k) => k.startsWith("NEXT_PUBLIC_")).map((k) => [k, process.env[k]!]));

const nextConfig: NextConfig = {
  ...(Object.keys(inline).length ? { env: inline } : {}),
};

// Suivi des erreurs : envoi des « source maps » à Sentry seulement si SENTRY_AUTH_TOKEN est défini (piles d'appel lisibles).
export default withSentryConfig(nextConfig, {
  org: "chance-consulting",
  project: "portails-media",
  sentryUrl: "https://de.sentry.io",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
