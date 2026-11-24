import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Navigateur : erreurs seulement. Ni traces, ni enregistrement de session (Replay), ni cookie, ni stockage local.
Sentry.init({ ...sentryOptions, tracesSampleRate: 0 });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
