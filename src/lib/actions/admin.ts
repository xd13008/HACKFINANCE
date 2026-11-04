"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin";
import { normalizeUrl } from "@/lib/checks";

export type ActionResult = { ok: boolean; message: string };
const ok = (message: string): ActionResult => ({ ok: true, message });
const ko = (message: string): ActionResult => ({ ok: false, message });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

async function db() {
  await requireStaff();
  return serverClient();
}

/** Après publication : revalidation immédiate de la page publique (ISR). */
async function revalidatePublic(contentItemId: string) {
  const c = await serverClient();
  const { data } = await c.from("content_items").select("path,sites(key)").eq("id", contentItemId).maybeSingle();
  const key = (data?.sites as unknown as { key: string } | null)?.key;
  if (data?.path && key) {
    revalidatePath(`/s/${key}${data.path === "/" ? "" : data.path}`);
    revalidatePath(`/s/${key}`, "layout");
  }
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------
export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await serverClient();
  const { error } = await c.auth.signInWithPassword({ email: str(fd, "email"), password: str(fd, "password") });
  if (error) return ko("Identifiants invalides.");
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  const c = await serverClient();
  await c.auth.signOut();
  redirect("/admin/login");
}

export async function selectSite(fd: FormData) {
  const key = str(fd, "site");
  const store = await cookies();
  if (key) store.set("bo_site", key, { path: "/admin", httpOnly: true, sameSite: "lax" });
  else store.delete("bo_site");
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// File de validation
// ---------------------------------------------------------------------------
export async function submitVersion(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "version_id");
  const { error } = await c.rpc("submit_version", { p_version: id });
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Version soumise à la file de validation.");
}

export async function approveVersion(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "version_id");
  const { data: v } = await c.from("content_versions").select("content_item_id").eq("id", id).maybeSingle();
  const { error } = await c.rpc("approve_version", { p_version: id, p_comment: opt(fd, "comment") ?? undefined });
  if (error) return ko(error.message);
  if (v) await revalidatePublic(v.content_item_id);
  revalidatePath("/admin", "layout");
  return ok("Publié. La page publique est revalidée.");
}

export async function rejectVersion(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.rpc("reject_version", { p_version: str(fd, "version_id"), p_comment: str(fd, "comment") });
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Version renvoyée en brouillon avec le motif.");
}

export async function blockItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "item_id");
  const { error } = await c.rpc("block_item", { p_item: id, p_reason: str(fd, "reason") || "Revue de conformité" });
  if (!error) await revalidatePublic(id);
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Contenu bloqué : il n'est plus visible.");
}

export async function unblockItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "item_id");
  const { error } = await c.rpc("unblock_item", { p_item: id });
  if (!error) await revalidatePublic(id);
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Contenu débloqué.");
}

export async function unpublishItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "item_id");
  const { error } = await c.rpc("unpublish_item", { p_item: id, p_reason: str(fd, "reason") || "Dépublié" });
  if (!error) await revalidatePublic(id);
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Contenu dépublié.");
}

// ---------------------------------------------------------------------------
// Contenus
// ---------------------------------------------------------------------------
export async function createContent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const siteId = str(fd, "site_id");
  const type = str(fd, "type");
  const slug = str(fd, "slug");
  const keyword = opt(fd, "keyword");
  let kwId: string | null = null;
  if (keyword) {
    const { data: kw } = await c.from("keyword_targets").select("id,target_content_id").eq("site_id", siteId).eq("keyword", keyword).maybeSingle();
    if (kw?.target_content_id) return ko("Ce mot-clé cible déjà une autre page (anti-cannibalisation).");
    if (kw) kwId = kw.id;
    else {
      const { data: created, error } = await c.from("keyword_targets").insert({ site_id: siteId, keyword, source: "manuel" }).select("id").single();
      if (error) return ko(error.message);
      kwId = created.id;
    }
  }
  const softwareId = opt(fd, "software_id");
  const { data: item, error } = await c.from("content_items").insert({
    site_id: siteId, type: type as never, slug, title: str(fd, "title") || slug, software_id: softwareId,
    software_b_id: opt(fd, "software_b_id"), category_id: opt(fd, "category_id"), cluster: opt(fd, "cluster"),
    primary_keyword_id: kwId, created_by: me.id,
  }).select("id").single();
  if (error) return ko(error.message);
  if (kwId) await c.from("keyword_targets").update({ target_content_id: item.id, status: "in_progress" }).eq("id", kwId);
  const { error: vErr } = await c.from("content_versions").insert({ content_item_id: item.id, version_no: 0, h1: str(fd, "title"), author_id: me.id });
  if (vErr) return ko(vErr.message);
  redirect(`/admin/contenus/${item.id}`);
}

