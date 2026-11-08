-- =============================================================================
-- Radar Finances : rubriques complémentaires (demande du 07/11/2026)
--   Documents & signature · Formation finance & compta · Subventions & aides publiques
--   · Réduction des coûts (opex) · RSE & carbone (angle DAF ; comparatifs sur Radar RSE)
-- Garde-fous : prêts (prêt d'honneur, prêts publics) = sujet réglementé « crédit », contenu seul ;
-- organismes de formation et cabinets = annuaires factuels sans classement ; aucune vente de formation (V3).
-- Idempotent ; ne publie rien. Volumes : Semrush FR, 07/11/2026.
-- =============================================================================

insert into public.verticals (id, site_id, name, slug, description, sort) values
  ('11000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', 'Documents & signature', 'documents-signature',
   'Signature électronique, GED et archivage des documents de gestion.', 3),
  ('11000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001', 'Formation finance & compta', 'formation',
   'Plateformes de formation et organismes spécialisés finance, comptabilité, contrôle de gestion.', 4),
  ('11000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000001', 'Subventions & aides publiques', 'aides-publiques',
   'Subventions, crédits d''impôt innovation et recherche, aides régionales (information générale).', 5),
  ('11000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000001', 'Réduction des coûts', 'reduction-couts',
   'Cabinets et outils spécialisés dans la réduction des frais généraux.', 6),
  ('11000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000001', 'RSE & carbone', 'rse-carbone',
   'Ce que la CSRD et le bilan carbone changent pour la direction financière (comparatifs sur Radar RSE).', 7)
on conflict do nothing; -- identifiants fixes : les univers (data/50) peuvent renommer ces rubriques

insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000060', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000004',
   'software', 'Logiciels de signature électronique', 'signature-electronique', 'signature électronique',
   'Signature électronique des contrats, devis et documents RH, avec valeur probante (règlement eIDAS).',
   '[{"key":"valeur_juridique","label":"Valeur juridique (niveaux eIDAS, preuve)","weight":30},
     {"key":"parcours","label":"Parcours du signataire","weight":15},
     {"key":"integrations","label":"Intégrations et API","weight":20},
     {"key":"archivage","label":"Archivage et dossier de preuve","weight":10},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 3233, 'draft', 20),
  ('12000000-0000-4000-a000-000000000061', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000004',
   'software', 'Logiciels de GED', 'ged', 'GED',
   'Gestion électronique des documents : classement, recherche, circuits de validation et archivage à valeur probante.',
   '[{"key":"classement","label":"Classement, OCR et recherche","weight":25},
     {"key":"workflows","label":"Circuits de validation","weight":20},
     {"key":"archivage","label":"Archivage à valeur probante","weight":20},
     {"key":"integrations","label":"Intégrations (comptabilité, ERP, messagerie)","weight":15},
     {"key":"ergonomie","label":"Prise en main","weight":5},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 10488, 'draft', 21),
  ('12000000-0000-4000-a000-000000000062', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'software', 'Plateformes de formation (LMS)', 'plateformes-lms', 'plateforme LMS',
   'Création et diffusion de parcours de formation, suivi des apprenants et obligations des organismes de formation.',
   '[{"key":"parcours","label":"Création de parcours","weight":20},
     {"key":"suivi","label":"Suivi et reporting des apprenants","weight":20},
     {"key":"conformite","label":"Conformité (Qualiopi, bilan pédagogique et financier)","weight":15},
     {"key":"experience","label":"Expérience apprenant","weight":15},
     {"key":"integrations","label":"Intégrations (SIRH, visioconférence)","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 5740, 'draft', 22),
  ('12000000-0000-4000-a000-000000000063', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'provider', 'Organismes de formation finance et comptabilité', 'organismes-formation-finance', 'organisme de formation',
   'Annuaire factuel des organismes de formation en finance, comptabilité et contrôle de gestion (certification Qualiopi indiquée, sans classement).',
   '[]', 16808, 'draft', 23),
  ('12000000-0000-4000-a000-000000000064', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000006',
   'provider', 'Cabinets de conseil en CIR et CII', 'cabinets-cir-cii', 'cabinet CIR',
   'Annuaire factuel des cabinets qui accompagnent les dossiers de crédit d''impôt recherche et innovation (sans classement).',
   '[]', 82, 'draft', 24),
  ('12000000-0000-4000-a000-000000000065', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000007',
   'provider', 'Cabinets de réduction des coûts', 'cabinets-reduction-couts', 'cabinet de réduction des coûts',
   'Annuaire factuel des cabinets d''optimisation des frais généraux, souvent rémunérés au résultat (sans classement).',
   '[]', 0, 'draft', 25),
  ('12000000-0000-4000-a000-000000000066', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000007',
   'software', 'Logiciels de gestion des abonnements SaaS', 'gestion-abonnements-saas', 'gestion des abonnements SaaS',
   'Inventaire des abonnements logiciels, suivi des renouvellements et des licences inutilisées.',
   '[{"key":"detection","label":"Détection des abonnements","weight":25},
     {"key":"couts","label":"Suivi des coûts et des renouvellements","weight":25},
     {"key":"licences","label":"Licences inutilisées","weight":20},
     {"key":"integrations","label":"Intégrations (banque, SSO, comptabilité)","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 500, 'draft', 26)
on conflict (site_id, slug) do nothing;

insert into public.facets (category_id, facet_type, name, slug, rule, is_landing) values
  ('12000000-0000-4000-a000-000000000060', 'price', 'Gratuite', 'gratuite', '{"fact_type":"free_plan","equals":true}', true),
  ('12000000-0000-4000-a000-000000000061', 'company_size', 'Pour PME', 'pme', '{"fact_type":"target_sizes","contains":"pme"}', true)
on conflict (category_id, slug) do nothing;

insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000001', 'signature électronique', 22200, 1.71, 61, 'informational', 'signature', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'signature électronique gratuite', 6600, 1.50, 45, 'commercial', 'signature', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel signature électronique', 720, 4.49, 27, 'commercial', 'signature', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'ged', 12100, 1.77, 39, 'informational', 'ged', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel ged', 1900, 5.52, 27, 'commercial', 'ged', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'archivage électronique', 480, 4.51, 38, 'informational', 'ged', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'plateforme lms', 1000, 5.74, 37, 'commercial', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'formation comptabilité', 4400, 3.82, 23, 'commercial', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'formation contrôle de gestion', 480, 2.70, 18, 'informational', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'formation daf', 320, 2.77, 14, 'informational', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'formation finance pour non financier', 260, 3.67, 13, 'informational', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'formation facturation électronique', 320, 2.01, 12, 'informational', 'formation', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'aide aux entreprises', 880, 1.86, 20, 'informational', 'aides-publiques', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'subvention entreprise', 390, 1.61, 50, 'informational', 'aides-publiques', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'crédit d''impôt recherche', 1900, 0.24, 39, 'informational', 'aides-publiques', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'crédit d''impôt innovation', 720, 1.02, 39, 'informational', 'aides-publiques', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'cabinet cir', 30, 2.73, 0, 'commercial', 'aides-publiques', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'prêt d''honneur', 1900, 0.75, 19, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'cost killer', 320, 0, 20, 'informational', 'reduction-couts', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'optimisation des coûts', 170, 4.17, 13, 'informational', 'reduction-couts', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'saas management', 90, 5.56, 20, 'commercial', 'reduction-couts', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'csrd daf', 0, 0, 0, 'informational', 'rse-carbone', 'semrush', '2026-11-07')
on conflict (site_id, keyword) do nothing;

-- ---------------------------------------------------------------------------
-- Pages à rédiger (fiche + brief) ; p_regulated : sujet réglementé, contenu seul
-- ---------------------------------------------------------------------------
create temp table if not exists planned_links_rc (content_item_id uuid, paths text[]);

create or replace function pg_temp.plan(
  p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_cluster text,
  p_kw text, p_secondary text[], p_questions text[], p_outline text[], p_words int, p_required text[], p_cta text,
  p_regulated text default null
) returns void language plpgsql as $$
declare
  site constant uuid := '10000000-0000-4000-a000-000000000001';
  iid uuid; kid uuid; cat uuid;
begin
  select id into iid from public.content_items where site_id = site and type = p_type and slug = p_slug;
  if iid is null then
    if p_regulated is null then
      select id into cat from public.categories where site_id = site and slug = p_category_slug;
    end if;
    select k.id into kid from public.keyword_targets k
    where k.site_id = site and k.keyword = p_kw and k.target_content_id is null
      and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
    insert into public.content_items (site_id, type, slug, title, category_id, cluster, primary_keyword_id, regulated_topic)
    values (site, p_type, p_slug, p_title, cat, p_cluster, kid, p_regulated) returning id into iid;
    if kid is not null then
      update public.keyword_targets set target_content_id = iid, status = 'in_progress' where id = kid and status = 'todo';
    end if;
    insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, questions, outline, entities, target_words, cta)
    values (iid, p_kw, p_secondary, p_questions,
            (select coalesce(jsonb_agg(jsonb_build_object('level', 2, 'text', t)), '[]'::jsonb)
               from unnest(p_outline || case when p_regulated is not null
                 then array['Avertissement : information générale, ni conseil personnalisé ni mise en relation'] else '{}'::text[] end) t),
            case when p_regulated is not null
              then array['contenu seul : aucun lien commercial, aucune recommandation d''un établissement (ARCHITECTURE §9)']
              else '{}'::text[] end,
            p_words, case when p_regulated is null then p_cta end);
  end if;
  insert into planned_links_rc values (iid, p_required);
end;
$$;

-- Documents & signature -------------------------------------------------------
select pg_temp.plan('pillar', 'signature-electronique', 'Signature électronique : le dossier complet', 'signature-electronique', 'signature',
  'signature électronique', array['signature électronique valeur juridique', 'eidas', 'signature électronique qualifiée'],
  array['une signature électronique a-t-elle une valeur juridique', 'quelle différence entre signature simple, avancée et qualifiée'],
  array['Définition et cadre légal (eIDAS)', 'Les trois niveaux de signature', 'Documents concernés', 'Choisir un outil', 'Questions fréquentes'], 1600,
  array['/meilleurs-logiciels/signature-electronique', '/meilleurs-logiciels/signature-electronique/gratuite'], 'Comparer les outils de signature');
select pg_temp.plan('category_ranking', 'signature-electronique', 'Meilleurs logiciels de signature électronique', 'signature-electronique', 'signature',
  'logiciel signature électronique', array['outil signature électronique', 'plateforme signature électronique'], array['quel outil de signature électronique choisir'],
  array['Notre classement', 'Critères de choix', 'Valeur juridique et preuve', 'Prix', 'Méthode de test'], 1000,
  array['/dossiers/signature-electronique'], 'Comparer les logiciels testés');
select pg_temp.plan('facet_landing', 'signature-electronique/gratuite', 'Signature électronique gratuite : les offres testées', 'signature-electronique', 'signature',
  'signature électronique gratuite', array['signer un pdf gratuitement'], array['existe-t-il une signature électronique gratuite et légale'],
  array['Les offres gratuites testées', 'Limites (nombre d''envois, niveau de signature)', 'Quand passer à une offre payante'], 800,
  array['/meilleurs-logiciels/signature-electronique'], 'Voir le comparatif complet');
select pg_temp.plan('guide', 'ged-definition', 'GED : définition, fonctionnement et choix d''un outil', 'ged', 'ged',
  'ged', array['gestion électronique des documents', 'archivage électronique'], array['qu''est-ce qu''une ged', 'quelle différence entre ged et archivage électronique'],
  array['Définition', 'Ce que fait une GED', 'Archivage à valeur probante', 'Choisir sa GED'], 1200,
  array['/meilleurs-logiciels/ged'], 'Comparer les logiciels de GED');
select pg_temp.plan('category_ranking', 'ged', 'Meilleurs logiciels de GED', 'ged', 'ged',
  'logiciel ged', array['logiciel gestion documentaire', 'ged pme'], array['quelle ged pour une pme'],
  array['Notre classement', 'Critères de choix', 'Archivage et valeur probante', 'Prix', 'Méthode de test'], 1000,
  array['/guides/ged-definition'], 'Comparer les logiciels testés');

-- Formation finance & compta ----------------------------------------------------
select pg_temp.plan('category_ranking', 'plateformes-lms', 'Meilleures plateformes de formation (LMS)', 'plateformes-lms', 'formation',
  'plateforme lms', array['logiciel lms', 'lms'], array['qu''est-ce qu''un lms', 'quel lms pour un organisme de formation'],
  array['Notre classement', 'Critères de choix', 'Qualiopi et obligations', 'Prix', 'Méthode de test'], 1000,
  array['/prestataires/organismes-formation-finance'], 'Comparer les plateformes testées');
select pg_temp.plan('provider_directory', 'organismes-formation-finance', 'Organismes de formation finance et comptabilité', 'organismes-formation-finance', 'formation',
  'formation comptabilité', array['formation contrôle de gestion', 'formation daf'], array['comment financer une formation en comptabilité'],
  array['Choisir sa formation', 'Les organismes référencés (Qualiopi indiqué)', 'Référencer son organisme'], 800,
  array['/guides/formation-finance-non-financiers'], 'Référencer mon organisme');
select pg_temp.plan('guide', 'formation-finance-non-financiers', 'Formation finance pour non-financiers : programme et formats', 'organismes-formation-finance', 'formation',
  'formation finance pour non financier', array['comprendre un bilan', 'formation daf'], array['que contient une formation finance pour non-financiers'],
  array['Pour qui', 'Programme type', 'Formats et durée', 'Financement de la formation (principes généraux)'], 1000,
  array['/prestataires/organismes-formation-finance'], 'Voir les organismes référencés');
select pg_temp.plan('guide', 'formation-facturation-electronique', 'Se former à la facturation électronique', 'organismes-formation-finance', 'formation',
  'formation facturation électronique', array[]::text[], array['qui doit être formé à la facturation électronique'],
  array['Équipes concernées', 'Contenu d''une formation', 'Ressources gratuites', 'Organismes'], 900,
  array['/dossiers/facturation-electronique', '/prestataires/organismes-formation-finance'], 'Voir les organismes référencés');

-- Subventions & aides publiques -------------------------------------------------
select pg_temp.plan('pillar', 'aides-entreprises', 'Aides aux entreprises : subventions et crédits d''impôt', 'cabinets-cir-cii', 'aides-publiques',
  'aide aux entreprises', array['aides entreprises', 'subvention entreprise', 'aides publiques'],
  array['quelles aides pour une pme', 'où trouver les aides aux entreprises'],
  array['Panorama des aides (subventions, crédits d''impôt, exonérations)', 'Aides nationales et régionales', 'Crédit d''impôt recherche et innovation', 'Constituer un dossier', 'Prêts publics : renvoi vers l''information officielle'], 1800,
  array['/guides/credit-impot-recherche', '/guides/credit-impot-innovation', '/guides/subventions-entreprise'], 'Voir les cabinets référencés');
select pg_temp.plan('guide', 'credit-impot-recherche', 'Crédit d''impôt recherche (CIR) : conditions et calcul', 'cabinets-cir-cii', 'aides-publiques',
  'crédit d''impôt recherche', array['cir', 'calcul cir'], array['qui peut bénéficier du crédit d''impôt recherche', 'comment calculer le cir'],
  array['Entreprises et dépenses éligibles', 'Taux et calcul (principes)', 'Déclaration et justificatifs', 'Contrôle fiscal : points d''attention'], 1200,
  array['/dossiers/aides-entreprises', '/prestataires/cabinets-cir-cii'], 'Voir les cabinets référencés');
select pg_temp.plan('guide', 'credit-impot-innovation', 'Crédit d''impôt innovation (CII) : conditions et calcul', 'cabinets-cir-cii', 'aides-publiques',
  'crédit d''impôt innovation', array['cii', 'cii pme'], array['quelle différence entre cir et cii'],
  array['PME éligibles', 'Dépenses d''innovation retenues', 'Taux et plafond (principes)', 'Déclaration'], 1000,
  array['/guides/credit-impot-recherche', '/prestataires/cabinets-cir-cii'], 'Voir les cabinets référencés');
select pg_temp.plan('guide', 'subventions-entreprise', 'Subventions aux entreprises : les trouver et les obtenir', 'cabinets-cir-cii', 'aides-publiques',
  'subvention entreprise', array['aides entreprises', 'aides régionales'], array['comment obtenir une subvention pour son entreprise'],
  array['Types de subventions', 'Où les trouver (sources officielles)', 'Monter son dossier', 'Comptabiliser une subvention'], 1000,
  array['/dossiers/aides-entreprises'], 'Voir le dossier aides');
select pg_temp.plan('provider_directory', 'cabinets-cir-cii', 'Cabinets de conseil en CIR et CII', 'cabinets-cir-cii', 'aides-publiques',
  'cabinet cir', array['cabinet conseil cir', 'cabinet cii'], array['comment est rémunéré un cabinet cir'],
  array['Faire appel à un cabinet', 'Modes de rémunération (forfait, honoraires de résultat)', 'Les cabinets référencés'], 600,
  array['/guides/credit-impot-recherche'], 'Référencer mon cabinet');
select pg_temp.plan('guide', 'pret-d-honneur', 'Prêt d''honneur : fonctionnement et réseaux', null, 'sujets-reglementes',
  'prêt d''honneur', array['prêt d''honneur création entreprise'], array['qui peut obtenir un prêt d''honneur'],
  array['Définition', 'Conditions générales', 'Réseaux d''accompagnement (sources officielles)', 'Articulation avec les autres financements'], 1000,
  array['/dossiers/aides-entreprises'], null, 'credit');

-- Réduction des coûts ----------------------------------------------------------
select pg_temp.plan('guide', 'optimisation-des-couts', 'Réduire les frais généraux d''une PME : méthode', 'cabinets-reduction-couts', 'reduction-couts',
  'optimisation des coûts', array['réduction des coûts', 'frais généraux', 'cost killer'], array['comment réduire les frais généraux d''une entreprise'],
  array['Cartographier ses dépenses', 'Leviers par poste (énergie, télécoms, logiciels, achats)', 'Faire appel à un cabinet au résultat', 'Suivre les économies'], 1200,
  array['/meilleurs-logiciels/achats', '/meilleurs-logiciels/gestion-abonnements-saas', '/prestataires/cabinets-reduction-couts'], 'Voir les cabinets référencés');
select pg_temp.plan('provider_directory', 'cabinets-reduction-couts', 'Cabinets de réduction des coûts', 'cabinets-reduction-couts', 'reduction-couts',
  'cost killer', array['cabinet réduction des coûts', 'cabinet optimisation des coûts'], array['comment est rémunéré un cabinet de réduction des coûts'],
  array['Ce que fait un cabinet', 'Rémunération au résultat : points de vigilance', 'Les cabinets référencés'], 700,
  array['/guides/optimisation-des-couts'], 'Référencer mon cabinet');
select pg_temp.plan('category_ranking', 'gestion-abonnements-saas', 'Meilleurs logiciels de gestion des abonnements SaaS', 'gestion-abonnements-saas', 'reduction-couts',
  'saas management', array['gestion des licences logicielles'], array['comment suivre les abonnements logiciels de l''entreprise'],
  array['Notre classement', 'Critères de choix', 'Prix', 'Méthode de test'], 900,
  array['/guides/optimisation-des-couts'], 'Comparer les logiciels testés');

-- RSE & carbone (angle DAF) ----------------------------------------------------
select pg_temp.plan('guide', 'csrd-direction-financiere', 'CSRD : ce qui change pour la direction financière', null, 'rse-carbone',
  'csrd daf', array['rapport de durabilité', 'reporting extra-financier', 'bilan carbone'],
  array['quel rôle pour le daf dans la csrd'],
  array['Calendrier et entreprises concernées', 'Données financières et extra-financières', 'Vérification du rapport', 'Outils (comparatifs sur Radar RSE)'], 1200,
  array[]::text[], 'Voir les comparatifs RSE');

update public.seo_briefs b set required_links = (
  select coalesce(array_agg(distinct x), '{}') from unnest(b.required_links || coalesce((
    select array_agg(i.id) from public.content_items i
    where i.site_id = '10000000-0000-4000-a000-000000000001' and i.path = any (l.paths)), '{}')) x)
from planned_links_rc l
where b.content_item_id = l.content_item_id;
