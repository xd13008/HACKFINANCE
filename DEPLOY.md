# Mise en production

Durée estimée : une demi-journée. Rien n'est automatique : chaque étape demande vos comptes.

## 1. Domaines
Domaines achetés : `radarfinances.com` (portail finance, marque « Radar Finances ») et `cedermasociete.com`. Prévoir les sous-domaines `www.` en redirection 301 vers le domaine nu.

## 2. Supabase (région UE)
1. Créer un projet sur supabase.com dans une **région européenne** (Paris `eu-west-3` ou Francfort `eu-central-1`).
2. Dans *Authentication → Providers → Email* : **désactiver les inscriptions publiques**. Les comptes sont créés par l'administrateur.
3. Le schéma et la taxonomie sont appliqués **automatiquement par chaque build Vercel de production**
   (`scripts/migrate-prod.mjs`, variable `POSTGRES_URL_NON_POOLING` fournie par l'intégration Supabase de Vercel).
   Les déploiements de prévisualisation n'y touchent jamais. Secours : workflow GitHub « Base de données (production) ».
4. Créer les comptes dans *Authentication → Users*, puis attribuer les rôles en SQL :
   ```sql
   insert into public.user_roles (user_id, role) values ('<uuid admin>', 'admin'), ('<uuid éditeur>', 'editor');
   insert into public.staff_profiles (user_id, display_name, job_title, is_public) values ('<uuid éditeur>', 'Prénom Nom', 'Rédaction', true);
   -- Compte technique des agents : rôle « agent » UNIQUEMENT
   insert into public.user_roles (user_id, role) values ('<uuid agent>', 'agent');
   ```
5. *Authentication → URL configuration* : ajouter `https://radarfinances.com/admin` et `https://cedermasociete.com/admin`.

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
1. Vérifier les propriétés de domaine `sc-domain:radarfinances.com` et `sc-domain:cedermasociete.com`.
2. Dans Google Cloud : activer l'API *Search Console*, créer un **compte de service** et télécharger sa clé JSON.
3. Dans Search Console, ajouter l'e-mail du compte de service en utilisateur « Restreint » de chaque propriété.
4. Coller le JSON dans `GSC_SERVICE_ACCOUNT`. Bouton manuel : back-office → SEO → *Importer Search Console*.

## 4 bis. Avis G2 (API de syndication)
1. Obtenir auprès de son interlocuteur G2 une **clé de syndication** (la clé développeur standard ne donne pas accès aux avis des autres éditeurs).
2. La renseigner dans la variable Vercel `G2_API_TOKEN` (environnement Production). Jamais dans le dépôt ni dans un message.
3. Back-office → Catalogue → logiciel → bloc *Avis publics* : saisir l'identifiant produit G2, puis *Importer les avis G2*.
   La note et des citations courtes (≤ 300 caractères, fonction de l'auteur sans nom) arrivent en brouillon ; un éditeur les valide.

## 4 ter. Comptes DAF : e-mails de confirmation et de connexion (Brevo)

1. Créer un compte Brevo, authentifier le domaine d'envoi (enregistrements DNS SPF et DKIM fournis par Brevo).
2. Renseigner dans Vercel (Production) : `BREVO_API_KEY` (clé API, jamais dans le dépôt ni dans un message)
   et `MAIL_FROM` (ex. `Radar Finances <bonjour@radarfinances.com>`).
3. Sans ces variables, l'inscription affiche « L'e-mail n'a pas pu être envoyé » : aucun compte n'est activé.
4. Purge quotidienne des données personnelles : `/api/cron/purge` (vercel.json), protégée par `CRON_SECRET`.
5. Compléter la page « Données personnelles » (responsable de traitement, contact, durées) avant d'ouvrir l'inscription au public.

## 4 quater. Jobs : import France Travail et annonces payantes (Stripe)

1. **France Travail** : créer une application sur francetravail.io, l'abonner à l'API « Offres d'emploi v2 ».
   Renseigner dans Vercel (Production) `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET`.
   Import quotidien : `/api/cron/jobs` (vercel.json). Premier import : bouton « Lancer l'import maintenant (31 derniers jours) »
   dans /admin/emplois (administrateur). Le journal de déploiement indique si les identifiants sont valides.
   Les offres importées attendent une relecture : /admin/emplois, « Publier les offres à relire » (par métier).
2. **Stripe** : dans le tableau de bord, créer un taux de TVA 20 % (non inclus) et un webhook vers
   `https://radarfinances.com/api/stripe/webhook` (événements `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`).
   Renseigner dans Vercel : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TAX_RATE_ID`. Jamais dans le dépôt ni dans un message.
3. **Prix** : `supabase/data/99_job_products.sql` (hors taxes, en centimes), rejoué à chaque déploiement.
4. **Refus d'une annonce payée** : remboursement Stripe automatique par la tâche de nuit (`lib/jobs-settle.ts`).
6. **Agent de vérification des offres** : nécessite seulement `ANTHROPIC_API_KEY`. Le compte « agent » est créé au déploiement
   (`ensureAgentAccount` dans scripts/migrate-prod.mjs, mot de passe dérivé de la clé de service). Haiku 5.5 en premier passage,
   Opus 5.5 en second avis sur les cas limites.
   Activer l'agent et son plafond dans /admin/agents, puis la publication automatique dans /admin/emplois (admin).
   Sans publication automatique, l'agent ne fait que recommander.
5. **CGV** des annonces à publier avant l'ouverture du paiement.

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
