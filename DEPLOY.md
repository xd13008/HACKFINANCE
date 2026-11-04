# Mise en production

Durée estimée : une demi-journée. Rien n'est automatique : chaque étape demande vos comptes.

## 1. Domaines
Réserver `dafradar.fr` et `cedermasociete.fr` (libres au 4 nov. 2026 selon le RDAP de l'AFNIC), puis prévoir les `www.`.

## 2. Supabase (région UE)
1. Créer un projet sur supabase.com dans une **région européenne** (Paris `eu-west-3` ou Francfort `eu-central-1`).
2. Dans *Authentication → Providers → Email* : **désactiver les inscriptions publiques**. Les comptes sont créés par l'administrateur.
3. Appliquer le schéma et la taxonomie, **sans le jeu de données fictif** :
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   for f in supabase/bootstrap/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
   ```
4. Créer les comptes dans *Authentication → Users*, puis attribuer les rôles en SQL :
   ```sql
   insert into public.user_roles (user_id, role) values ('<uuid admin>', 'admin'), ('<uuid éditeur>', 'editor');
   insert into public.staff_profiles (user_id, display_name, job_title, is_public) values ('<uuid éditeur>', 'Prénom Nom', 'Rédaction', true);
   -- Compte technique des agents : rôle « agent » UNIQUEMENT
   insert into public.user_roles (user_id, role) values ('<uuid agent>', 'agent');
   ```
5. *Authentication → URL configuration* : ajouter `https://dafradar.fr/admin` et `https://cedermasociete.fr/admin`.

## 3. Vercel
1. Importer le dépôt GitHub (framework Next.js). La région `cdg1` (Paris) est fixée dans `vercel.json`.
2. Ajouter les deux domaines au **même projet**.
3. Renseigner les variables d'environnement de `.env.example` :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ;
   - `SITE_DOMAINS` avec les domaines de production ;
   - `ANALYTICS_SALT` et `CRON_SECRET` (secrets aléatoires) ;
   - `ALLOW_INDEXING=true` seulement le jour du lancement.
4. Les tâches planifiées sont déclarées dans `vercel.json` :
   - import Search Console chaque jour ;
   - agents chaque semaine.

## 4. Google Search Console
1. Vérifier les propriétés de domaine `sc-domain:dafradar.fr` et `sc-domain:cedermasociete.fr`.
2. Dans Google Cloud : activer l'API *Search Console*, créer un **compte de service** et télécharger sa clé JSON.
3. Dans Search Console, ajouter l'e-mail du compte de service en utilisateur « Restreint » de chaque propriété.
4. Coller le JSON dans `GSC_SERVICE_ACCOUNT`. Bouton manuel : back-office → SEO → *Importer Search Console*.

## 5. Agents (Claude API)
1. Créer une clé API sur console.anthropic.com et définir une **limite de dépense** au niveau de l'organisation.
2. Renseigner `ANTHROPIC_API_KEY`, `AGENT_EMAIL` et `AGENT_PASSWORD` (le compte au rôle « agent »).
3. Dans le back-office → Agents, l'administrateur active chaque agent et règle ses plafonds par exécution et par mois.
   - Veille : renseigner les domaines autorisés.
   - Tant qu'un agent est désactivé, rien n'est appelé.

## 6. Avant d'ouvrir l'indexation
- [ ] Mentions légales, données personnelles et politique éditoriale complétées.
- [ ] Revue juridique (ARCHITECTURE §9) : transparence des classements, IOBSP, loi Hoguet.
- [ ] Paramètres des simulateurs vérifiés et sourcés (multiples, taux de prélèvements).
- [ ] Premiers tests réels saisis, avec preuves, avant de publier une catégorie.
- [ ] Brouillons préparés par IA relus, sourcés et validés.
- [ ] `ALLOW_INDEXING=true`, sitemap soumis dans Search Console.
