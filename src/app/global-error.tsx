"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Erreur non rattrapée dans un rendu : signalée à Sentry, page sobre en français. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1>Une erreur est survenue</h1>
        <p>L&apos;équipe technique est prévenue. Vous pouvez réessayer.</p>
        <button type="button" onClick={reset} style={{ padding: "0.6rem 1.2rem", marginTop: "1rem" }}>Réessayer</button>
      </body>
    </html>
  );
}
