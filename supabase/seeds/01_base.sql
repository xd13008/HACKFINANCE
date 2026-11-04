-- =============================================================================
-- JEU DE DONNÉES FICTIF — DÉVELOPPEMENT LOCAL UNIQUEMENT
-- Tous les logiciels, prestataires, tests et notes ci-dessous sont inventés
-- (is_fictional = true) et affichés comme tels sur le site.
-- Les mots de passe ci-dessous ne servent qu'à l'instance Supabase locale.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Comptes de démonstration
-- ---------------------------------------------------------------------------
create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_name text)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('demo-local-2026', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('name', p_name), now(), now(),
          '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  insert into public.staff_profiles (user_id, display_name, is_public) values (p_id, p_name, true);
end;
$$;

select pg_temp.seed_user('00000000-0000-4000-a000-000000000001', 'admin@exemple.test', 'Admin (démo)');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000002', 'editeur@exemple.test', 'Camille Démo — rédaction');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000003', 'commercial@exemple.test', 'Commercial (démo)');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000004', 'agent@exemple.test', 'Agent (démo)');
update public.staff_profiles set is_public = false where user_id in (
  '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004');
update public.staff_profiles set job_title = 'Rédactrice en chef (profil fictif)',
  bio = 'Profil de démonstration. Teste les logiciels selon la méthode publiée.'
  where user_id = '00000000-0000-4000-a000-000000000002';

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'admin'),
  ('00000000-0000-4000-a000-000000000002', 'editor'),
  ('00000000-0000-4000-a000-000000000002', 'compliance'),   -- cumul autorisé au démarrage
  ('00000000-0000-4000-a000-000000000003', 'sales'),
  ('00000000-0000-4000-a000-000000000004', 'agent');

-- ---------------------------------------------------------------------------
-- Portails
-- ---------------------------------------------------------------------------
insert into public.sites (id, key, name, domain, tagline, description, audience, theme, status) values
  ('10000000-0000-4000-a000-000000000001', 'daf', 'DAF Radar', 'dafradar.fr',
   'Les logiciels et prestataires finance, testés pour les DAF de PME',
   'Comparatifs indépendants de logiciels financiers : trésorerie, facturation électronique, notes de frais, comptabilité.',
   'DAF, RAF et dirigeants de PME',
   '{"primary":"#0f4c81","accent":"#f59e0b"}', 'live'),
  ('10000000-0000-4000-a000-000000000002', 'cession', 'Céder ma société', 'cedermasociete.fr',
   'Préparer, valoriser et réussir la vente de son entreprise',
   'Guides pratiques, simulateurs et annuaire des conseils en cession pour les dirigeants de TPE et PME.',
   'Dirigeants cédants de TPE et PME',
   '{"primary":"#14532d","accent":"#d97706"}', 'live');

insert into public.verticals (id, site_id, name, slug, sort) values
  ('11000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Finance & trésorerie', 'finance', 1),
  ('11000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Facturation & comptabilité', 'facturation-comptabilite', 2),
  ('11000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000002', 'Cession & transmission', 'cession', 1);

