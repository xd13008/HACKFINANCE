# CLAUDE.md — Réseau de portails média B2B

Plateforme unique (Next.js + Supabase) qui sert plusieurs portails par nom de domaine :
**Radar Finances** (`radarfinances.com`, logiciels finance pour DAF) et **Céder ma société** (`cedermasociete.com`, vente d'entreprise).
Référence produit : `ARCHITECTURE.md`. Mots-clés Semrush : `docs/seo/`.

## Règles non négociables (imposées par la base — ne jamais les contourner)

1. **Seul un contenu approuvé par un humain est publié.** Statuts modifiables uniquement via
   `submit_version()` → `approve_version()` / `reject_version()` / `block_item()` (trigger `guard_workflow_columns`).
2. **Une note publiée référence un test réel validé (avec preuves) et un valideur éditeur humain** (`guard_score_publication`, `validate_test_run()`).
3. **Le commercial ne peut pas modifier une note, un classement, un verdict ni un contenu** (RLS). Le classement éditorial
   (`editorial_rankings`) est calculé depuis `scores` seulement ; le sponsoring vit dans `sponsored_placements` et s'affiche dans un bloc distinct, étiqueté.
4. **Un agent écrit uniquement en brouillon** (`software_facts`, `content_versions`, `review_tasks`), jamais publié.
5. **Aucune fonctionnalité de crédit, levée de fonds, assurance ou lead financier** (cadre IOBSP / CIF / ORIAS / loi Hoguet non validé — voir ARCHITECTURE §9).
6. **Aucun fait publié sans source datée ; tout lien affilié ou sponsorisé est signalé** (`rel="sponsored"` + mention).
7. **Aucune clé secrète dans le dépôt.** `.env.local` est ignoré ; seules les clés de démo locales de Supabase CLI y figurent.
8. **La checklist SEO (`seo_check()`) bloque la soumission.** Ne pas l'affaiblir pour faire passer un contenu.
9. Les données nominatives des prestataires (`providers.internal_contact`, `siren`) ne sont jamais servies à `anon` (vue `providers_public`).
10. Toute modification de droits s'accompagne d'un test pgTAP dans `supabase/tests/`.

## Commandes

```bash
pnpm install
pnpm db:start            # Supabase local (Docker) — si le démon Docker est arrêté : dockerd &
pnpm db:reset            # applique les migrations + le jeu de données fictif (supabase/seeds)
pnpm db:types            # régénère src/lib/database.types.ts après une migration
pnpm dev                 # http://radarfinances.localhost:3000 et http://cedermasociete.localhost:3000
pnpm test                # Vitest : unitaires + intégration agents (modèle factice, Supabase local requis)
pnpm test:db             # pgTAP : droits, validation, agents, Storage (52 tests)
pnpm typecheck && pnpm lint && pnpm build
pnpm keywords:sql        # CSV Semrush → supabase/seeds/02_keywords.sql
```

Comptes de démo (local uniquement, mot de passe `demo-local-2026`) : `admin@`, `editeur@` (éditeur + conformité),
`commercial@`, `agent@` — domaine `exemple.test`. Back-office : `/admin` sur n'importe quel domaine.

## Structure

```
supabase/
  migrations/   0100 plateforme+rôles+audit · 0200 faits · 0300 éditorial+workflow · 0400 SEO+checklist
                0500 demandes+régie · 0600 analytics+agents · 0700 reporting · 0800 agents+Storage+GSC
  bootstrap/    données de PRODUCTION : taxonomie, mots-clés, inventaire, brouillons IA (aucune donnée fictive)
  seeds/        données FICTIVES (is_fictional), locales uniquement, publiées via le vrai circuit
  tests/        pgTAP
src/
  middleware.ts         domaine → portail (rewrite vers /s/[site]), redirections 301, session admin
  lib/                  data.ts (lecture publique), seo.ts (metadata + JSON-LD), linking.ts (maillage auto),
                        checks.ts, diff.ts, admin.ts, actions/{public,admin}.ts (server actions)
  app/s/[site]/…        gabarits publics (URLs de ARCHITECTURE §5), sitemap.xml, robots.txt, llms.txt
  app/admin/(bo)/…      back-office : validation, contenus, SEO, catalogue, tests, prestataires,
                        demandes, régie, analytics, audit
  app/api/collect       mesure d'audience sans cookie (hachage quotidien salé, pas d'IP stockée)
  app/api/cron/*        tâches planifiées (Search Console quotidien, agents hebdomadaire) — Bearer CRON_SECRET
  lib/agents/           veille, rédaction, contrôle qualité : un appel Claude à sortie structurée, sans outil,
                        compte Supabase « agent » (RLS), plafonds de coût, journal agent_runs
  lib/gsc.ts            import Search Console (compte de service Google)
  components/public|admin
tests/                  Vitest
docs/seo/               exports Semrush
```

## Agents

- Modèle : `claude-opus-5-5` (lib/agents/llm.ts), repli serveur `fallbacks: "default"`, sortie Zod validée.
- Les agents n'ont **aucun outil** : le code récupère les pages (domaines autorisés), le modèle renvoie des données.
  Tout contenu externe passe par `asDocument()` — donnée, jamais instruction.
- Toujours via `agentDb()` (compte rôle `agent`) ; jamais `serviceClient()`.
- Sources : `keepKnownSources()` retire toute URL que l'agent n'a pas reçue.
- Tests : injecter un `Llm` factice ; ne jamais appeler l'API réelle dans les tests (coût).

## Conventions

- Textes produit en français. Code et identifiants SQL en anglais.
- Nouveau gabarit public : ajouter le type à l'enum `content_type`, le chemin dans la colonne générée `content_items.path`,
  la route sous `app/s/[site]/`, les règles dans `seo_check()` et `linking.ts`.
- Nouveau portail : une ligne dans `sites` + `SITE_DOMAINS`. Aucune modification de code.
- Pages publiques : client `publicClient()` (anon, sans cookie) pour rester cachables ; back-office : `serverClient()`.
- `robots.txt` interdit l'indexation tant que `ALLOW_INDEXING=true` n'est pas défini en production.
- Mise en production : `DEPLOY.md`. CI : `.github/workflows/ci.yml` (lint, types, pgTAP, Vitest, build).
