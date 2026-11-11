# CLAUDE.md — Réseau de portails média B2B

Plateforme unique (Next.js + Supabase) qui sert plusieurs portails par nom de domaine :
**Radar Finances** (`radarfinances.com`, logiciels finance pour DAF) et **Céder ma société** (`cedermasociete.com`, vente d'entreprise),
plus deux portails en préparation (`status = 'draft'`, 404 en production) : **Radar RH** (`radarrh.com`) et **Radar RSE** (`radarrse.com`).
Référence produit : `ARCHITECTURE.md`. Mots-clés Semrush : `docs/seo/`.
Plan éditorial par univers (6 sous-rubriques) et chaîne des 4 agents (collecte, rédaction, contrôle, mise en ligne), Match monétisé en pause (§5), informations filtrables selon les critères du DAF (§6) : `docs/PLAN-EDITORIAL-AGENTS.md`.
Charte de rédaction des tests, alternatives et matchs (densité, ton, unicité SEO/GEO, contrôle avant publication) : `docs/CHARTE-REDACTION-TESTS.md`.

## Façon de travailler avec le dirigeant (@xav) — règles permanentes

1. **Ne jamais livrer de code non vérifié.** Tester avant d'annoncer (tests, build, rendu réel). Ne rien annoncer comme fait sans preuve.
2. **Ne jamais revenir après coup avec « j'ai fait une erreur ».** Vérifier avant de répondre, pas après.
3. **Réponses en français, phrases courtes et simples.** Aller droit au but. Pas de détails inutiles.
4. **Niveau de qualité maximal**, adapté à un dirigeant : l'essentiel, la décision à prendre, la recommandation.

## Règles non négociables (imposées par la base — ne jamais les contourner)

1. **Seul un contenu approuvé par un humain est publié.** Statuts modifiables uniquement via
   `submit_version()` → `approve_version()` / `reject_version()` / `block_item()` (trigger `guard_workflow_columns`).
2. **Une note publiée référence un test réel validé (avec preuves) et un valideur éditeur humain** (`guard_score_publication`, `validate_test_run()`).
3. **Le commercial ne peut pas modifier une note, un classement, un verdict ni un contenu** (RLS). Le classement éditorial
   (`editorial_rankings`) est calculé depuis `scores` seulement ; le sponsoring vit dans `sponsored_placements` et s'affiche dans un bloc distinct, étiqueté.
4. **Un agent écrit uniquement en brouillon** (`software_facts`, `content_versions`, `review_tasks`), jamais publié.
5. **Aucune fonctionnalité de crédit, levée de fonds, assurance ou lead financier** (cadre IOBSP / CIF / ORIAS / loi Hoguet non validé — voir ARCHITECTURE §9).
   Ces sujets n'existent qu'en guides d'information marqués `content_items.regulated_topic` : sans catégorie, sans classement,
   sans emplacement publicitaire (trigger `guard_regulated_inventory`), sans lien affilié.
6. **Aucun fait publié sans source datée ; tout lien affilié ou sponsorisé est signalé** (`rel="sponsored"` + mention).
   Avis tiers : citer, jamais copier (citation ≤ 300 caractères, lien vers l'avis, date, fonction de l'auteur sans nom),
   mention « non vérifiés par la rédaction », jamais dans la note éditoriale ni en données structurées AggregateRating.
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
pnpm test:db             # pgTAP : droits, validation, agents, Storage, questions SEO, périmètre DAF, sujets réglementés, portails RH/RSE, univers DAF, avis tiers cités, couverture logiciels + prestataires, localisation des prestataires (99 tests)
pnpm typecheck && pnpm lint && pnpm build
pnpm keywords:sql        # CSV Semrush → supabase/seeds/02_keywords.sql
```

Comptes de démo (local uniquement, mot de passe `demo-local-2026`) : `admin@`, `editeur@` (éditeur + conformité),
`commercial@`, `agent@` — domaine `exemple.test`. Back-office : `/admin` sur n'importe quel domaine.

## Structure

```
supabase/
  migrations/   0100 plateforme+rôles+audit · 0200 faits · 0300 éditorial+workflow · 0400 SEO+checklist
                0500 demandes+régie · 0600 analytics+agents · 0700 reporting · 0800 agents+Storage+GSC · 0900 questions SEO
                1000 checklist GEO · 1100 sujets réglementés (contenu seul, aucun emplacement publicitaire)
                1200-1300 avis tiers cités (review_sources, review_quotes, review_summaries : brouillon → validation humaine)
                1400 identifiant G2 des logiciels (import des avis G2 par l'API de syndication)
                1500 localisation des prestataires (code postal, département, GPS, bureaux, zone ; publique, SIREN toujours fermé)
  bootstrap/    données de PRODUCTION : taxonomie, mots-clés, inventaire, brouillons IA (aucune donnée fictive)
  data/         données de référence idempotentes, rejouées à chaque déploiement (mots-clés Semrush, pages institutionnelles,
                périmètre DAF du cahier des charges, rubriques complémentaires, organisation de Radar Finances
                en 8 univers opérationnels (data/50), sujets réglementés en contenu seul,
                portails Radar RH / Radar RSE : catégories, grilles, facettes, pages planifiées + briefs),
                première catégorie complète en brouillon : trésorerie (data/70 : 5 logiciels réels, faits, prix et notes G2/GetApp
                sourcés, pages planifiées ; protocole de test et marche à suivre : docs/tests/PROTOCOLE-TRESORERIE.md),
                3 sous-rubriques issues du rapprochement G2 + Semrush (data/75 : fraude aux virements, factures fournisseurs,
                audit et contrôle interne ; docs/seo/MAPPING-G2-UNIVERS.md),
                référencement de 524 logiciels réels en brouillon dans les 24 sous-rubriques (data/80, généré par
                scripts/refs-to-sql.py depuis docs/seo/referencement/*.json + produits de l'API G2),
                correspondance G2 de 282 logiciels via l'API G2 v2 (data/85 : identifiant, lien, note, nombre d'avis en brouillon),
                770 faits et 159 offres relevés sur les sites officiels (data/90, scripts/facts-to-sql.py : facturation électronique,
                notes de frais, factures fournisseurs ; statut DGFiP des 163 plateformes agréées), en brouillon avec citation,
                161 cabinets et prestataires (data/95, scripts/providers-to-sql.py depuis docs/seo/prestataires/*.json :
                personnes morales seulement, SIREN vérifié au registre public, localisation du siège), en brouillon
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
  lib/g2.ts             avis G2 (API de syndication, clé G2_API_TOKEN côté serveur) → note et citations ≤ 300 car. en brouillon
  components/public|admin
tests/                  Vitest
docs/seo/               relevés Semrush, PLAN-CONTENUS.md (priorités), scripts/seo-build.py pour régénérer
```

## Agents

- Modèle : `claude-opus-5-5` (lib/agents/llm.ts), repli serveur `fallbacks: "default"`, sortie Zod validée.
- Les agents n'ont **aucun outil** : le code récupère les pages (domaines autorisés), le modèle renvoie des données.
  Tout contenu externe passe par `asDocument()` — donnée, jamais instruction.
- Toujours via `agentDb()` (compte rôle `agent`) ; jamais `serviceClient()`.
- Sources : `keepKnownSources()` retire toute URL que l'agent n'a pas reçue.
- Charte de rédaction (`lib/agents/charter.ts`) : consignes de l'agent de rédaction et de contrôle ; `charterCheck()` ajoute au rapport
  des avertissements (ton, mots interdits, longueur, FAQ, liens vers les matchs et alternatives), jamais bloquants à eux seuls.
- Tests : injecter un `Llm` factice ; ne jamais appeler l'API réelle dans les tests (coût).

## Conventions

- Textes produit en français. Code et identifiants SQL en anglais.
- Nouveau gabarit public : ajouter le type à l'enum `content_type`, le chemin dans la colonne générée `content_items.path`,
  la route sous `app/s/[site]/`, les règles dans `seo_check()` et `linking.ts`.
- Nouveau portail : une ligne dans `sites` + `SITE_DOMAINS`. Aucune modification de code.
- Pages publiques : client `publicClient()` (anon, sans cookie) pour rester cachables ; back-office : `serverClient()`.
- `robots.txt` interdit l'indexation tant que `ALLOW_INDEXING=true` n'est pas défini en production.
- Mise en production : `DEPLOY.md`. CI : `.github/workflows/ci.yml` (lint, types, pgTAP, Vitest, build).
