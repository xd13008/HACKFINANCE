import { getSite } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  if (!site) return new Response("Not found", { status: 404 });
  const live = site.status === "live" && process.env.NODE_ENV === "production" && process.env.ALLOW_INDEXING === "true";
  // Assistants et moteurs IA explicitement autorisés : être cité dans leurs réponses fait partie de la stratégie (GEO).
  const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot",
                  "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "MistralAI-User"];
  const rules = "Allow: /\nAllow: /api/og\nAllow: /api/icon\nDisallow: /admin\nDisallow: /api/\nDisallow: /signaler-une-erreur\n";
  const body = live
    ? `User-agent: *\n${rules}\n${aiBots.map((b) => `User-agent: ${b}`).join("\n")}\n${rules}\nSitemap: ${siteUrl(site)}/sitemap.xml\n`
    : `# Indexation désactivée hors production (ALLOW_INDEXING=true pour l'activer)\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
