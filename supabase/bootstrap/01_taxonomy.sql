-- =============================================================================
-- BOOTSTRAP PRODUCTION — taxonomie des portails (aucune donnée fictive)
-- Exécuté aussi en local avant les seeds. Idempotent par identifiants fixes.
-- Production : psql "$DATABASE_URL" -f supabase/bootstrap/01_taxonomy.sql (puis 02, 03, 04)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Portails
-- ---------------------------------------------------------------------------
insert into public.sites (id, key, name, domain, tagline, description, audience, theme, status) values
  ('10000000-0000-4000-a000-000000000001', 'daf', 'Radar Finances', 'radarfinances.com',
   'Les logiciels et prestataires finance, testés pour les DAF de PME',
   'Comparatifs indépendants de logiciels financiers : trésorerie, facturation électronique, notes de frais, comptabilité.',
   'DAF, RAF et dirigeants de PME',
   '{"primary":"#0f4c81","accent":"#f59e0b"}', 'live'),
  ('10000000-0000-4000-a000-000000000002', 'cession', 'Céder ma société', 'cedermasociete.com',
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

