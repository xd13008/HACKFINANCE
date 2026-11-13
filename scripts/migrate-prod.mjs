/**
 * Migrations de production, exécutées par le build Vercel (production uniquement).
 * - Applique, dans l'ordre et chacune dans une transaction, les fichiers de supabase/migrations
 *   absents de supabase_migrations.schema_migrations (même table que la CLI Supabase).
 * - Base vide (aucun portail) : charge supabase/bootstrap/*.sql (taxonomie, sans données fictives).
 * - Données de référence (supabase/data/*.sql, idempotentes : mots-clés, questions) rejouées à chaque déploiement.
 * - Comptes initiaux : attribue les rôles admin + éditeur + conformité aux comptes listés dans
 *   INITIAL_ADMIN_EMAIL (séparés par des virgules) et le seul rôle « agent » au compte AGENT_EMAIL,
 *   s'ils existent dans Supabase Auth et n'ont encore aucun rôle. Jamais d'écrasement.
 * - N'affiche jamais la chaîne de connexion.
 *
 * Usage : VERCEL_ENV=production POSTGRES_URL_NON_POOLING=… node scripts/migrate-prod.mjs
 */
import { createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const log = (m) => console.log(`[migrations] ${m}`);

if (process.env.VERCEL_ENV !== "production" && process.env.FORCE_MIGRATIONS !== "1") {
  log(`ignoré (environnement « ${process.env.VERCEL_ENV ?? "local"} »)`);
  process.exit(0);
}
const raw = process.env.POSTGRES_URL_NON_POOLING;
if (!raw) {
  console.error("[migrations] POSTGRES_URL_NON_POOLING absente : base non configurée");
  process.exit(1);
}

// sslmode est retiré de l'URL : le certificat Supabase est géré par l'option ssl ci-dessous.
const url = new URL(raw);
url.searchParams.delete("sslmode");
const client = new pg.Client({ connectionString: url.toString(), ssl: process.env.PGSSL_DISABLE ? false : { rejectUnauthorized: false } });

const files = (dir) => readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".sql")).sort();

