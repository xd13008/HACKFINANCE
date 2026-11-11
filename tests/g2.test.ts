import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { authorLabel, g2ReviewsUrl, importG2Reviews, sentimentOf, shortQuote, toQuote, type G2Review } from "@/lib/g2";

const long = "Nous suivons la trésorerie de trois sociétés chaque matin. ".repeat(10);
const review = (over: Partial<G2Review> = {}): G2Review => ({
  title: "Bon outil", star_rating: 4.5, url: "https://www.g2.com/products/x/reviews/x-review-1", is_public: true,
  published_at: "2026-10-02T10:00:00Z",
  answers: { love: { text: "What do you like best about X?", value: long }, hate: { text: "What do you dislike about X?", value: "Le paramétrage initial est long sans accompagnement." } },
  user: { name: "Michael H.", title: "Directeur financier", company_segment: "180" }, ...over,
});

describe("connecteur G2 (fonctions pures)", () => {
  it("construit l'URL de syndication avec le produit et la clé", () => {
    const u = new URL(g2ReviewsUrl("abc-123", "secret", 2, 50));
    expect(u.origin + u.pathname).toBe("https://data.g2.com/api/2018-01-01/syndication/reviews");
    expect(u.searchParams.get("filter[product_id]")).toBe("abc-123");
    expect(u.searchParams.get("page[number]")).toBe("2");
    expect(u.searchParams.get("api_token")).toBe("secret");
  });
  it("une citation ne dépasse jamais 300 caractères et se coupe proprement", () => {
    const q = shortQuote(long);
    expect(q.length).toBeLessThanOrEqual(300);
    expect(q.endsWith("…")).toBe(true);
    expect(shortQuote("Court et net.")).toBe("Court et net.");
  });
  it("l'auteur est décrit par sa fonction et sa taille d'entreprise, jamais par son nom", () => {
    const label = authorLabel(review());
    expect(label).toBe("Directeur financier, entreprise moyenne");
    expect(label).not.toMatch(/Michael/);
    expect(authorLabel(review({ user: { name: "Vijay K." } }))).toBe("Utilisateur vérifié G2");
  });
  it("cite ce que l'utilisateur aime si l'avis est positif, ce qu'il n'aime pas sinon", () => {
    expect(toQuote(review())!.quote.startsWith("Nous suivons")).toBe(true);
    const neg = toQuote(review({ star_rating: 2 }))!;
    expect(neg.quote).toBe("Le paramétrage initial est long sans accompagnement.");
    expect(neg.sentiment).toBe("negative");
    expect(sentimentOf(3)).toBe("mixed");
  });
  it("écarte les avis non publics, sans lien ou sans date", () => {
    expect(toQuote(review({ is_public: false }))).toBeNull();
    expect(toQuote(review({ url: "http://g2.com/x" }))).toBeNull();
    expect(toQuote(review({ published_at: undefined, submitted_at: undefined }))).toBeNull();
  });
  it("lit aussi le format JSON:API (attributs imbriqués)", () => {
    expect(toQuote({ id: "1", attributes: review() })?.review_date).toBe("2026-10-02");
  });
});

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const reachable = await fetch(`${URL_}/auth/v1/health`, { headers: { apikey: ANON } }).then((r) => r.ok).catch(() => false);

describe.skipIf(!reachable)("import G2 (Supabase local, réponse G2 factice)", () => {
  const AGICAP = "21000000-0000-4000-a000-000000000101";
  let editor: ReturnType<typeof createClient<Database>>;
  const created: string[] = [];

  it("écrit la note et les citations en brouillon, sans doublon, et l'anonyme ne voit rien", async () => {
    editor = createClient<Database>(URL_, ANON, { auth: { persistSession: false } });
    await editor.auth.signInWithPassword({ email: "editeur@exemple.test", password: "demo-local-2026" });
    const page = { meta: { rating: 4.4, record_count: 355, product: { url: "https://www.g2.com/products/agicap/reviews" } },
      data: [review({ url: "https://www.g2.com/products/agicap/reviews/test-1" }), review({ url: "https://www.g2.com/products/agicap/reviews/test-2", star_rating: 2 }), review({ is_public: false })] };
    let calledUrl = "";
    const fetcher = async (u: string) => { calledUrl = u; return { ok: true, status: 200, json: async () => page }; };

    const r1 = await importG2Reviews(editor, AGICAP, "agicap-g2", "secret", fetcher);
    expect(calledUrl).toContain("filter%5Bproduct_id%5D=agicap-g2");
    expect(r1).toMatchObject({ rating: 4.4, reviewCount: 355, quotesAdded: 2, ignored: 1 });
    const r2 = await importG2Reviews(editor, AGICAP, "agicap-g2", "secret", fetcher);
    expect(r2.quotesAdded).toBe(0);

    const { data: src } = await editor.from("review_sources").select("id,status,rating,review_count,review_quotes(id,status,quote,author_label)").eq("software_id", AGICAP).eq("platform", "g2").eq("status", "draft").single();
    expect(src!.review_quotes).toHaveLength(2);
    expect(src!.review_quotes.every((q) => q.status === "draft" && q.quote.length <= 300 && !/Michael/.test(q.author_label))).toBe(true);
    created.push(...src!.review_quotes.map((q) => q.id));

    const anon = createClient<Database>(URL_, ANON, { auth: { persistSession: false } });
    const { data: pub } = await anon.from("review_quotes").select("id").in("id", created);
    expect(pub ?? []).toHaveLength(0);
  });

  it("une clé refusée donne un message clair, sans afficher la clé", async () => {
    const fetcher = async () => ({ ok: false, status: 401, json: async () => ({}) });
    await expect(importG2Reviews(editor, AGICAP, "agicap-g2", "secret", fetcher)).rejects.toThrow(/clé de syndication/);
  });

  afterAll(async () => {
    if (created.length) await editor.from("review_quotes").delete().in("id", created);
  });
});
