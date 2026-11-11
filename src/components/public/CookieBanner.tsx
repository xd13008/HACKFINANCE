"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const VERSION = "v1";
export const OPEN_EVENT = "rf:cookies";

function current(): "1" | "0" | null {
  const m = document.cookie.match(/(?:^|;\s*)rf_consent=([^;]+)/);
  if (!m || !m[1].startsWith(`${VERSION}.`)) return null;
  return m[1].endsWith(".1") ? "1" : "0";
}

/**
 * Bandeau de consentement (CNIL) : « Tout refuser » aussi visible que « Tout accepter », choix détaillé possible,
 * aucun cookie de personnalisation avant l'accord, choix redemandé après 6 mois, modifiable à tout moment (pied de page).
 * Seule finalité soumise à consentement : rattacher la navigation et les recherches au profil du lecteur.
 * La mesure d'audience anonyme, sans cookie, n'en dépend pas.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [perso, setPerso] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = current();
    setPerso(c === "1");
    if (c === null) setOpen(true);
    const reopen = () => { setPerso(current() === "1"); setDetail(true); setOpen(true); };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  async function choose(personalisation: boolean) {
    setBusy(true);
    try {
      await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personalisation }) });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!open) return null;
  const btn = "min-h-11 px-4 rounded-lg text-sm font-semibold border disabled:opacity-60";
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookies-title"
         className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="max-w-3xl mx-auto rounded-xl border border-line bg-white shadow-lg p-4 sm:p-5 text-sm space-y-3">
        <p id="cookies-title" className="font-bold text-base">Vos choix sur les cookies</p>
        <p className="text-ink-2">
          Nous mesurons l&apos;audience sans cookie. Avec votre accord, nous enregistrons aussi les pages consultées et vos recherches
          pour personnaliser vos sélections et, si vous créez un compte, compléter votre profil. Rien n&apos;est vendu ni transmis à des tiers.{" "}
          <Link href="/cookies" className="underline">En savoir plus</Link>
        </p>
        {detail && (
          <ul className="space-y-2 border-t border-line pt-3">
            <li className="flex gap-3 items-start">
              <input type="checkbox" checked disabled className="mt-1" aria-label="Cookies nécessaires (toujours actifs)" />
              <span><strong>Nécessaires</strong> : mémoriser ce choix et votre connexion à « Mon espace ». Toujours actifs.</span>
            </li>
            <li className="flex gap-3 items-start">
              <input id="perso" type="checkbox" checked={perso} onChange={(e) => setPerso(e.target.checked)} className="mt-1" />
              <label htmlFor="perso"><strong>Personnalisation</strong> : rattacher les pages consultées et vos recherches « Trouver » à votre navigateur, puis à votre compte. Durée : 6 mois.</label>
            </li>
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => choose(false)} className={`${btn} border-ink bg-white text-ink`}>Tout refuser</button>
          {detail
            ? <button type="button" disabled={busy} onClick={() => choose(perso)} className={`${btn} border-ink bg-white text-ink`}>Enregistrer mes choix</button>
            : <button type="button" onClick={() => setDetail(true)} className={`${btn} border-line bg-white text-ink`}>Personnaliser</button>}
          <button type="button" disabled={busy} onClick={() => choose(true)} className={`${btn} border-ink bg-ink text-white`}>Tout accepter</button>
        </div>
      </div>
    </div>
  );
}

/** Lien du pied de page pour rouvrir le bandeau. */
export function CookieSettingsLink() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="text-left hover:underline">Gérer mes cookies</button>;
}
