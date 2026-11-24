import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrub, sentryOptions } from "@/lib/sentry-options";

describe("Sentry : aucune donnée personnelle envoyée", () => {
  it("masque les e-mails et retire utilisateur, cookies, en-têtes, corps et paramètres", () => {
    const e = scrub({
      type: undefined, message: "Échec pour jean.dupont@societe.fr",
      exception: { values: [{ type: "Error", value: "duplicate key: a.b@c.io" }] },
      breadcrumbs: [{ message: "envoi à x@y.fr" }],
      user: { id: "1", email: "u@v.fr", ip_address: "1.2.3.4" },
      request: { url: "https://radarfinances.com/mise-en-relation", cookies: { rf_vid: "x" }, headers: { cookie: "x" }, data: { email: "z@z.fr" }, query_string: "e=z@z.fr" },
    } as ErrorEvent);
    expect(JSON.stringify(e)).not.toMatch(/@(societe|c|y|v|z)\./);
    expect(e.message).toBe("Échec pour [e-mail]");
    expect(e.user).toBeUndefined();
    expect(e.request).toEqual({ url: "https://radarfinances.com/mise-en-relation" });
  });
  it("désactivé sans DSN et sans collecte automatique", () => {
    expect(sentryOptions.enabled).toBe(!!process.env.NEXT_PUBLIC_SENTRY_DSN);
    expect(sentryOptions.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false });
  });
});