export async function newDraftFromPublished(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const itemId = str(fd, "item_id");
  const { data: existing } = await c.from("content_versions").select("id").eq("content_item_id", itemId).eq("status", "draft").maybeSingle();
  if (existing) return ok("Un brouillon existe déjà.");
  const { data: item } = await c.from("content_items").select("published_version_id").eq("id", itemId).single();
  const { data: base } = item?.published_version_id
    ? await c.from("content_versions").select("*").eq("id", item.published_version_id).single()
    : { data: null };
  const { data: v, error } = await c.from("content_versions").insert({
    content_item_id: itemId, version_no: 0, author_id: me.id,
    meta_title: base?.meta_title ?? "", meta_description: base?.meta_description ?? "", h1: base?.h1 ?? "",
    summary: base?.summary ?? "", body: base?.body ?? "", faq: base?.faq ?? [], data: base?.data ?? {},
  }).select("id").single();
  if (error) return ko(error.message);
  if (base) {
    const { data: srcs } = await c.from("content_sources").select("url,title,accessed_at,excerpt").eq("content_version_id", base.id);
    if (srcs?.length) await c.from("content_sources").insert(srcs.map((s) => ({ ...s, content_version_id: v.id })));
  }
  revalidatePath(`/admin/contenus/${itemId}`);
  return ok("Nouveau brouillon créé à partir de la version en ligne.");
}

export async function saveDraft(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "version_id");
  let faq: unknown = [];
  let data: unknown = {};
  try { faq = JSON.parse(str(fd, "faq") || "[]"); data = JSON.parse(str(fd, "data") || "{}"); }
  catch { return ko("FAQ ou données : JSON invalide."); }
  const { error, count } = await c.from("content_versions").update({
    meta_title: str(fd, "meta_title"), meta_description: str(fd, "meta_description"), h1: str(fd, "h1"),
    summary: str(fd, "summary"), body: String(fd.get("body") ?? ""), faq: faq as never, data: data as never,
  }, { count: "exact" }).eq("id", id).eq("status", "draft");
  revalidatePath(`/admin/contenus`, "layout");
  if (error) return ko(error.message);
  return count ? ok("Brouillon enregistré.") : ko("Seul un brouillon est modifiable.");
}

export async function addSource(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.from("content_sources").insert({
    content_version_id: str(fd, "version_id"), url: normalizeUrl(str(fd, "url")), title: opt(fd, "title"),
    accessed_at: str(fd, "accessed_at") || new Date().toISOString().slice(0, 10), excerpt: opt(fd, "excerpt"),
  });
  revalidatePath(`/admin/contenus`, "layout");
  return error ? ko(error.message) : ok("Source ajoutée.");
}

export async function removeSource(fd: FormData) {
  const c = await db();
  await c.from("content_sources").delete().eq("id", str(fd, "source_id"));
  revalidatePath(`/admin/contenus`, "layout");
}

