import * as Sentry from "@sentry/nextjs";
import { applyPreviewEnv } from "@/lib/preview-env.mjs";

/** Au démarrage du serveur : réglages du site de test (préfixe TEST) sous leurs noms habituels, puis suivi des erreurs. */
export async function register() {
  applyPreviewEnv();
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Erreurs des composants serveur, du middleware et des routes.
export const onRequestError = Sentry.captureRequestError;
