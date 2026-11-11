import { z } from "zod";
import type { Db, AgentResult } from "./runner";
import type { Llm } from "./llm";
import { asDocument, keepKnownSources } from "./text";
import { REDACTION_SYSTEM } from "./prompts";

export const DraftOutput = z.object({
  meta_title: z.string(),
  meta_description: z.string(),
  h1: z.string(),
  summary: z.string(),
  body: z.string().describe("Corps en Markdown, titres ##"),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  sources_used: z.array(z.object({ url: z.string(), title: z.string() })),
});

/** Rédige un brouillon pour un contenu doté d'un brief SEO. Le brouillon est soumis seulement si la checklist SEO passe. */
export async function draftContent(deps: { db: Db; llm: Llm }, contentItemId: string): Promise<AgentResult> {
  const { db, llm } = deps;
  const { data: item } = await db.from("content_items").select("*").eq("id", contentItemId).single();
  if (!item) throw new Error("Contenu introuvable");
  const { data: brief } = await db.from("seo_briefs").select("*").eq("content_item_id", item.id).maybeSingle();
  if (!brief) throw new Error("Aucun brief SEO : l'éditeur doit d'abord valider un brief");
  const { data: existingDraft } = await db.from("content_versions").select("id").eq("content_item_id", item.id).in("status", ["draft", "submitted"]).limit(1);
  if (existingDraft?.length) return { summary: "Un brouillon ou une version soumise existe déjà : rien à faire", output: { skipped: true } };

  const [{ data: category }, { data: pages }, { data: live }] = await Promise.all([
    item.category_id ? db.from("categories").select("name,criteria").eq("id", item.category_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("published_content").select("path,h1,type").eq("site_id", item.site_id).neq("path", item.path).limit(80),
    item.published_version_id ? db.from("content_versions").select("body,summary").eq("id", item.published_version_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const softwareIds = [item.software_id, item.software_b_id].filter(Boolean) as string[];
  if (!softwareIds.length && item.category_id) {
    const { data: rk } = await db.from("editorial_rankings").select("software_id").eq("category_id", item.category_id);
    softwareIds.push(...(rk ?? []).map((r) => r.software_id!));
  }
  const [{ data: sw }, { data: facts }, { data: plans }, { data: tests }] = await Promise.all([
    softwareIds.length ? db.from("software").select("id,name,vendor,tagline,website,is_fictional").in("id", softwareIds) : Promise.resolve({ data: [] }),
    softwareIds.length ? db.from("software_facts").select("software_id,fact_type,value,source_url,collected_at").in("software_id", softwareIds).eq("status", "validated") : Promise.resolve({ data: [] }),
    softwareIds.length ? db.from("pricing_plans").select("software_id,plan_name,price_eur,billing_period,per_unit,conditions,source_url,source_date").in("software_id", softwareIds).eq("status", "validated") : Promise.resolve({ data: [] }),
    softwareIds.length ? db.from("software_category_scores").select("software_id,overall_score,criteria_scores,tested_at").in("software_id", softwareIds) : Promise.resolve({ data: [] }),
  ]);
  const { data: liveSources } = item.published_version_id
    ? await db.from("content_sources").select("url,title").eq("content_version_id", item.published_version_id)
    : { data: [] as { url: string; title: string | null }[] };
  const { data: verdicts } = softwareIds.length
    ? await db.from("test_runs").select("software_id,verdict,pros,cons,best_for").in("software_id", softwareIds).eq("status", "validated")
    : { data: [] };

  const { data: questions } = item.cluster
    ? await db.from("keyword_questions").select("question,volume").eq("site_id", item.site_id).eq("cluster", item.cluster).order("volume", { ascending: false }).limit(12)
    : { data: [] as { question: string; volume: number }[] };

  // Charte : un test ouvre sur des comparatifs (matchs avec les solutions testées de la même catégorie, alternatives)
  let matches: { chemin: string; titre: string }[] = [];
  if (item.type === "software_review" && item.software_id && item.category_id) {
    const { data: rk } = await db.from("editorial_rankings").select("software_id").eq("category_id", item.category_id);
    const ids = [...new Set([item.software_id, ...(rk ?? []).map((r) => r.software_id!)])];
    const { data: named } = await db.from("software").select("id,slug,name").in("id", ids);
    const self = (named ?? []).find((x) => x.id === item.software_id);
    if (self && (rk ?? []).some((r) => r.software_id === self.id)) {
      matches = (named ?? []).filter((x) => x.id !== self.id).map((x) => ({ chemin: `/comparer/${[self.slug, x.slug].sort().join("-vs-")}`, titre: `${self.name} vs ${x.name}` }));
    }
  }

  const knownUrls = [...(facts ?? []).map((f) => f.source_url), ...(plans ?? []).map((p) => p.source_url), ...(liveSources ?? []).map((s) => s.url)];
  const context = {
    type: item.type, path: item.path, cluster: item.cluster,
    brief: { requete_principale: brief.primary_keyword, secondaires: brief.secondary_keywords, questions: brief.questions, plan: brief.outline, mots: brief.target_words, cta: brief.cta },
    categorie: category, logiciels: sw, faits_valides: facts, offres_validees: plans, tests_valides: tests, verdicts_des_tests: verdicts,
    questions_des_internautes: (questions ?? []).map((q) => `${q.question} (${q.volume}/mois)`),
    chemins_internes_disponibles: (pages ?? []).map((p) => ({ chemin: p.path, titre: p.h1 })),
    matchs_a_proposer: matches,
    sources_connues: knownUrls,
  };

  const { data } = await llm({
    system: REDACTION_SYSTEM,
    effort: "high",
    maxTokens: 16000,
    schema: DraftOutput,
    user: `Données (JSON) :\n${asDocument("donnees", JSON.stringify(context, null, 1))}${live ? `\n\nVersion actuellement en ligne, à mettre à jour :\n${asDocument("version-en-ligne", `${live.summary}\n\n${live.body}`)}` : ""}\n\nRédige le brouillon.`,
  });

  const { data: { user } } = await db.auth.getUser();
  const { data: version, error } = await db.from("content_versions").insert({
    content_item_id: item.id, version_no: 0, author_id: user!.id, author_kind: "agent",
    meta_title: data.meta_title.slice(0, 70), meta_description: data.meta_description.slice(0, 170), h1: data.h1, summary: data.summary,
    body: data.body.replace(/(^|\n)# /g, "$1## "), faq: data.faq as never,
  }).select("id").single();
  if (error) throw new Error(`Écriture du brouillon impossible : ${error.message}`);

  const sources = keepKnownSources(data.sources_used, knownUrls);
  if (sources.length) {
    const { error: sErr } = await db.from("content_sources").insert(sources.map((s) => ({
      content_version_id: version.id, url: s.url, title: s.title, accessed_at: new Date().toISOString().slice(0, 10),
    })));
    if (sErr) throw new Error(`Écriture des sources impossible : ${sErr.message}`);
  }

  const { data: report } = await db.rpc("seo_check", { p_version: version.id });
  const passed = (report as { passed?: boolean } | null)?.passed === true;
  if (passed) {
    const { error: subErr } = await db.rpc("submit_version", { p_version: version.id });
    if (subErr) throw new Error(`Soumission impossible : ${subErr.message}`);
  } else {
    await db.from("review_tasks").insert({
      site_id: item.site_id, kind: "seo", content_item_id: item.id, content_version_id: version.id, created_by: user!.id,
      reason: "Brouillon rédigé par l'agent : checklist SEO à compléter avant soumission", details: { report } as never,
    });
  }
  return {
    summary: passed ? `Brouillon rédigé et soumis à validation (${item.path})` : `Brouillon rédigé, checklist SEO à compléter (${item.path})`,
    output: { content_item_id: item.id, version_id: version.id, submitted: passed, sources_kept: sources.length, sources_dropped: data.sources_used.length - sources.length },
  };
}