export async function saveBrief(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const lines = (k: string) => str(fd, k).split("\n").map((s) => s.trim()).filter(Boolean);
  const { error } = await c.from("seo_briefs").upsert({
    content_item_id: str(fd, "item_id"), primary_keyword: str(fd, "primary_keyword"),
    secondary_keywords: lines("secondary_keywords"), questions: lines("questions"),
    outline: lines("outline").map((t) => ({ level: t.startsWith("###") ? 3 : 2, text: t.replace(/^#+\s*/, "") })),
    entities: lines("entities"), target_words: Number(str(fd, "target_words")) || null, cta: opt(fd, "cta"), created_by: me.id,
  }, { onConflict: "content_item_id" });
  revalidatePath(`/admin/contenus`, "layout");
  return error ? ko(error.message) : ok("Brief SEO enregistré.");
}

export async function updateItemSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.from("content_items").update({
    slug: str(fd, "slug"), robots: str(fd, "robots") as "index" | "noindex", cluster: opt(fd, "cluster"),
    pillar_id: opt(fd, "pillar_id"), category_id: opt(fd, "category_id"),
  }).eq("id", str(fd, "item_id"));
  if (!error) await revalidatePublic(str(fd, "item_id"));
  revalidatePath(`/admin`, "layout");
  return error ? ko(error.message) : ok("Réglages enregistrés (une redirection 301 est créée si le slug d'une page publiée change).");
}

// ---------------------------------------------------------------------------
// Catalogue, faits, prix
// ---------------------------------------------------------------------------
export async function createSoftware(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const { data, error } = await c.from("software").insert({
    vendor: str(fd, "vendor"), name: str(fd, "name"), slug: str(fd, "slug"), website: opt(fd, "website") && normalizeUrl(str(fd, "website")),
    tagline: opt(fd, "tagline"), created_by: me.id,
  }).select("id").single();
  if (error) return ko(error.message);
  const cat = opt(fd, "category_id");
  if (cat) await c.from("software_categories").insert({ software_id: data.id, category_id: cat, is_primary: true });
  redirect(`/admin/catalogue/${data.id}`);
}

export async function publishSoftwareListing(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.from("software").update({ status: "published" }).eq("id", str(fd, "software_id"));
  revalidatePath("/admin/catalogue", "layout");
  return error ? ko(error.message) : ok("Fiche publiée (« référencé, non testé », non indexée tant qu'elle n'a pas de contenu).");
}

export async function addFact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  let value: unknown;
  try { value = JSON.parse(str(fd, "value")); } catch { value = str(fd, "value"); }
  const { error } = await c.from("software_facts").insert({
    software_id: str(fd, "software_id"), fact_type: str(fd, "fact_type"), value: value as never,
    source_url: normalizeUrl(str(fd, "source_url")), status: "draft", created_by: me.id,
  });
  revalidatePath("/admin/catalogue", "layout");
  return error ? ko(error.message) : ok("Fait ajouté en brouillon : validez-le pour le publier.");
}

export async function decideFact(fd: FormData) {
  const c = await db();
  const id = str(fd, "fact_id");
  const decision = str(fd, "decision") === "validate" ? "validated" : "rejected";
  const { data: f } = await c.from("software_facts").select("software_id,fact_type").eq("id", id).single();
  if (decision === "validated" && f) {
    await c.from("software_facts").update({ status: "superseded" }).eq("software_id", f.software_id).eq("fact_type", f.fact_type).eq("status", "validated");
  }
  await c.from("software_facts").update({ status: decision }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function addPricing(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const price = str(fd, "price_eur");
  const { error } = await c.from("pricing_plans").insert({
    software_id: str(fd, "software_id"), plan_name: str(fd, "plan_name"), price_eur: price === "" ? null : Number(price),
    billing_period: str(fd, "billing_period") || "month", per_unit: opt(fd, "per_unit"), conditions: opt(fd, "conditions"),
    source_url: normalizeUrl(str(fd, "source_url")), source_date: str(fd, "source_date") || new Date().toISOString().slice(0, 10),
    status: "validated", created_by: me.id,
  });
  revalidatePath("/admin/catalogue", "layout");
  return error ? ko(error.message) : ok("Offre ajoutée.");
}

// ---------------------------------------------------------------------------
// Tests et notation
// ---------------------------------------------------------------------------
export async function createTestRun(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const { data, error } = await c.from("test_runs").insert({
    software_id: str(fd, "software_id"), category_id: str(fd, "category_id"), tester_id: me.id,
    tested_at: str(fd, "tested_at") || new Date().toISOString().slice(0, 10), product_version: opt(fd, "product_version"),
    protocol: str(fd, "protocol"), requested_by_vendor: fd.get("requested_by_vendor") === "on",
  }).select("id").single();
  if (error) return ko(error.message);
  redirect(`/admin/tests/${data.id}`);
}

export async function saveTestRun(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const id = str(fd, "test_run_id");
  const lines = (k: string) => str(fd, k).split("\n").map((s) => s.trim()).filter(Boolean);
  const evidence = lines("evidence").map((l) => { const [label, path] = l.split("|").map((s) => s.trim()); return { label, path: path ?? label }; });
  const { error } = await c.from("test_runs").update({
    verdict: opt(fd, "verdict"), pros: lines("pros"), cons: lines("cons"), best_for: opt(fd, "best_for"), protocol: str(fd, "protocol"),
    evidence, status: fd.get("completed") === "on" ? "completed" : "draft",
  }).eq("id", id);
  if (error) return ko(error.message);
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("score_")) continue;
    const key = k.slice(6);
    const val = String(v).replace(",", ".");
    if (val === "") continue;
    const { error: sErr } = await c.from("scores").upsert(
      { test_run_id: id, criterion_key: key, score: Number(val), justification: str(fd, `just_${key}`) || "—" },
      { onConflict: "test_run_id,criterion_key" });
    if (sErr) return ko(sErr.message);
  }
  revalidatePath(`/admin/tests/${id}`);
  return ok("Test enregistré.");
}

export async function validateTestRun(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.rpc("validate_test_run", { p_test_run: str(fd, "test_run_id") });
  revalidatePath("/admin", "layout");
  if (!error) revalidatePath("/s", "layout");
  return error ? ko(error.message) : ok("Test validé : les notes sont publiées et le classement mis à jour.");
}

// ---------------------------------------------------------------------------
// Demandes de référencement, signalements
// ---------------------------------------------------------------------------
export async function decideListingRequest(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const id = str(fd, "request_id");
  const decision = str(fd, "decision");
  const { data: r } = await c.from("listing_requests").select("*").eq("id", id).single();
  if (!r) return ko("Demande introuvable.");
  if (decision === "reject") {
    const { error } = await c.from("listing_requests").update({ status: "rejected", decided_by: me.id, decided_at: new Date().toISOString(), decision_comment: opt(fd, "comment") }).eq("id", id);
    revalidatePath("/admin/demandes");
    return error ? ko(error.message) : ok("Demande refusée.");
  }
  const slug = (str(fd, "slug") || (r.product_name ?? r.company_name)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let created: { software?: string; provider?: string } = {};
  if (r.kind === "software") {
    const { data, error } = await c.from("software").insert({ vendor: r.company_name, name: r.product_name ?? r.company_name, slug, website: r.website, created_by: me.id }).select("id").single();
    if (error) return ko(error.message);
    if (r.category_id) await c.from("software_categories").insert({ software_id: data.id, category_id: r.category_id, is_primary: true });
    created = { software: data.id };
  } else {
    const { data, error } = await c.from("providers").insert({
      name: r.company_name, slug, profession: r.profession ?? "conseil-cession", siren: r.siren, website: r.website, city: r.city,
      city_slug: r.city ? r.city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") : null,
      internal_contact: { name: r.contact_name, email: r.contact_email, role: r.contact_role },
    }).select("id").single();
    if (error) return ko(error.message);
    if (r.category_id) await c.from("provider_categories").insert({ provider_id: data.id, category_id: r.category_id });
    created = { provider: data.id };
  }
  await c.from("listing_requests").update({
    status: "accepted", decided_by: me.id, decided_at: new Date().toISOString(), decision_comment: opt(fd, "comment"),
    created_software_id: created.software ?? null, created_provider_id: created.provider ?? null,
  }).eq("id", id);
  await c.from("review_tasks").update({ status: "done", decision: "accepted", closed_at: new Date().toISOString() })
    .eq("kind", "listing").contains("details", { listing_request_id: id });
  revalidatePath("/admin", "layout");
  redirect(created.software ? `/admin/catalogue/${created.software}` : `/admin/prestataires`);
}

export async function updateErrorReport(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const { error } = await c.from("error_reports").update({ status: str(fd, "status") as never, response: opt(fd, "response"), handled_by: me.id }).eq("id", str(fd, "report_id"));
  revalidatePath("/admin/demandes");
  return error ? ko(error.message) : ok("Signalement mis à jour.");
}

export async function verifyProvider(fd: FormData) {
  const c = await db();
  const me = await requireStaff();
  const verified = str(fd, "decision") === "verify";
  await c.from("providers").update({
    verification_status: verified ? "verified" : "unverified", verified_by: verified ? me.id : null,
    verified_at: verified ? new Date().toISOString() : null, ...(str(fd, "publish") === "1" ? { status: "published" } : {}),
  }).eq("id", str(fd, "provider_id"));
  revalidatePath("/admin/prestataires");
  revalidatePath("/s", "layout");
}

// ---------------------------------------------------------------------------
// Régie
// ---------------------------------------------------------------------------
export async function updatePlacementRequest(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const amount = str(fd, "quoted_amount");
  const { error } = await c.from("placement_requests").update({
    status: str(fd, "status") as never, quoted_amount: amount ? Number(amount) : null, notes: opt(fd, "notes"), owner_id: me.id,
  }).eq("id", str(fd, "request_id"));
  revalidatePath("/admin/publicite");
  return error ? ko(error.message) : ok("Demande mise à jour.");
}

export async function createSponsoredPlacement(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const target = str(fd, "target");
  const [kind, id] = target.split(":");
  const { error } = await c.from("sponsored_placements").insert({
    inventory_id: str(fd, "inventory_id"), software_id: kind === "software" ? id : null, provider_id: kind === "provider" ? id : null,
    headline: opt(fd, "headline"), cta_label: opt(fd, "cta_label") ?? "Voir l'offre", cta_url: opt(fd, "cta_url") && normalizeUrl(str(fd, "cta_url")),
    starts_on: str(fd, "starts_on"), ends_on: str(fd, "ends_on"), status: "scheduled",
  });
  revalidatePath("/admin/publicite");
  revalidatePath("/s", "layout");
  if (error?.code === "23P01") return ko("Cet emplacement est déjà réservé sur tout ou partie de la période.");
  return error ? ko(error.message) : ok("Emplacement programmé. Il s'affichera avec sa mention « Sponsorisé ».");
}

export async function endPlacement(fd: FormData) {
  const c = await db();
  await c.from("sponsored_placements").update({ status: "ended" }).eq("id", str(fd, "placement_id"));
  revalidatePath("/admin/publicite");
  revalidatePath("/s", "layout");
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------
export async function importKeywords(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const siteId = str(fd, "site_id");
  const rows = str(fd, "csv").split("\n").map((l) => l.trim()).filter(Boolean);
  const out: { site_id: string; keyword: string; volume: number; cpc_eur: number; kd: number; cluster: string | null; intent: "commercial" | "informational"; source: string; refreshed_at: string }[] = [];
  for (const line of rows) {
    const [keyword, volume, cpc, kd, cluster] = line.split(/[;\t]/).map((s) => s?.trim());
    if (!keyword || keyword.toLowerCase() === "keyword" || isNaN(Number(volume))) continue;
    out.push({ site_id: siteId, keyword: keyword.toLowerCase(), volume: Number(volume), cpc_eur: Number((cpc ?? "0").replace(",", ".")) || 0,
      kd: Math.min(100, Number(kd) || 0), cluster: cluster || null, intent: /^(logiciel|plateforme|meilleur|comparatif|prix|avis|alternative)/.test(keyword) ? "commercial" : "informational",
      source: "semrush", refreshed_at: new Date().toISOString() });
  }
  if (!out.length) return ko("Aucune ligne valide (format : mot-clé;volume;cpc;kd;cluster).");
  const { error } = await c.from("keyword_targets").upsert(out, { onConflict: "site_id,keyword", ignoreDuplicates: false });
  revalidatePath("/admin/seo");
  return error ? ko(error.message) : ok(`${out.length} mot(s)-clé(s) importé(s) ou mis à jour.`);
}

export async function addRedirect(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const { error } = await c.from("redirects").insert({ site_id: str(fd, "site_id"), from_path: str(fd, "from_path"), to_path: str(fd, "to_path"), reason: opt(fd, "reason") });
  revalidatePath("/admin/seo");
  return error ? ko(error.message) : ok("Redirection ajoutée (active sous 60 s).");
}

export async function closeTask(fd: FormData) {
  const c = await db();
  await c.from("review_tasks").update({ status: str(fd, "status") === "dismissed" ? "dismissed" : "done", closed_at: new Date().toISOString(), comment: opt(fd, "comment") }).eq("id", str(fd, "task_id"));
  revalidatePath("/admin", "layout");
}

export async function createTask(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const c = await db();
  const me = await requireStaff();
  const { error } = await c.from("review_tasks").insert({
    site_id: opt(fd, "site_id"), kind: str(fd, "kind") as never, content_item_id: opt(fd, "content_item_id"),
    reason: str(fd, "reason"), blocking: fd.get("blocking") === "on", created_by: me.id,
  });
  revalidatePath("/admin", "layout");
  return error ? ko(error.message) : ok("Tâche créée.");
}
