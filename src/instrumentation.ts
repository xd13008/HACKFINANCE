import { applyPreviewEnv } from "@/lib/preview-env.mjs";

/** Au démarrage du serveur : sur le site de test, réglages de la base de test (préfixe TEST) sous leurs noms habituels. */
export function register() {
  applyPreviewEnv();
}
