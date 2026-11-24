import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Serveur Node : erreurs et 10 % des traces (pages, actions serveur, tâches planifiées, agents).
Sentry.init({ ...sentryOptions, tracesSampleRate: 0.1 });
