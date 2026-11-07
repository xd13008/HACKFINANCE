-- =============================================================================
-- Portail DAF (Radar Finances) : périmètre complet du cahier des charges (ARCHITECTURE §5)
-- Catégories : facturation électronique, facturation, trésorerie, notes de frais, comptabilité,
-- rapprochement bancaire, recouvrement, pilotage et FP&A, consolidation, achats
-- + annuaire des experts-comptables (sans classement).
--
-- Idempotent, rejoué à chaque déploiement :
--   - n'écrase jamais une grille, une description ou un statut déjà renseignés ;
--   - ne publie rien : catégories en brouillon, pages à rédiger = fiche + brief SEO, sans version.
--     La rédaction (agent ou humain) produit un brouillon, un éditeur valide (approve_version).
-- Hors périmètre DAF (cahier des charges) : paie et RSE = portails dédiés (§3) ;
-- crédit, affacturage, compte pro, assurance, placements = contenu seul / revue juridique (§9).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Catégories manquantes : consolidation, achats (brouillon)
-- ---------------------------------------------------------------------------
insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-00000000000a', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000002',
   'software', 'Logiciels de consolidation', 'consolidation', 'consolidation',
   'Consolidation des comptes de groupe : retraitements, éliminations intragroupe, conversion des devises et liasses de consolidation.',
   '[]', 1309, 'draft', 10),
  ('12000000-0000-4000-a000-00000000000b', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels achats', 'achats', 'achats',
   'Demandes d''achat, bons de commande, validation et rapprochement avec les factures fournisseurs (procure-to-pay).',
   '[]', 0, 'draft', 11)
