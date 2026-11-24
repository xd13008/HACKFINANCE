import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Middleware (domaine → portail) : erreurs et 10 % des traces.
Sentry.init({ ...sentryOptions, tracesSampleRate: 0.1 });
