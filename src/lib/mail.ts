/**
 * Envoi des e-mails transactionnels (confirmation d'inscription, lien de connexion) par l'API Brevo.
 * Clé BREVO_API_KEY et expéditeur MAIL_FROM (« Radar Finances <bonjour@radarfinances.com> ») côté serveur.
 * Sans clé : en local, le lien est écrit dans le journal du serveur ; en production, l'envoi échoue proprement.
 */
export type Mail = { to: string; subject: string; text: string };
export type Mailer = (m: Mail) => Promise<{ ok: boolean; error?: string }>;

export function parseFrom(raw: string | undefined) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(raw ?? "");
  return m ? { name: m[1] || undefined, email: m[2] } : raw ? { email: raw.trim() } : null;
}

export const brevoMailer: Mailer = async ({ to, subject, text }) => {
  const key = process.env.BREVO_API_KEY;
  const sender = parseFrom(process.env.MAIL_FROM);
  if (!key || !sender) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail local] à ${to} — ${subject}\n${text}`);
      return { ok: true };
    }
    return { ok: false, error: "Envoi d'e-mail non configuré" };
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text }),
  });
  return res.ok ? { ok: true } : { ok: false, error: `Brevo ${res.status}` };
};
