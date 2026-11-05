/**
 * Migrations de production, exécutées par le build Vercel (production uniquement).
 * - Applique, dans l'ordre et chacune dans une transaction, les fichiers de supabase/migrations
 *   absents de supabase_migrations.schema_migrations (même table que la CLI Supabase).
 * - Base vide (aucun portail) : charge supabase/bootstrap/*.sql (taxonomie, sans données fictives).
 * - N'affiche jamais la chaîne de connexion.
 *
 * Usage : VERCEL_ENV=production POSTGRES_URL_NON_POOLING=… node scripts/migrate-prod.mjs
 */
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
} catch (e) {
  console.error(`[migrations] échec : ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
