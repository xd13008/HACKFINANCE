import { publicClient } from "@/lib/supabase/public";
import { getSite } from "@/lib/data";
import { absoluteUrl, CONTENT_TYPE_LABEL } from "@/lib/seo";

export const revalidate = 3600;

/** Index lisible par les assistants IA (proposition llms.txt) : pages clés et méthode. */
export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  if (!site) return new Response("Not found", { status: 404 });
  const { data } = await publicClient().from("published_content").select("path,type,h1,meta_description")
    .eq("site_id", site.id).eq("robots", "index").in("type", ["category_ranking", "pillar", "guide", "simulator", "duel", "software_review", "page"]);
  const groups = new Map<string, string[]>();
  for (const p of data ?? []) {
    const k = CONTENT_TYPE_LABEL[p.type!] ?? "Pages";
    groups.set(k, [...(groups.get(k) ?? []), `- [${p.h1}](${absoluteUrl(site, p.path!)}): ${p.meta_description}`]);
  }
  const body = `# ${site.name}\n\n> ${site.description}\n\nNotes issues de tests réels validés par un humain ; positions sponsorisées signalées et séparées du classement. Méthode : ${absoluteUrl(site, "/methode")}\n\n${[...groups].map(([k, v]) => `## ${k}\n\n${v.join("\n")}`).join("\n\n")}\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