-- Catégories du portail DAF (trésorerie publiée avec données fictives, les autres en préparation)
insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de gestion de trésorerie', 'tresorerie', 'trésorerie',
   'Suivi du cash, prévisions et rapprochement des flux bancaires pour PME.',
   '[{"key":"fonctionnalites","label":"Fonctionnalités","weight":30},
     {"key":"connexions_bancaires","label":"Connexions bancaires","weight":20},
     {"key":"prevision","label":"Prévision et scénarios","weight":20},
     {"key":"ergonomie","label":"Prise en main","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]',
   30846, 'published', 1),
  ('12000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'software', 'Plateformes agréées de facturation électronique', 'facturation-electronique', 'facturation électronique',
   'Plateformes agréées (ex-PDP) pour émettre et recevoir les factures électroniques.', '[]', 79870, 'draft', 2),
  ('12000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de notes de frais', 'notes-de-frais', 'notes de frais', null, '[]', 28041, 'draft', 3),
  ('12000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'software', 'Logiciels de facturation', 'facturation', 'facturation', null, '[]', 28500, 'draft', 4),
  ('12000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'software', 'Logiciels de comptabilité', 'comptabilite', 'comptabilité', null, '[]', 27000, 'draft', 5),
  ('12000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de rapprochement bancaire', 'rapprochement-bancaire', 'rapprochement bancaire', null, '[]', 5491, 'draft', 6),
  ('12000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de recouvrement', 'recouvrement', 'recouvrement', null, '[]', 3666, 'draft', 7),
  ('12000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de pilotage financier et FP&A', 'pilotage-financier', 'pilotage financier', null, '[]', 4000, 'draft', 8),
  ('12000000-0000-4000-a000-000000000009', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'provider', 'Experts-comptables', 'experts-comptables', 'expert-comptable', null, '[]', 33192, 'draft', 9),
-- Catégories du portail Cession (annuaires de prestataires, sans classement)
  ('12000000-0000-4000-a000-000000000020', '10000000-0000-4000-a000-000000000002', '11000000-0000-4000-a000-000000000003',
   'provider', 'Conseils en cession d''entreprise', 'conseils-cession', 'conseil en cession',
   'Cabinets qui accompagnent les dirigeants dans la vente de leur entreprise.', '[]', 363, 'published', 1),
  ('12000000-0000-4000-a000-000000000021', '10000000-0000-4000-a000-000000000002', '11000000-0000-4000-a000-000000000003',
   'provider', 'Banques d''affaires PME', 'banques-affaires', 'banque d''affaires',
   'Banques d''affaires et boutiques M&A actives sur les PME.', '[]', 1512, 'published', 2),
  ('12000000-0000-4000-a000-000000000022', '10000000-0000-4000-a000-000000000002', '11000000-0000-4000-a000-000000000003',
   'provider', 'Avocats en cession d''entreprise', 'avocats-cession', 'avocat',
   'Profession réglementée : fiches factuelles uniquement, aucun classement.', '[]', 0, 'draft', 3);

insert into public.facets (id, category_id, facet_type, name, slug, rule, is_landing) values
  ('13000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-000000000001', 'price', 'Gratuit', 'gratuit',
   '{"fact_type":"free_plan","equals":true}', true),
  ('13000000-0000-4000-a000-000000000002', '12000000-0000-4000-a000-000000000001', 'company_size', 'Pour TPE', 'tpe',
   '{"fact_type":"target_sizes","contains":"tpe"}', false),
  ('13000000-0000-4000-a000-000000000003', '12000000-0000-4000-a000-000000000001', 'feature', 'Multi-entités', 'multi-entites',
   '{"fact_type":"multi_entity","equals":true}', false);

-- ---------------------------------------------------------------------------
-- Logiciels fictifs (catégorie trésorerie)
-- ---------------------------------------------------------------------------
insert into public.software (id, vendor, name, slug, website, tagline, founded_year, status, is_fictional, created_by) values
  ('20000000-0000-4000-a000-000000000001', 'Éditeur fictif A', 'Trésoflux', 'tresoflux', 'https://example.com/tresoflux',
   'Trésorerie et prévisions pour PME multi-banques', 2019, 'draft', true, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'Éditeur fictif B', 'Cashpilot', 'cashpilot', 'https://example.com/cashpilot',
   'Pilotage du cash pour TPE et indépendants', 2021, 'draft', true, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'Éditeur fictif C', 'Prévia', 'previa', 'https://example.com/previa',
   'Prévisions de trésorerie et scénarios pour ETI', 2017, 'draft', true, '00000000-0000-4000-a000-000000000002');

insert into public.software_categories (software_id, category_id, is_primary) values
  ('20000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-000000000001', true),
  ('20000000-0000-4000-a000-000000000002', '12000000-0000-4000-a000-000000000001', true),
  ('20000000-0000-4000-a000-000000000003', '12000000-0000-4000-a000-000000000001', true);

insert into public.integrations (software_id, name, kind) values
  ('20000000-0000-4000-a000-000000000001', 'Pennylane', 'native'),
  ('20000000-0000-4000-a000-000000000001', 'Sage 100', 'connector'),
  ('20000000-0000-4000-a000-000000000001', 'API REST', 'api'),
  ('20000000-0000-4000-a000-000000000002', 'Qonto', 'native'),
  ('20000000-0000-4000-a000-000000000002', 'Google Sheets', 'connector'),
  ('20000000-0000-4000-a000-000000000003', 'SAP', 'connector'),
  ('20000000-0000-4000-a000-000000000003', 'Cegid', 'connector'),
  ('20000000-0000-4000-a000-000000000003', 'API REST', 'api');

-- Faits et prix validés par l'éditeur humain (le trigger exige un valideur éditeur).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', false);

insert into public.software_facts (software_id, fact_type, value, source_url, collected_at, status, created_by) values
  ('20000000-0000-4000-a000-000000000001', 'free_plan', 'false', 'https://example.com/tresoflux/tarifs', now() - interval '6 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000001', 'bank_connections', '350', 'https://example.com/tresoflux/banques', now() - interval '6 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000001', 'multi_entity', 'true', 'https://example.com/tresoflux/fonctionnalites', now() - interval '6 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000001', 'target_sizes', '["pme","eti"]', 'https://example.com/tresoflux', now() - interval '6 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000001', 'hosting', '"Union européenne"', 'https://example.com/tresoflux/securite', now() - interval '6 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'free_plan', 'true', 'https://example.com/cashpilot/tarifs', now() - interval '5 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'bank_connections', '120', 'https://example.com/cashpilot/banques', now() - interval '5 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'multi_entity', 'false', 'https://example.com/cashpilot/fonctionnalites', now() - interval '5 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'target_sizes', '["tpe","pme"]', 'https://example.com/cashpilot', now() - interval '5 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'hosting', '"Union européenne"', 'https://example.com/cashpilot/securite', now() - interval '5 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'free_plan', 'false', 'https://example.com/previa/tarifs', now() - interval '4 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'bank_connections', '500', 'https://example.com/previa/banques', now() - interval '4 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'multi_entity', 'true', 'https://example.com/previa/fonctionnalites', now() - interval '4 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'target_sizes', '["eti"]', 'https://example.com/previa', now() - interval '4 days', 'validated', '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'hosting', '"Union européenne"', 'https://example.com/previa/securite', now() - interval '4 days', 'validated', '00000000-0000-4000-a000-000000000002');

-- Un fait détecté par l'agent de veille, en attente de validation
insert into public.software_facts (software_id, fact_type, value, source_url, status, author_kind, created_by, note) values
  ('20000000-0000-4000-a000-000000000002', 'min_price_eur', '19', 'https://example.com/cashpilot/tarifs', 'draft', 'agent',
   '00000000-0000-4000-a000-000000000004', 'Veille : le prix d''entrée de l''offre Pro passerait de 15 € à 19 € HT/mois.');

insert into public.pricing_plans (software_id, plan_name, price_eur, billing_period, per_unit, conditions, source_url, source_date, status, sort, created_by) values
  ('20000000-0000-4000-a000-000000000001', 'Essentiel', 89, 'month', 'par entité', 'Engagement annuel', 'https://example.com/tresoflux/tarifs', current_date - 6, 'validated', 1, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000001', 'Groupe', 249, 'month', 'jusqu''à 5 entités', 'Engagement annuel', 'https://example.com/tresoflux/tarifs', current_date - 6, 'validated', 2, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'Gratuit', 0, 'free', null, '1 compte bancaire', 'https://example.com/cashpilot/tarifs', current_date - 5, 'validated', 1, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000002', 'Pro', 15, 'month', null, 'Sans engagement', 'https://example.com/cashpilot/tarifs', current_date - 5, 'validated', 2, '00000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003', 'ETI', null, 'quote', null, 'Sur devis, à partir de 3 entités', 'https://example.com/previa/tarifs', current_date - 4, 'validated', 1, '00000000-0000-4000-a000-000000000002');

-- ---------------------------------------------------------------------------
-- Tests réels (fictifs) et notes → validés via validate_test_run()
-- ---------------------------------------------------------------------------
insert into public.test_runs (id, software_id, category_id, tester_id, tested_at, product_version, protocol, evidence,
                              verdict, pros, cons, best_for, status, is_fictional) values
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-000000000001',
   '00000000-0000-4000-a000-000000000002', current_date - 7, '2026.10',
   'Protocole trésorerie v1 : connexion de 3 banques, import de 6 mois de flux, catégorisation, prévision à 13 semaines, export.',
   '[{"label":"Capture connexion bancaire (démo)","path":"evidence/demo/tresoflux-1.png"}]',
   'Le plus complet pour une PME multi-entités, au prix d''une prise en main plus longue.',
   '{"Consolidation multi-entités","Prévisions par scénarios","Large couverture bancaire"}',
   '{"Paramétrage initial long","Pas d''offre gratuite"}',
   'PME de 20 à 250 salariés avec plusieurs entités', 'completed', true),
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002', '12000000-0000-4000-a000-000000000001',
   '00000000-0000-4000-a000-000000000002', current_date - 6, '3.4',
   'Protocole trésorerie v1 : connexion de 3 banques, import de 6 mois de flux, catégorisation, prévision à 13 semaines, export.',
   '[{"label":"Capture tableau de bord (démo)","path":"evidence/demo/cashpilot-1.png"}]',
   'Simple et abordable : le bon point de départ pour une TPE.',
   '{"Offre gratuite","Prise en main en 10 minutes"}',
   '{"Pas de multi-entités","Prévisions basiques"}',
   'TPE et indépendants', 'completed', true),
  ('30000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000003', '12000000-0000-4000-a000-000000000001',
   '00000000-0000-4000-a000-000000000002', current_date - 5, '12.1',
   'Protocole trésorerie v1 : connexion de 3 banques, import de 6 mois de flux, catégorisation, prévision à 13 semaines, export.',
   '[{"label":"Capture scénarios (démo)","path":"evidence/demo/previa-1.png"}]',
   'Très puissant sur les prévisions, mais surdimensionné pour une petite PME.',
   '{"Modélisation avancée","Intégrations ERP"}',
   '{"Tarif sur devis","Interface dense"}',
   'ETI et groupes', 'completed', true);

insert into public.scores (test_run_id, criterion_key, score, justification) values
  ('30000000-0000-4000-a000-000000000001', 'fonctionnalites', 9, 'Couverture complète : consolidation, budgets, rapprochement.'),
  ('30000000-0000-4000-a000-000000000001', 'connexions_bancaires', 8.5, '350 banques annoncées, 3/3 connectées lors du test.'),
  ('30000000-0000-4000-a000-000000000001', 'prevision', 8.5, 'Scénarios multiples, prévision à 13 semaines fiable sur l''échantillon.'),
  ('30000000-0000-4000-a000-000000000001', 'ergonomie', 6.5, 'Deux heures de paramétrage avant le premier tableau de bord exploitable.'),
  ('30000000-0000-4000-a000-000000000001', 'prix', 7, 'Cohérent pour une PME multi-entités.'),
  ('30000000-0000-4000-a000-000000000002', 'fonctionnalites', 6, 'L''essentiel du suivi de trésorerie, sans consolidation.'),
  ('30000000-0000-4000-a000-000000000002', 'connexions_bancaires', 7, '3/3 banques connectées, couverture plus réduite.'),
  ('30000000-0000-4000-a000-000000000002', 'prevision', 5.5, 'Prévision linéaire, pas de scénarios.'),
  ('30000000-0000-4000-a000-000000000002', 'ergonomie', 9, 'Premier tableau de bord en dix minutes.'),
  ('30000000-0000-4000-a000-000000000002', 'prix', 9, 'Offre gratuite réelle, offre Pro abordable.'),
  ('30000000-0000-4000-a000-000000000003', 'fonctionnalites', 9, 'Très complet, orienté contrôle de gestion.'),
  ('30000000-0000-4000-a000-000000000003', 'connexions_bancaires', 8, 'Large couverture, connexion EBICS possible.'),
  ('30000000-0000-4000-a000-000000000003', 'prevision', 9.5, 'Moteur de scénarios le plus avancé du test.'),
  ('30000000-0000-4000-a000-000000000003', 'ergonomie', 5.5, 'Interface dense, formation recommandée.'),
  ('30000000-0000-4000-a000-000000000003', 'prix', 6, 'Sur devis uniquement, peu lisible.');

select public.validate_test_run('30000000-0000-4000-a000-000000000001');
select public.validate_test_run('30000000-0000-4000-a000-000000000002');
select public.validate_test_run('30000000-0000-4000-a000-000000000003');

-- ---------------------------------------------------------------------------
-- Prestataires fictifs (portail Cession)
-- ---------------------------------------------------------------------------
insert into public.providers (id, name, slug, profession, regulated_profession, website, city, city_slug, region,
                              specialties, deal_size_range, description, public_references, verification_status,
                              verified_by, verified_at, status, is_fictional) values
  ('40000000-0000-4000-a000-000000000001', 'Exemple Transmission Conseil', 'exemple-transmission-conseil', 'conseil-cession', false,
   'https://example.com/transmission', 'Lyon', 'lyon', 'Auvergne-Rhône-Alpes',
   '{"Industrie","Services B2B","Départ en retraite"}', '1 à 10 M€',
   'Cabinet fictif de démonstration spécialisé dans la cession de PME industrielles et de services.',
   '[{"label":"Opération fictive : cession d''un sous-traitant industriel (démo)","source_url":"https://example.com/transmission/references"}]',
   'verified', '00000000-0000-4000-a000-000000000002', now() - interval '10 days', 'published', true),
  ('40000000-0000-4000-a000-000000000002', 'Démo Cession Partenaires', 'demo-cession-partenaires', 'conseil-cession', false,
   'https://example.com/cession-partenaires', 'Nantes', 'nantes', 'Pays de la Loire',
   '{"Commerce","BTP","Transmission familiale"}', '0,5 à 5 M€',
   'Cabinet fictif de démonstration orienté TPE et PME du Grand Ouest.',
   '[]', 'unverified', null, null, 'published', true),
  ('40000000-0000-4000-a000-000000000003', 'Banque d''affaires Exemple', 'banque-affaires-exemple', 'banque-affaires', false,
   'https://example.com/banque-affaires', 'Paris', 'paris', 'Île-de-France',
   '{"Tech","Santé","LBO"}', '5 à 50 M€',
   'Boutique M&A fictive de démonstration.',
   '[{"label":"Opération fictive : adossement d''un éditeur SaaS (démo)","source_url":"https://example.com/banque-affaires/deals"}]',
   'verified', '00000000-0000-4000-a000-000000000002', now() - interval '8 days', 'published', true);

insert into public.provider_categories (provider_id, category_id) values
  ('40000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-000000000020'),
  ('40000000-0000-4000-a000-000000000002', '12000000-0000-4000-a000-000000000020'),
  ('40000000-0000-4000-a000-000000000003', '12000000-0000-4000-a000-000000000021');

select set_config('request.jwt.claims', '', false);
