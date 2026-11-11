-- =============================================================================
-- Radar Finances : 3 sous-rubriques ajoutées après rapprochement avec les catégories G2
-- (docs/seo/MAPPING-G2-UNIVERS.md) et mesure Semrush FR du 11/11/2026.
-- Retenues : fraude aux paiements, factures fournisseurs, audit et contrôle interne.
-- Écartée : fiscalité et TVA (« logiciel tva » : 90 recherches/mois), en facette ou guide plus tard.
-- Idempotent ; tout reste en brouillon.
-- =============================================================================

insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000090', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de vérification des IBAN et de lutte contre la fraude aux virements', 'fraude-virements', 'fraude aux virements',
   'Vérification des coordonnées bancaires des fournisseurs, détection des virements suspects, prévention de la fraude au président et au faux RIB.',
   '[{"key":"verification","label":"Vérification des IBAN et des titulaires","weight":30},
     {"key":"detection","label":"Détection des paiements suspects","weight":25},
     {"key":"integrations","label":"Intégrations ERP, trésorerie et banques","weight":20},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 46),
  ('12000000-0000-4000-a000-000000000091', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000007',
   'software', 'Logiciels d''automatisation des factures fournisseurs', 'factures-fournisseurs', 'factures fournisseurs',
   'Réception et lecture des factures fournisseurs, circuit de validation, rapprochement avec les commandes et export comptable.',
   '[{"key":"capture","label":"Réception et lecture des factures","weight":25},
     {"key":"validation","label":"Circuit de validation","weight":25},
     {"key":"rapprochement","label":"Rapprochement commandes et réceptions","weight":20},
     {"key":"integrations","label":"Intégrations comptabilité et ERP","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 47),
  ('12000000-0000-4000-a000-000000000092', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'software', 'Logiciels d''audit, de contrôle interne et de gestion des risques', 'audit-controle-interne', 'audit et contrôle interne',
   'Cartographie des risques, plan d''audit, tests de contrôles, suivi des recommandations et reporting au comité d''audit.',
   '[{"key":"risques","label":"Cartographie des risques","weight":25},
     {"key":"controles","label":"Plan d''audit et tests de contrôles","weight":25},
     {"key":"suivi","label":"Suivi des recommandations","weight":20},
     {"key":"reporting","label":"Reporting au comité d''audit","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 48)
on conflict (site_id, slug) do nothing;

-- Mots-clés mesurés (Semrush FR, 11/11/2026)
insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000001', 'fraude au président', 590, 0, 16, 'informational', 'fraude-virements', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'vérification iban', 720, 0, 25, 'informational', 'fraude-virements', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'fraude au faux rib', 20, 0, 0, 'informational', 'fraude-virements', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'fraude fournisseur', 30, 0, 0, 'informational', 'fraude-virements', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'dématérialisation factures fournisseurs', 590, 4.03, 39, 'commercial', 'factures-fournisseurs', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel factures fournisseurs', 70, 0, 0, 'commercial', 'factures-fournisseurs', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'automatisation comptes fournisseurs', 50, 0, 0, 'commercial', 'factures-fournisseurs', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel p2p', 260, 0, 30, 'commercial', 'achats', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel procure to pay', 210, 6.71, 17, 'commercial', 'achats', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel de gestion des risques', 320, 10.18, 10, 'commercial', 'audit-controle-interne', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel audit interne', 210, 10.2, 9, 'commercial', 'audit-controle-interne', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel contrôle interne', 140, 8.87, 9, 'commercial', 'audit-controle-interne', 'semrush', '2026-11-11'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel tva', 90, 4.15, 13, 'commercial', 'comptabilite', 'semrush', '2026-11-11')
on conflict (site_id, keyword) do nothing;

-- Pages planifiées : un comparatif par sous-rubrique, un guide pour la fraude (forte demande informationnelle)
create or replace function pg_temp.plan_g2(p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_kw text,
  p_secondary text[], p_outline text[], p_words int, p_cta text)
returns void language plpgsql as $$
declare site constant uuid := '10000000-0000-4000-a000-000000000001'; iid uuid; kid uuid;
begin
  if exists (select 1 from public.content_items where site_id = site and type = p_type and slug = p_slug) then return; end if;
  select k.id into kid from public.keyword_targets k
  where k.site_id = site and k.keyword = p_kw and k.target_content_id is null
    and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
  insert into public.content_items (site_id, type, slug, title, category_id, cluster, primary_keyword_id)
  values (site, p_type, p_slug, p_title, (select id from public.categories where site_id = site and slug = p_category_slug), p_category_slug, kid)
  returning id into iid;
  if kid is not null then
    update public.keyword_targets set target_content_id = iid, status = 'in_progress' where id = kid and status = 'todo';
  end if;
  insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, outline, target_words, required_links, cta)
  values (iid, p_kw, p_secondary, (select jsonb_agg(jsonb_build_object('level', 2, 'text', t)) from unnest(p_outline) t), p_words,
          coalesce((select array_agg(i.id) from public.content_items i where i.site_id = site and i.path = '/methode'), '{}'), p_cta);
end;
$$;

select pg_temp.plan_g2('category_ranking', 'fraude-virements', 'Vérification des IBAN et fraude aux virements : les logiciels comparés',
  'fraude-virements', 'vérification iban', '{fraude au faux rib,fraude fournisseur}',
  array['Notre verdict', 'Le classement des solutions testées', 'Comment vérifier un IBAN fournisseur', 'Prix', 'Notre méthode'], 1500, 'Comparer les solutions testées');
select pg_temp.plan_g2('guide', 'fraude-au-president', 'Fraude au président et au faux RIB : se protéger en PME',
  'fraude-virements', 'fraude au président', '{fraude au faux rib,vérification iban}',
  array['Comment se déroule la fraude', 'Les signaux d''alerte', 'Les contrôles à mettre en place', 'Les outils de vérification des IBAN', 'Que faire en cas de fraude'], 1500, 'Comparer les outils de vérification');
select pg_temp.plan_g2('category_ranking', 'factures-fournisseurs', 'Dématérialisation des factures fournisseurs : les logiciels comparés',
  'factures-fournisseurs', 'dématérialisation factures fournisseurs', '{logiciel factures fournisseurs,automatisation comptes fournisseurs}',
  array['Notre verdict', 'Le classement des solutions testées', 'Factures fournisseurs et facture électronique', 'Prix', 'Notre méthode'], 1500, 'Comparer les solutions testées');
select pg_temp.plan_g2('category_ranking', 'audit-controle-interne', 'Logiciels d''audit interne et de gestion des risques : le comparatif',
  'audit-controle-interne', 'logiciel de gestion des risques', '{logiciel audit interne,logiciel contrôle interne}',
  array['Notre verdict', 'Le classement des solutions testées', 'Quel outil selon la taille de l''entreprise', 'Prix', 'Notre méthode'], 1500, 'Comparer les solutions testées');
