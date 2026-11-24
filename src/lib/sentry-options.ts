import type { ErrorEvent, init } from "@sentry/nextjs";

/**
 * Suivi des erreurs (Sentry, région UE). Désactivé sans NEXT_PUBLIC_SENTRY_DSN (développement local, tests).
 * Données personnelles : aucune. Ni utilisateur, ni IP, ni cookies, ni en-têtes, ni corps de requête (formulaires
 * de mise en relation, inscriptions), ni paramètres d'URL, ni données des requêtes SQL, ni contenu des appels aux modèles.
 * Les adresses e-mail restantes dans les messages d'erreur sont masquées avant l'envoi.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const mask = (s: string | undefined) => s?.replace(EMAIL, "[e-mail]");

export function scrub(event: ErrorEvent): ErrorEvent {
  event.message = mask(event.message);
  for (const ex of event.exception?.values ?? []) ex.value = mask(ex.value);
  for (const b of event.breadcrumbs ?? []) b.message = mask(b.message);
  delete event.user;
  if (event.request) { delete event.request.cookies; delete event.request.headers; delete event.request.data; delete event.request.query_string; }
  return event;
}

export const sentryOptions: NonNullable<Parameters<typeof init>[0]> = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: process.env.SENTRY_DEBUG === "1",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: {
    userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
    databaseQueryData: false, stackFrameVariables: false, genAI: { inputs: false, outputs: false },
  },
  beforeSend: scrub,
};