try {
  await client.connect();
  await client.query(`create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`);
  const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  let count = 0;
  for (const f of files("supabase/migrations")) {
    const [version, ...rest] = f.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) continue;
    const sql = readFileSync(path.join(root, "supabase/migrations", f), "utf8");
    log(`application de ${f}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
        [version, rest.join("_"), [sql]]);
      await client.query("commit");
      count++;
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${f} : ${e.message}`);
    }
  }
  log(count ? `${count} migration(s) appliquée(s)` : "schéma à jour");

  const { rows: sites } = await client.query("select count(*)::int as n from public.sites");
  if (sites[0].n === 0) {
    log("base vide : chargement de la taxonomie de production");
    await client.query("begin");
    try {
      for (const f of files("supabase/bootstrap")) {
        log(`bootstrap ${f}`);
        await client.query(readFileSync(path.join(root, "supabase/bootstrap", f), "utf8"));
      }
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw new Error(`bootstrap : ${e.message}`);
    }
  }

  for (const f of files("supabase/data")) {
    log(`données ${f}`);
    await client.query(readFileSync(path.join(root, "supabase/data", f), "utf8"));
  }

  const mask = (e) => e.replace(/^(.).*(@.*)$/, "$1…$2");
  const grant = async (email, roles, label) => {
    const { rows: u } = await client.query("select id from auth.users where lower(email) = lower($1)", [email.trim()]);
    if (!u.length) { log(`${label} ${mask(email)} : compte absent de Supabase Auth (à créer)`); return; }
    const { rows: has } = await client.query("select 1 from public.user_roles where user_id = $1 limit 1", [u[0].id]);
    if (has.length) return;
    for (const r of roles) await client.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [u[0].id, r]);
    await client.query("insert into public.staff_profiles (user_id, display_name, is_public) values ($1, $2, false) on conflict do nothing",
      [u[0].id, email.split("@")[0]]);
    log(`${label} ${mask(email)} : rôles ${roles.join(", ")} attribués`);
  };
  for (const email of (process.env.INITIAL_ADMIN_EMAIL ?? "").split(",").filter((e) => e.includes("@"))) {
    await grant(email, ["admin", "editor", "compliance"], "administrateur");
  }
  if (process.env.AGENT_EMAIL?.includes("@")) await grant(process.env.AGENT_EMAIL, ["agent"], "compte agent");
  else await ensureAgentAccount(client, grant);
  // État des comptes du back-office (sans afficher les adresses complètes)
  const { rows: staff } = await client.query(`select u.email, array_agg(r.role::text order by r.role) as roles
    from auth.users u join public.user_roles r on r.user_id = u.id where r.role <> 'agent' group by u.email`);
  log(staff.length ? `comptes du back-office : ${staff.map((x) => `${mask(x.email)} (${x.roles.join(", ")})`).join(" ; ")}`
    : "comptes du back-office : aucun (définir INITIAL_ADMIN_EMAIL après avoir créé le compte dans Supabase Auth)");
  // Contrôle des agents : clé Claude valide (appel gratuit à la liste des modèles), agents activés, publication automatique
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" } });
      log(`clé Claude : ${r.ok ? "valide" : `refusée (${r.status})`}`);
    } catch (e) { log(`clé Claude : contrôle impossible (${e.message})`); }
  } else log("clé Claude : absente");
  const { rows: ag } = await client.query("select agent, enabled from public.agent_settings order by agent");
  log(`agents : ${ag.map((a) => `${a.agent} ${a.enabled ? "actif" : "désactivé"}`).join(", ")}`);
  const { rows: js } = await client.query("select s.key, coalesce(j.auto_publish, false) as auto from public.sites s left join public.job_settings j on j.site_id = s.id where s.key = 'daf'");
  if (js.length) log(`publication automatique des offres (daf) : ${js[0].auto ? "activée" : "désactivée"}`);
  // Contrôle : chaque compte lit bien ses propres rôles à travers la RLS (comme le site le fait)
  for (const email of (process.env.INITIAL_ADMIN_EMAIL ?? "").split(",").filter((e) => e.includes("@"))) {
    const { rows: us } = await client.query("select id, email_confirmed_at is not null as confirmed from auth.users where lower(email) = lower($1)", [email.trim()]);
    for (const u of us) {
      await client.query("begin");
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: u.id, role: "authenticated" })]);
      await client.query("set local role authenticated");
      const { rows: seen } = await client.query("select count(*)::int as n from public.user_roles where user_id = $1", [u.id]);
      await client.query("rollback");
      log(`contrôle ${mask(email)} : ${us.length} compte(s), confirmé ${u.confirmed ? "oui" : "non"}, rôles lus par le site : ${seen[0].n}`);
    }
  }
} catch (e) {
  console.error(`[migrations] échec : ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

/**
 * Compte « agent » créé automatiquement (aucun réglage pour le dirigeant) : e-mail interne, mot de passe dérivé de la clé
 * de service (même calcul que src/lib/agents/runner.ts), jamais affiché ni stocké. Rôle « agent » seulement (RLS : brouillons).
 * Un échec n'interrompt pas le déploiement : les agents restent simplement inactifs.
 */
async function ensureAgentAccount(db, grant) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !service) { log("compte agent : clé de service absente, ignoré"); return; }
  const email = "agent.interne@radarfinances.com";
  const password = createHmac("sha256", service).update("radar-agent-account-v1").digest("base64url");
  const headers = { apikey: service, authorization: `Bearer ${service}`, "content-type": "application/json" };
  try {
    const { rows } = await db.query("select id from auth.users where lower(email) = $1", [email]);
    const res = rows.length
      ? await fetch(`${base}/auth/v1/admin/users/${rows[0].id}`, { method: "PUT", headers, body: JSON.stringify({ password }) })
      : await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true }) });
    if (!res.ok) { log(`compte agent : création impossible (${res.status})`); return; }
    if (!rows.length) log("compte agent : créé");
    await grant(email, ["agent"], "compte agent");
  } catch (e) {
    log(`compte agent : ${e.message}`);
  }
}