on conflict (site_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Grilles de notation (somme = 100) et descriptions, uniquement si encore vides
-- ---------------------------------------------------------------------------
with grids(slug, description, criteria) as (values
  ('facturation',
   'Devis, factures, avoirs et suivi des encaissements, conformes à la facturation électronique.',
   '[{"key":"conformite","label":"Conformité facturation électronique","weight":25},
     {"key":"documents","label":"Devis, factures, avoirs, relances","weight":20},
     {"key":"encaissement","label":"Encaissement et suivi des paiements","weight":15},
     {"key":"integrations","label":"Export et intégrations comptables","weight":15},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('comptabilite',
   'Tenue comptable, lettrage, déclarations et collaboration avec l''expert-comptable.',
   '[{"key":"couverture","label":"Couverture comptable (saisie, lettrage, déclarations)","weight":25},
     {"key":"automatisation","label":"Automatisation (flux bancaires, justificatifs)","weight":20},
     {"key":"conformite","label":"Conformité (FEC, facturation électronique)","weight":20},
     {"key":"collaboration","label":"Collaboration avec l''expert-comptable","weight":10},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('rapprochement-bancaire',
   'Lettrage automatique des relevés bancaires avec les écritures, factures et paiements.',
   '[{"key":"automatisation","label":"Taux de rapprochement automatique","weight":30},
     {"key":"connexions_bancaires","label":"Connexions bancaires","weight":20},
     {"key":"integrations","label":"Intégrations comptables et ERP","weight":20},
     {"key":"ecarts","label":"Traitement des écarts et piste d''audit","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('recouvrement',
   'Relances clients automatisées, suivi du risque client et réduction du DSO (credit management, hors financement).',
   '[{"key":"relances","label":"Scénarios de relance automatisés","weight":25},
     {"key":"risque","label":"Suivi du risque et des encours clients","weight":20},
     {"key":"portail","label":"Portail client et paiement en ligne","weight":15},
     {"key":"integrations","label":"Intégrations comptables, ERP et CRM","weight":20},
     {"key":"reporting","label":"Reporting (DSO, balance âgée)","weight":5},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('pilotage-financier',
   'Budget, prévisions, reporting et analyse des écarts (FP&A) pour PME et ETI.',
   '[{"key":"modelisation","label":"Budget, prévisions et scénarios","weight":30},
     {"key":"donnees","label":"Connexion aux données (comptabilité, ERP, banque)","weight":20},
     {"key":"reporting","label":"Reporting et analyse des écarts","weight":20},
     {"key":"collaboration","label":"Collaboration et circuit de validation","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('consolidation',
   null,
   '[{"key":"retraitements","label":"Retraitements et éliminations intragroupe","weight":30},
     {"key":"normes","label":"Référentiels (normes françaises, IFRS)","weight":15},
     {"key":"devises","label":"Multi-devises et périmètres","weight":15},
     {"key":"reporting","label":"Liasses et reporting groupe","weight":15},
     {"key":"audit","label":"Piste d''audit et contrôles","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]'),
  ('achats',
   null,
   '[{"key":"commandes","label":"Demandes d''achat et bons de commande","weight":25},
     {"key":"validation","label":"Circuits de validation et budgets","weight":20},
     {"key":"rapprochement","label":"Rapprochement commande, réception, facture","weight":20},
     {"key":"fournisseurs","label":"Référentiel et portail fournisseurs","weight":10},
     {"key":"integrations","label":"Intégrations comptables et ERP","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]')
)
update public.categories c set
  description = coalesce(c.description, g.description),
  criteria    = case when c.criteria = '[]'::jsonb then g.criteria::jsonb else c.criteria end
from grids g
where c.site_id = '10000000-0000-4000-a000-000000000001' and c.slug = g.slug
  and (c.criteria = '[]'::jsonb or c.description is null);

update public.categories set description = 'Annuaire factuel des cabinets d''expertise comptable (profession réglementée : aucun classement).'
where site_id = '10000000-0000-4000-a000-000000000001' and slug = 'experts-comptables' and description is null;

-- ---------------------------------------------------------------------------
-- 3. Facettes demandées par le cahier des charges (gratuit, TPE/PME, BTP…)
-- ---------------------------------------------------------------------------
insert into public.facets (category_id, facet_type, name, slug, rule, is_landing)
select c.id, f.facet_type::public.facet_type, f.name, f.slug, f.rule::jsonb, f.is_landing
from public.categories c
join (values
  ('facturation',  'price',        'Gratuit',               'gratuit',           '{"fact_type":"free_plan","equals":true}',          true),
  ('facturation',  'sector',       'Pour le BTP',           'btp',               '{"fact_type":"sectors","contains":"btp"}',         true),
  ('facturation',  'company_size', 'Pour auto-entrepreneur', 'auto-entrepreneur', '{"fact_type":"target_sizes","contains":"micro"}',  true),
  ('comptabilite', 'price',        'Gratuit',               'gratuit',           '{"fact_type":"free_plan","equals":true}',          true),
  ('comptabilite', 'company_size', 'Pour PME',              'pme',               '{"fact_type":"target_sizes","contains":"pme"}',    true),
  ('comptabilite', 'sector',       'Pour association',      'association',       '{"fact_type":"sectors","contains":"association"}', true),
  ('comptabilite', 'company_size', 'Pour auto-entrepreneur', 'auto-entrepreneur', '{"fact_type":"target_sizes","contains":"micro"}',  false),
  ('recouvrement', 'company_size', 'Pour PME',              'pme',               '{"fact_type":"target_sizes","contains":"pme"}',    false),
  ('pilotage-financier', 'company_size', 'Pour PME',        'pme',               '{"fact_type":"target_sizes","contains":"pme"}',    false)
) as f(cat, facet_type, name, slug, rule, is_landing) on c.slug = f.cat
where c.site_id = '10000000-0000-4000-a000-000000000001'
on conflict (category_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Mots-clés absents du relevé initial (consolidation : ARCHITECTURE §2 ; achats et FP&A : Semrush FR 07/11/2026)
-- ---------------------------------------------------------------------------
insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000001', 'logiciel consolidation', 110, 11.90, 18, 'commercial', 'consolidation', 'semrush', '2026-11-04'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel achat', 480, 4.48, 20, 'commercial', 'achats', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'logiciel fp&a', 140, 0, 19, 'commercial', 'pilotage', 'semrush', '2026-11-07')
on conflict (site_id, keyword) do update set
  volume = excluded.volume, cpc_eur = excluded.cpc_eur, kd = excluded.kd, source = excluded.source, refreshed_at = excluded.refreshed_at
where public.keyword_targets.source = 'a_mesurer';

-- Valeur commerciale des achats (volume × CPC), si encore non renseignée
update public.categories set value_score = 2150
where site_id = '10000000-0000-4000-a000-000000000001' and slug = 'achats' and value_score = 0;

-- ---------------------------------------------------------------------------
-- 5. Pages à rédiger : fiche + brief SEO (aucune version, rien de publié)
-- ---------------------------------------------------------------------------
-- Liens internes voulus par brief : résolus en fin de fichier (et à chaque déploiement),
-- car la page cible peut être créée plus tard.
create temp table if not exists planned_links (content_item_id uuid, paths text[]);

create or replace function pg_temp.planned(
  p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_cluster text,
  p_kw text, p_secondary text[], p_questions text[], p_outline text[], p_words int, p_required text[], p_cta text
) returns void language plpgsql as $$
declare
  site constant uuid := '10000000-0000-4000-a000-000000000001';
  iid uuid; kid uuid; cat uuid;
begin
  select id into iid from public.content_items where site_id = site and type = p_type and slug = p_slug;
  if iid is not null then
    insert into planned_links values (iid, p_required);
    return;
  end if;
  select id into cat from public.categories where site_id = site and slug = p_category_slug;
  -- Mot-clé principal : seulement s'il n'est pas déjà la cible d'une autre page
  select k.id into kid from public.keyword_targets k
  where k.site_id = site and k.keyword = p_kw and k.target_content_id is null
    and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
  insert into public.content_items (site_id, type, slug, title, category_id, cluster, primary_keyword_id)
  values (site, p_type, p_slug, p_title, cat, p_cluster, kid)
  returning id into iid;
  if kid is not null then
    update public.keyword_targets set target_content_id = iid, status = 'in_progress' where id = kid and status = 'todo';
  end if;
  insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, questions, outline, target_words, required_links, cta)
  values (iid, p_kw, p_secondary, p_questions,
          (select coalesce(jsonb_agg(jsonb_build_object('level', 2, 'text', t)), '[]'::jsonb) from unnest(p_outline) t),
          p_words,
          coalesce((select array_agg(i.id) from public.content_items i where i.site_id = site and i.path = any (p_required)), '{}'),
          p_cta);
  insert into planned_links values (iid, p_required);
end;
$$;

-- Dossier pilier (exemple cité au cahier des charges : /dossiers/facturation-electronique)
select pg_temp.planned('pillar', 'facturation-electronique', 'Facturation électronique : le dossier complet',
  'facturation-electronique', 'facturation-electronique', 'facturation électronique',
  array['facture électronique', 'plateforme agréée', 'e-reporting', 'réforme facturation électronique 2026'],
  array['qui est concerné par la facturation électronique', 'quand la facturation électronique devient-elle obligatoire', 'quelle plateforme choisir pour la facturation électronique'],
  array['Calendrier de la réforme (réception 2026, émission 2027)', 'Qui est concerné', 'Plateformes agréées : rôle et choix', 'Formats et mentions obligatoires', 'E-reporting', 'Préparer son entreprise étape par étape', 'Questions fréquentes'],
  1800, array['/meilleurs-logiciels/facturation-electronique', '/guides/choisir-plateforme-agreee', '/guides/facturation-electronique-qui-est-concerne'],
  'Comparer les plateformes agréées');

-- Comparatifs des catégories de lancement
select pg_temp.planned('category_ranking', 'facturation', 'Meilleurs logiciels de facturation', 'facturation', 'facturation',
  'logiciel de facturation', array['logiciel facturation', 'logiciel de facturation en ligne', 'logiciel devis facture'],
  array['quel logiciel de facturation choisir', 'quel logiciel de facturation est conforme à la facturation électronique'],
  array['Notre classement', 'Critères de choix', 'Conformité facturation électronique', 'Prix', 'Méthode de test'], 1200,
  array['/dossiers/facturation-electronique'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'comptabilite', 'Meilleurs logiciels de comptabilité', 'comptabilite', 'comptabilite',
  'logiciel comptabilité', array['logiciel de comptabilité', 'logiciel comptabilité en ligne', 'logiciel comptabilité entreprise', 'logiciel expert comptable'],
  array['quel logiciel de comptabilité choisir pour une PME', 'peut-on tenir sa comptabilité soi-même'],
  array['Notre classement', 'Critères de choix', 'Travailler avec son expert-comptable', 'Prix', 'Méthode de test'], 1200,
  array['/prestataires/experts-comptables'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'rapprochement-bancaire', 'Meilleurs logiciels de rapprochement bancaire', 'rapprochement-bancaire', 'rapprochement-bancaire',
  'logiciel rapprochement bancaire', array['logiciel de rapprochement bancaire', 'rapprochement bancaire automatique'],
  array['comment automatiser le rapprochement bancaire'],
  array['Notre classement', 'Critères de choix', 'Taux de rapprochement automatique', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/tresorerie'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'recouvrement', 'Meilleurs logiciels de recouvrement', 'recouvrement', 'recouvrement',
  'logiciel recouvrement', array['logiciel relance client', 'credit management', 'réduire le dso'],
  array['comment réduire son dso', 'comment automatiser les relances clients'],
  array['Notre classement', 'Critères de choix', 'Relances, DSO et balance âgée', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/facturation'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'pilotage-financier', 'Meilleurs logiciels de pilotage financier et FP&A', 'pilotage-financier', 'pilotage',
  'logiciel fp&a', array['logiciel budget', 'logiciel de pilotage financier', 'logiciel contrôle de gestion'],
  array['quel logiciel pour construire son budget'],
  array['Notre classement', 'Critères de choix', 'Budget, prévisions et reporting', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/tresorerie'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'consolidation', 'Meilleurs logiciels de consolidation', 'consolidation', 'consolidation',
  'logiciel consolidation', array['logiciel consolidation comptable', 'consolidation des comptes'],
  array['quand une entreprise doit-elle consolider ses comptes'],
  array['Notre classement', 'Critères de choix', 'Retraitements, intragroupe, devises', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/pilotage-financier'], 'Comparer les logiciels testés');
select pg_temp.planned('category_ranking', 'achats', 'Meilleurs logiciels achats', 'achats', 'achats',
  'logiciel achat', array['logiciel gestion des achats', 'procure to pay', 'dématérialisation factures fournisseurs'],
  array['comment structurer le processus achats d''une PME'],
  array['Notre classement', 'Critères de choix', 'Du bon de commande à la facture', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/notes-de-frais'], 'Comparer les logiciels testés');

-- Facettes à fort volume
select pg_temp.planned('facet_landing', 'facturation/gratuit', 'Logiciels de facturation gratuits', 'facturation', 'facturation',
  'logiciel facturation gratuit', array['logiciel devis facture gratuit'], array['existe-t-il un logiciel de facturation gratuit conforme'],
  array['Les offres gratuites testées', 'Limites des offres gratuites', 'Quand passer à une offre payante'], 700,
  array['/meilleurs-logiciels/facturation'], 'Voir le comparatif complet');
select pg_temp.planned('facet_landing', 'facturation/btp', 'Logiciels de facturation pour le BTP', 'facturation', 'facturation',
  'logiciel facturation btp', array['logiciel facturation batiment'], array['quelles mentions sur une facture du btp'],
  array['Les logiciels adaptés au BTP', 'Situations de travaux, retenues de garantie, autoliquidation', 'Prix'], 700,
  array['/meilleurs-logiciels/facturation'], 'Voir le comparatif complet');
select pg_temp.planned('facet_landing', 'comptabilite/gratuit', 'Logiciels de comptabilité gratuits', 'comptabilite', 'comptabilite',
  'logiciel comptabilité gratuit', array[]::text[], array['existe-t-il un logiciel de comptabilité gratuit'],
  array['Les offres gratuites testées', 'Limites', 'Alternatives payantes abordables'], 700,
  array['/meilleurs-logiciels/comptabilite'], 'Voir le comparatif complet');
select pg_temp.planned('facet_landing', 'comptabilite/pme', 'Logiciels de comptabilité pour PME', 'comptabilite', 'comptabilite',
  'logiciel comptabilité pme', array['logiciel comptabilité entreprise'], array['quel logiciel de comptabilité pour une pme'],
  array['Les logiciels adaptés aux PME', 'Multi-utilisateurs, analytique, multi-sociétés', 'Prix'], 700,
  array['/meilleurs-logiciels/comptabilite'], 'Voir le comparatif complet');

-- Guides des clusters DAF (volumes Semrush, docs/seo/keywords-fr-2026-11-v2.csv)
select pg_temp.planned('guide', 'plan-de-tresorerie', 'Plan de trésorerie : méthode et modèle', 'tresorerie', 'tresorerie',
  'plan de trésorerie', array['plan de trésorerie prévisionnel', 'budget de trésorerie', 'tableau de trésorerie'],
  array['comment faire un plan de trésorerie', 'quelle différence entre plan de trésorerie et budget'],
  array['À quoi sert un plan de trésorerie', 'Construire son plan pas à pas', 'Exemple chiffré', 'Erreurs fréquentes', 'Outils'], 1000,
  array['/meilleurs-logiciels/tresorerie'], 'Comparer les logiciels de trésorerie');
select pg_temp.planned('guide', 'rapprochement-bancaire', 'Rapprochement bancaire : définition, méthode et exemple', 'rapprochement-bancaire', 'rapprochement-bancaire',
  'rapprochement bancaire', array['etat de rapprochement bancaire', 'rapprochement bancaire exemple', 'comment faire un rapprochement bancaire'],
  array['comment faire un rapprochement bancaire', 'à quelle fréquence faire un rapprochement bancaire'],
  array['Définition', 'Méthode pas à pas', 'Exemple d''état de rapprochement', 'Automatiser le rapprochement'], 1000,
  array['/meilleurs-logiciels/rapprochement-bancaire'], 'Comparer les logiciels de rapprochement');
select pg_temp.planned('guide', 'recouvrement-de-creances', 'Recouvrement de créances : les étapes pour une PME', 'recouvrement', 'recouvrement',
  'recouvrement de créances', array['recouvrement amiable', 'relance facture impayée'],
  array['quelles sont les étapes du recouvrement amiable', 'quel délai pour relancer une facture impayée'],
  array['Prévenir les impayés', 'Relances amiables', 'Mise en demeure', 'Recouvrement judiciaire : quand et comment', 'Suivre son DSO'], 1000,
  array['/meilleurs-logiciels/recouvrement'], 'Comparer les logiciels de recouvrement');
select pg_temp.planned('guide', 'budget-previsionnel', 'Budget prévisionnel : construire le budget de son entreprise', 'pilotage-financier', 'pilotage',
  'budget prévisionnel', array['prévisionnel', 'bilan prévisionnel', 'compte de résultat prévisionnel', 'prévisionnel financier'],
  array['comment faire un budget prévisionnel', 'quelle différence entre budget et prévisionnel'],
  array['Les composantes du budget', 'Méthode pas à pas', 'Suivi des écarts', 'Outils'], 1000,
  array['/meilleurs-logiciels/pilotage-financier'], 'Comparer les logiciels de pilotage');

-- Ressources (cahier des charges : modèles de prévisionnel, plan de trésorerie)
select pg_temp.planned('resource', 'modele-plan-de-tresorerie', 'Modèle de plan de trésorerie (Excel)', 'tresorerie', 'tresorerie',
  'tableau de trésorerie', array['modèle plan de trésorerie excel'], array[]::text[],
  array['Contenu du modèle', 'Mode d''emploi', 'Aller plus loin avec un logiciel'], 400,
  array['/guides/plan-de-tresorerie'], 'Télécharger le modèle');
select pg_temp.planned('resource', 'modele-budget-previsionnel', 'Modèle de budget prévisionnel (Excel gratuit)', 'pilotage-financier', 'pilotage',
  'modèle budget prévisionnel excel gratuit', array['tableau prévisionnel à remplir gratuit'], array[]::text[],
  array['Contenu du modèle', 'Mode d''emploi', 'Aller plus loin avec un logiciel'], 400,
  array['/guides/budget-previsionnel'], 'Télécharger le modèle');

-- Annuaire des experts-comptables (liste factuelle, sans classement)
select pg_temp.planned('provider_directory', 'experts-comptables', 'Annuaire des experts-comptables', 'experts-comptables', 'comptabilite',
  'expert comptable', array['cabinet expertise comptable', 'expert comptable en ligne'],
  array['comment choisir son expert-comptable', 'combien coûte un expert-comptable'],
  array['Comment choisir son expert-comptable', 'Les cabinets référencés', 'Référencer son cabinet'], 600,
  array['/meilleurs-logiciels/comptabilite'], 'Référencer mon cabinet');

-- Résolution des liens internes obligatoires (ajoute les pages cibles apparues depuis)
update public.seo_briefs b set required_links = (
  select coalesce(array_agg(distinct x), '{}') from unnest(b.required_links || coalesce((
    select array_agg(i.id) from public.content_items i
    where i.site_id = '10000000-0000-4000-a000-000000000001' and i.path = any (l.paths)), '{}')) x)
from planned_links l
where b.content_item_id = l.content_item_id;
