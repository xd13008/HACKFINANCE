-- =============================================================================
-- Radar Finances : chaque univers propose des LOGICIELS et des PRESTATAIRES (décision du 11/11/2026)
-- Complète data/50 : 5 catégories de prestataires et 1 catégorie de logiciels manquantes.
-- Prestataires : annuaires sans classement en V1 ; activité réglementée = fiche factuelle.
-- Idempotent ; ne publie rien.
-- =============================================================================

insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000080', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'provider', 'Intégrateurs de logiciels comptables et ERP', 'integrateurs-comptables', 'intégrateur',
   'Mise en place, paramétrage et reprise de données des logiciels comptables, ERP et plateformes de facture électronique.', '[]', 0, 'draft', 40),
  ('12000000-0000-4000-a000-000000000081', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'provider', 'Conseil en trésorerie et trésoriers externalisés', 'conseil-tresorerie', 'conseil en trésorerie',
   'Plan de trésorerie, prévisions, relations bancaires et mise en place d''outils, en mission ou à temps partagé (hors intermédiation de crédit).', '[]', 0, 'draft', 41),
  ('12000000-0000-4000-a000-000000000082', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000004',
   'provider', 'Sociétés de recouvrement de créances', 'societes-recouvrement', 'société de recouvrement',
   'Recouvrement amiable pour le compte des entreprises. Activité réglementée (déclaration, assurance, compte dédié) : fiches factuelles uniquement, aucun classement.', '[]', 0, 'draft', 42),
  ('12000000-0000-4000-a000-000000000083', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000009',
   'provider', 'Contrôleurs de gestion indépendants et intégrateurs BI', 'controle-gestion-bi', 'contrôleur de gestion',
   'Construction du budget, des tableaux de bord et du reporting, en mission ou à temps partagé.', '[]', 0, 'draft', 43),
  ('12000000-0000-4000-a000-000000000084', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000008',
   'provider', 'Conseil CSRD et bilan carbone', 'conseil-csrd-carbone', 'conseil CSRD',
   'Double matérialité, collecte des données ESG, bilan carbone ; vérification du rapport par des CAC et OTI (fiches factuelles).', '[]', 0, 'draft', 44),
  ('12000000-0000-4000-a000-000000000085', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000006',
   'software', 'Logiciels de suivi des projets CIR et CII', 'logiciels-cir-cii', 'suivi CIR / CII',
   'Suivi des temps et des dépenses éligibles, justificatifs et dossier technique pour le crédit d''impôt recherche et innovation.',
   '[{"key":"suivi","label":"Suivi des temps et des dépenses éligibles","weight":30},
     {"key":"justificatifs","label":"Justificatifs et dossier technique","weight":25},
     {"key":"integrations","label":"Intégrations (paie, comptabilité)","weight":15},
     {"key":"ergonomie","label":"Prise en main","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 45)
on conflict (site_id, slug) do nothing;

-- Annuaires et comparatif planifiés (fiche + brief), mots-clés à mesurer
create or replace function pg_temp.plan_c(p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_cluster text, p_kw text, p_outline text[], p_words int, p_cta text)
returns void language plpgsql as $$
declare site constant uuid := '10000000-0000-4000-a000-000000000001'; iid uuid;
begin
  if exists (select 1 from public.content_items where site_id = site and type = p_type and slug = p_slug) then return; end if;
  insert into public.content_items (site_id, type, slug, title, category_id, cluster)
  values (site, p_type, p_slug, p_title, (select id from public.categories where site_id = site and slug = p_category_slug), p_cluster)
  returning id into iid;
  insert into public.seo_briefs (content_item_id, primary_keyword, outline, entities, target_words, cta)
  values (iid, p_kw, (select jsonb_agg(jsonb_build_object('level', 2, 'text', t)) from unnest(p_outline) t),
          array['volume de recherche à mesurer (Semrush) avant rédaction'], p_words, p_cta);
end;
$$;

select pg_temp.plan_c('provider_directory', 'integrateurs-comptables', 'Intégrateurs de logiciels comptables et ERP', 'integrateurs-comptables', 'comptabilite',
  'intégrateur erp', array['Quand faire appel à un intégrateur', 'Les intégrateurs référencés', 'Référencer son cabinet'], 700, 'Référencer mon cabinet');
select pg_temp.plan_c('provider_directory', 'conseil-tresorerie', 'Conseil en trésorerie et trésoriers externalisés', 'conseil-tresorerie', 'tresorerie',
  'trésorier externalisé', array['Externaliser sa trésorerie : pour qui', 'Les prestataires référencés', 'Référencer son cabinet'], 700, 'Référencer mon cabinet');
select pg_temp.plan_c('provider_directory', 'societes-recouvrement', 'Sociétés de recouvrement de créances', 'societes-recouvrement', 'recouvrement',
  'société de recouvrement', array['Ce que fait une société de recouvrement', 'Cadre réglementaire et points de vigilance', 'Les sociétés référencées (fiches factuelles)'], 800, 'Référencer ma société');
select pg_temp.plan_c('provider_directory', 'controle-gestion-bi', 'Contrôleurs de gestion indépendants et intégrateurs BI', 'controle-gestion-bi', 'pilotage',
  'contrôleur de gestion freelance', array['Mission ou temps partagé', 'Les prestataires référencés', 'Référencer son cabinet'], 700, 'Référencer mon cabinet');
select pg_temp.plan_c('provider_directory', 'conseil-csrd-carbone', 'Conseil CSRD et bilan carbone', 'conseil-csrd-carbone', 'rse-carbone',
  'cabinet conseil csrd', array['Ce que fait un cabinet CSRD', 'Les cabinets référencés', 'Référencer son cabinet'], 700, 'Référencer mon cabinet');
select pg_temp.plan_c('category_ranking', 'logiciels-cir-cii', 'Meilleurs logiciels de suivi CIR et CII', 'logiciels-cir-cii', 'aides-publiques',
  'logiciel cir', array['Notre classement', 'Critères de choix', 'Justifier son CIR en cas de contrôle', 'Prix', 'Méthode de test'], 900, 'Comparer les logiciels testés');
