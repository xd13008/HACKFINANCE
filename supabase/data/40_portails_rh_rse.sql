-- =============================================================================
-- Deux nouveaux portails (ARCHITECTURE §3, verticales recommandées n° 1 et n° 3) :
--   Radar RH  (radarrh.com)  : paie, SIRH, planning, recrutement, entretiens
--   Radar RSE (radarrse.com) : bilan carbone, reporting CSRD, pilotage RSE, évaluation fournisseurs
-- Statut « draft » : aucun domaine n'est servi tant qu'il n'est pas ajouté à SITE_DOMAINS.
-- Idempotent ; ne publie rien (catégories en brouillon, pages = fiche + brief, sans version).
-- Volumes : Semrush FR, 07/11/2026.
-- =============================================================================

insert into public.sites (id, key, name, domain, tagline, description, audience, theme, status) values
  ('10000000-0000-4000-a000-000000000003', 'rh', 'Radar RH', 'radarrh.com',
   'Les logiciels RH et paie, testés pour les PME',
   'Comparatifs indépendants de logiciels de paie, SIRH, planning et recrutement, testés selon une méthode publiée.',
   'DRH, RAF, gestionnaires de paie et dirigeants de PME',
   '{"primary":"#6d28d9","accent":"#f59e0b"}', 'draft'),
  ('10000000-0000-4000-a000-000000000004', 'rse', 'Radar RSE', 'radarrse.com',
   'Les logiciels RSE et carbone, testés pour les PME et ETI',
   'Comparatifs indépendants de logiciels de bilan carbone, de reporting CSRD et de pilotage RSE, testés selon une méthode publiée.',
   'Responsables RSE, DAF et dirigeants de PME et ETI',
   '{"primary":"#047857","accent":"#f59e0b"}', 'draft')
on conflict (id) do nothing;

insert into public.verticals (id, site_id, name, slug, sort) values
  ('11000000-0000-4000-a000-000000000010', '10000000-0000-4000-a000-000000000003', 'Paie & administration du personnel', 'paie-administration', 1),
  ('11000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000003', 'Temps & planning', 'temps-planning', 2),
  ('11000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000003', 'Recrutement & talents', 'talents', 3),
  ('11000000-0000-4000-a000-000000000020', '10000000-0000-4000-a000-000000000004', 'Climat & carbone', 'climat', 1),
  ('11000000-0000-4000-a000-000000000021', '10000000-0000-4000-a000-000000000004', 'Reporting de durabilité', 'reporting', 2),
  ('11000000-0000-4000-a000-000000000022', '10000000-0000-4000-a000-000000000004', 'Achats responsables', 'achats-responsables', 3)
on conflict (site_id, slug) do nothing;

insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  -- Radar RH
  ('12000000-0000-4000-a000-000000000040', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000010',
   'software', 'Logiciels de paie', 'paie', 'paie',
   'Calcul des bulletins, déclarations sociales (DSN) et gestion des variables de paie.',
   '[{"key":"conformite","label":"Conformité légale et DSN","weight":30},
     {"key":"variables","label":"Gestion des variables et conventions collectives","weight":20},
     {"key":"portail","label":"Portail salarié et bulletins dématérialisés","weight":10},
     {"key":"integrations","label":"Intégrations (comptabilité, SIRH, temps)","weight":15},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 14638, 'draft', 1),
  ('12000000-0000-4000-a000-000000000041', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000010',
   'software', 'Logiciels SIRH', 'sirh', 'SIRH',
   'Dossier salarié, congés et absences, entretiens et documents RH dans un même outil.',
   '[{"key":"couverture","label":"Couverture fonctionnelle (dossier, congés, entretiens)","weight":30},
     {"key":"self_service","label":"Libre-service salarié et mobile","weight":15},
     {"key":"integrations","label":"Intégration à la paie","weight":20},
     {"key":"securite","label":"Sécurité et RGPD","weight":10},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 68244, 'draft', 2),
  ('12000000-0000-4000-a000-000000000042', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000011',
   'software', 'Logiciels de planning et de gestion des temps', 'planning', 'planning',
   'Plannings d''équipe, pointage, suivi du temps de travail et export vers la paie.',
   '[{"key":"planification","label":"Construction des plannings","weight":25},
     {"key":"temps","label":"Pointage et suivi des temps","weight":20},
     {"key":"conformite","label":"Règles de durée du travail","weight":20},
     {"key":"mobile","label":"Application mobile","weight":10},
     {"key":"integrations","label":"Export vers la paie","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 14280, 'draft', 3),
  ('12000000-0000-4000-a000-000000000043', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000012',
   'software', 'Logiciels de recrutement (ATS)', 'recrutement', 'recrutement',
   'Multidiffusion des offres, suivi des candidatures et collaboration avec les managers.',
   '[{"key":"diffusion","label":"Multidiffusion et page carrière","weight":20},
     {"key":"suivi","label":"Suivi des candidats","weight":25},
     {"key":"collaboration","label":"Collaboration avec les managers","weight":15},
     {"key":"rgpd","label":"Conformité RGPD des candidatures","weight":15},
     {"key":"integrations","label":"Intégrations (SIRH, agendas)","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 11167, 'draft', 4),
  ('12000000-0000-4000-a000-000000000044', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000012',
   'software', 'Logiciels d''entretiens annuels', 'entretiens-annuels', 'entretiens annuels',
   'Campagnes d''entretiens annuels et professionnels, objectifs et compétences.',
   '[{"key":"campagnes","label":"Campagnes d''entretiens","weight":25},
     {"key":"objectifs","label":"Objectifs et compétences","weight":25},
     {"key":"reporting","label":"Suivi et reporting","weight":15},
     {"key":"integrations","label":"Intégration au SIRH","weight":10},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 7094, 'draft', 5),
  ('12000000-0000-4000-a000-000000000045', '10000000-0000-4000-a000-000000000003', '11000000-0000-4000-a000-000000000010',
   'provider', 'Prestataires d''externalisation de la paie', 'externalisation-paie', 'externalisation de la paie',
   'Annuaire factuel des prestataires de paie externalisée (sans classement en V1).', '[]', 13830, 'draft', 6),
  -- Radar RSE
  ('12000000-0000-4000-a000-000000000050', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000020',
   'software', 'Logiciels de bilan carbone', 'bilan-carbone', 'bilan carbone',
   'Mesure des émissions de gaz à effet de serre (scopes 1, 2 et 3) et plan de réduction.',
   '[{"key":"methodologie","label":"Méthodologie (GHG Protocol, Bilan Carbone, scope 3)","weight":30},
     {"key":"collecte","label":"Collecte des données d''activité","weight":20},
     {"key":"facteurs","label":"Facteurs d''émission sourcés et à jour","weight":15},
     {"key":"trajectoire","label":"Plan de réduction et trajectoire","weight":10},
     {"key":"ergonomie","label":"Prise en main","weight":10},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 2829, 'draft', 1),
  ('12000000-0000-4000-a000-000000000051', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000021',
   'software', 'Logiciels de reporting CSRD', 'reporting-csrd', 'reporting CSRD',
   'Double matérialité, collecte des indicateurs ESRS et préparation du rapport de durabilité.',
   '[{"key":"esrs","label":"Couverture ESRS et double matérialité","weight":30},
     {"key":"collecte","label":"Collecte et circuit de validation","weight":20},
     {"key":"audit","label":"Piste d''audit pour la vérification","weight":20},
     {"key":"integrations","label":"Intégrations (ERP, paie, carbone)","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 6170, 'draft', 2),
  ('12000000-0000-4000-a000-000000000052', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000021',
   'software', 'Logiciels de pilotage RSE', 'pilotage-rse', 'pilotage RSE',
   'Indicateurs RSE, plans d''action et reporting extra-financier pour les entreprises non soumises ou en préparation.',
   '[{"key":"indicateurs","label":"Référentiel d''indicateurs","weight":25},
     {"key":"collecte","label":"Collecte des données","weight":20},
     {"key":"plans","label":"Plans d''action et suivi","weight":20},
     {"key":"reporting","label":"Reporting et communication","weight":20},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 9038, 'draft', 3),
  ('12000000-0000-4000-a000-000000000053', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000022',
   'software', 'Logiciels d''évaluation RSE des fournisseurs', 'evaluation-fournisseurs', 'évaluation RSE des fournisseurs',
   'Questionnaires, scoring et plans d''amélioration des fournisseurs (devoir de vigilance, achats responsables).',
   '[{"key":"questionnaires","label":"Questionnaires et référentiels","weight":25},
     {"key":"scoring","label":"Scoring et preuves","weight":25},
     {"key":"amelioration","label":"Plans d''amélioration","weight":15},
     {"key":"integrations","label":"Intégration aux achats","weight":20},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 4),
  ('12000000-0000-4000-a000-000000000054', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000020',
   'provider', 'Cabinets de bilan carbone', 'cabinets-bilan-carbone', 'cabinet de bilan carbone',
   'Annuaire factuel des cabinets qui réalisent les bilans d''émissions de gaz à effet de serre (sans classement en V1).', '[]', 11583, 'draft', 5),
  ('12000000-0000-4000-a000-000000000055', '10000000-0000-4000-a000-000000000004', '11000000-0000-4000-a000-000000000021',
   'provider', 'Vérificateurs du rapport de durabilité', 'verificateurs-durabilite', 'vérificateur CSRD',
   'Commissaires aux comptes et organismes tiers indépendants habilités : fiches factuelles uniquement, aucun classement (activité réglementée).', '[]', 0, 'draft', 6)
on conflict (site_id, slug) do nothing;

insert into public.facets (category_id, facet_type, name, slug, rule, is_landing) values
  ('12000000-0000-4000-a000-000000000040', 'company_size', 'Pour PME', 'pme', '{"fact_type":"target_sizes","contains":"pme"}', true),
  ('12000000-0000-4000-a000-000000000040', 'company_size', 'Pour TPE', 'tpe', '{"fact_type":"target_sizes","contains":"tpe"}', true),
  ('12000000-0000-4000-a000-000000000041', 'company_size', 'Pour PME', 'pme', '{"fact_type":"target_sizes","contains":"pme"}', true),
  ('12000000-0000-4000-a000-000000000042', 'price', 'Gratuit', 'gratuit', '{"fact_type":"free_plan","equals":true}', true),
  ('12000000-0000-4000-a000-000000000050', 'company_size', 'Pour PME', 'pme', '{"fact_type":"target_sizes","contains":"pme"}', true)
on conflict (category_id, slug) do nothing;

insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000003', 'sirh', 12100, 5.64, 36, 'informational', 'sirh', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel rh', 3600, 12.76, 25, 'commercial', 'sirh', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel paie', 1300, 11.26, 39, 'commercial', 'paie', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'externalisation paie', 1000, 13.83, 19, 'commercial', 'paie', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel planning', 2400, 5.95, 14, 'commercial', 'planning', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel gestion des temps', 720, 10.58, 28, 'commercial', 'planning', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'ats recrutement', 1300, 8.59, 37, 'commercial', 'recrutement', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel recrutement', 1000, 8.49, 37, 'commercial', 'recrutement', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000003', 'logiciel entretien annuel', 390, 18.19, 27, 'commercial', 'talents', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'csrd', 12100, 0.81, 51, 'informational', 'csrd', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'logiciel csrd', 390, 15.82, 15, 'commercial', 'csrd', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'bilan carbone', 5400, 1.50, 60, 'informational', 'carbone', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'bilan carbone entreprise', 1300, 8.91, 43, 'commercial', 'carbone', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'logiciel bilan carbone', 320, 8.84, 26, 'commercial', 'carbone', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000004', 'logiciel rse', 880, 10.27, 12, 'commercial', 'rse', 'semrush', '2026-11-07')
on conflict (site_id, keyword) do nothing;

-- ---------------------------------------------------------------------------
-- Pages à rédiger (fiche + brief) — liens internes résolus en fin de fichier
-- ---------------------------------------------------------------------------
create temp table if not exists planned_links_rr (content_item_id uuid, site_id uuid, paths text[]);

create or replace function pg_temp.plan(
  p_site text, p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_cluster text,
  p_kw text, p_secondary text[], p_questions text[], p_outline text[], p_words int, p_required text[], p_cta text
) returns void language plpgsql as $$
declare sid uuid; iid uuid; kid uuid; cat uuid;
begin
  select id into sid from public.sites where key = p_site;
  if sid is null then return; end if;
  select id into iid from public.content_items where site_id = sid and type = p_type and slug = p_slug;
  if iid is null then
    select id into cat from public.categories where site_id = sid and slug = p_category_slug;
    select k.id into kid from public.keyword_targets k
    where k.site_id = sid and k.keyword = p_kw and k.target_content_id is null
      and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
    insert into public.content_items (site_id, type, slug, title, category_id, cluster, primary_keyword_id)
    values (sid, p_type, p_slug, p_title, cat, p_cluster, kid) returning id into iid;
    if kid is not null then
      update public.keyword_targets set target_content_id = iid, status = 'in_progress' where id = kid and status = 'todo';
    end if;
    insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, questions, outline, target_words, cta)
    values (iid, p_kw, p_secondary, p_questions,
            (select coalesce(jsonb_agg(jsonb_build_object('level', 2, 'text', t)), '[]'::jsonb) from unnest(p_outline) t),
            p_words, p_cta);
  end if;
  insert into planned_links_rr values (iid, sid, p_required);
end;
$$;

-- Radar RH
select pg_temp.plan('rh', 'pillar', 'sirh', 'SIRH : le dossier complet', 'sirh', 'sirh',
  'sirh', array['logiciel rh', 'système d''information rh'], array['qu''est-ce qu''un sirh', 'comment choisir son sirh'],
  array['Définition', 'Modules d''un SIRH', 'SIRH et paie', 'Choisir et déployer son SIRH', 'Questions fréquentes'], 1600,
  array['/meilleurs-logiciels/sirh', '/meilleurs-logiciels/paie'], 'Comparer les SIRH testés');
select pg_temp.plan('rh', 'category_ranking', 'sirh', 'Meilleurs logiciels SIRH', 'sirh', 'sirh',
  'logiciel rh', array['sirh pme', 'logiciel gestion rh'], array['quel sirh pour une pme'],
  array['Notre classement', 'Critères de choix', 'Prix', 'Méthode de test'], 1200, array['/dossiers/sirh'], 'Comparer les logiciels testés');
select pg_temp.plan('rh', 'category_ranking', 'paie', 'Meilleurs logiciels de paie', 'paie', 'paie',
  'logiciel paie', array['logiciel de paie', 'logiciel paie pme'], array['quel logiciel de paie choisir'],
  array['Notre classement', 'Critères de choix', 'DSN et conformité', 'Prix', 'Méthode de test'], 1200,
  array['/dossiers/sirh', '/prestataires/externalisation-paie'], 'Comparer les logiciels testés');
select pg_temp.plan('rh', 'category_ranking', 'planning', 'Meilleurs logiciels de planning', 'planning', 'planning',
  'logiciel planning', array['logiciel gestion des temps', 'logiciel planning gratuit'], array['quel logiciel de planning pour une équipe'],
  array['Notre classement', 'Critères de choix', 'Temps de travail : règles à respecter', 'Prix', 'Méthode de test'], 1000,
  array['/meilleurs-logiciels/paie'], 'Comparer les logiciels testés');
select pg_temp.plan('rh', 'category_ranking', 'recrutement', 'Meilleurs logiciels de recrutement (ATS)', 'recrutement', 'recrutement',
  'ats recrutement', array['logiciel recrutement', 'logiciel ats'], array['qu''est-ce qu''un ats'],
  array['Notre classement', 'Critères de choix', 'RGPD et candidatures', 'Prix', 'Méthode de test'], 1000,
  array['/meilleurs-logiciels/sirh'], 'Comparer les logiciels testés');
select pg_temp.plan('rh', 'category_ranking', 'entretiens-annuels', 'Meilleurs logiciels d''entretiens annuels', 'entretiens-annuels', 'talents',
  'logiciel entretien annuel', array['logiciel entretien professionnel'], array['entretien annuel ou entretien professionnel : quelle différence'],
  array['Notre classement', 'Critères de choix', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/sirh'], 'Comparer les logiciels testés');
select pg_temp.plan('rh', 'provider_directory', 'externalisation-paie', 'Prestataires d''externalisation de la paie', 'externalisation-paie', 'paie',
  'externalisation paie', array['externaliser sa paie', 'prestataire paie'], array['combien coûte l''externalisation de la paie'],
  array['Externaliser ou internaliser sa paie', 'Les prestataires référencés', 'Référencer son cabinet'], 700,
  array['/meilleurs-logiciels/paie'], 'Référencer mon cabinet');

-- Radar RSE
select pg_temp.plan('rse', 'pillar', 'csrd', 'CSRD : le dossier complet', 'reporting-csrd', 'csrd',
  'csrd', array['directive csrd', 'rapport de durabilité', 'esrs', 'double matérialité'],
  array['qui est concerné par la csrd', 'quel calendrier pour la csrd', 'qu''est-ce que la double matérialité'],
  array['Ce que prévoit la directive', 'Entreprises concernées et calendrier', 'Normes ESRS et double matérialité', 'Vérification du rapport', 'Outils et prestataires', 'Questions fréquentes'], 1800,
  array['/meilleurs-logiciels/reporting-csrd', '/prestataires/verificateurs-durabilite'], 'Comparer les logiciels CSRD');
select pg_temp.plan('rse', 'pillar', 'bilan-carbone', 'Bilan carbone : le dossier complet', 'bilan-carbone', 'carbone',
  'bilan carbone', array['bilan ges', 'scope 3', 'bilan carbone obligatoire'],
  array['qui doit faire un bilan carbone', 'comment calculer le bilan carbone d''une entreprise'],
  array['Définition et méthodes', 'Obligations réglementaires', 'Scopes 1, 2 et 3', 'Réaliser son bilan : logiciel ou cabinet', 'Questions fréquentes'], 1600,
  array['/meilleurs-logiciels/bilan-carbone', '/prestataires/cabinets-bilan-carbone'], 'Comparer les logiciels de bilan carbone');
select pg_temp.plan('rse', 'category_ranking', 'bilan-carbone', 'Meilleurs logiciels de bilan carbone', 'bilan-carbone', 'carbone',
  'logiciel bilan carbone', array['outil bilan carbone', 'plateforme carbone'], array['quel logiciel pour faire son bilan carbone'],
  array['Notre classement', 'Critères de choix', 'Méthodologies et facteurs d''émission', 'Prix', 'Méthode de test'], 1000,
  array['/dossiers/bilan-carbone'], 'Comparer les logiciels testés');
select pg_temp.plan('rse', 'category_ranking', 'reporting-csrd', 'Meilleurs logiciels de reporting CSRD', 'reporting-csrd', 'csrd',
  'logiciel csrd', array['plateforme csrd', 'logiciel reporting esg'], array['quel logiciel pour le reporting csrd'],
  array['Notre classement', 'Critères de choix', 'ESRS et piste d''audit', 'Prix', 'Méthode de test'], 1000,
  array['/dossiers/csrd'], 'Comparer les logiciels testés');
select pg_temp.plan('rse', 'category_ranking', 'pilotage-rse', 'Meilleurs logiciels RSE', 'pilotage-rse', 'rse',
  'logiciel rse', array['logiciel esg', 'plateforme rse'], array['quel logiciel rse pour une pme'],
  array['Notre classement', 'Critères de choix', 'Prix', 'Méthode de test'], 1000,
  array['/dossiers/csrd'], 'Comparer les logiciels testés');
select pg_temp.plan('rse', 'category_ranking', 'evaluation-fournisseurs', 'Meilleurs logiciels d''évaluation RSE des fournisseurs', 'evaluation-fournisseurs', 'achats-responsables',
  'évaluation rse fournisseurs', array['achats responsables', 'devoir de vigilance'], array[]::text[],
  array['Notre classement', 'Critères de choix', 'Prix', 'Méthode de test'], 900,
  array['/meilleurs-logiciels/pilotage-rse'], 'Comparer les logiciels testés');
select pg_temp.plan('rse', 'provider_directory', 'cabinets-bilan-carbone', 'Annuaire des cabinets de bilan carbone', 'cabinets-bilan-carbone', 'carbone',
  'bilan carbone entreprise', array['cabinet bilan carbone', 'bureau d''études carbone'], array['combien coûte un bilan carbone'],
  array['Faire appel à un cabinet', 'Les cabinets référencés', 'Référencer son cabinet'], 700,
  array['/dossiers/bilan-carbone'], 'Référencer mon cabinet');
select pg_temp.plan('rse', 'provider_directory', 'verificateurs-durabilite', 'Vérificateurs du rapport de durabilité', 'verificateurs-durabilite', 'csrd',
  'vérification rapport de durabilité', array['organisme tiers indépendant', 'commissaire aux comptes csrd'], array['qui peut vérifier un rapport csrd'],
  array['Le rôle du vérificateur', 'Professionnels habilités (fiches factuelles, sans classement)'], 600,
  array['/dossiers/csrd'], null);

update public.seo_briefs b set required_links = (
  select coalesce(array_agg(distinct x), '{}') from unnest(b.required_links || coalesce((
    select array_agg(i.id) from public.content_items i where i.site_id = l.site_id and i.path = any (l.paths)), '{}')) x)
from planned_links_rr l
where b.content_item_id = l.content_item_id;

-- ---------------------------------------------------------------------------
-- Pages institutionnelles des nouveaux portails (brouillons, à compléter et valider)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.inst(p_site text, p_slug text, p_robots text, p_meta_title text, p_meta_desc text, p_h1 text, p_summary text, p_body text)
returns void language plpgsql as $$
declare sid uuid; iid uuid;
begin
  select id into sid from public.sites where key = p_site;
  if sid is null or exists (select 1 from public.content_items where site_id = sid and type = 'page' and slug = p_slug) then return; end if;
  insert into public.content_items (site_id, type, slug, title, robots) values (sid, 'page', p_slug, p_h1, p_robots) returning id into iid;
  insert into public.content_versions (content_item_id, version_no, meta_title, meta_description, h1, summary, body, author_kind, data)
  values (iid, 0, p_meta_title, p_meta_desc, p_h1, p_summary, p_body, 'agent',
          '{"editor_note":"Brouillon préparé par IA : compléter les passages entre crochets puis valider."}');
end;
$$;

do $$
declare r record;
begin
  for r in select * from (values ('rh', 'Radar RH', 'logiciels RH et paie'), ('rse', 'Radar RSE', 'logiciels RSE et carbone')) v(k, n, t) loop
    perform pg_temp.inst(r.k, 'methode', 'index',
      'Notre méthode de test et de notation — ' || r.n,
      'Comment ' || r.n || ' teste les ' || r.t || ' : protocole, critères pondérés, validation humaine, séparation entre éditorial et publicité.',
      'Notre méthode de test et de notation',
      'Chaque note publiée repose sur un test réel, daté, documenté par des preuves et validé par un membre humain de la rédaction. Aucun partenaire commercial ne peut modifier une note ni un classement.',
      E'## Le protocole de test\n\nChaque catégorie a un protocole identique pour tous les logiciels testés et une grille de critères pondérés, publiée sur la page de la catégorie.\n\n## Validation humaine\n\n[À compléter]\n\n## Éditorial et publicité\n\nLes emplacements sponsorisés sont signalés et affichés dans un bloc distinct. Ils ne modifient jamais le classement éditorial.');
    perform pg_temp.inst(r.k, 'a-propos', 'index',
      'À propos de ' || r.n || ' — qui sommes-nous ?',
      r.n || ' est un média indépendant qui teste les ' || r.t || ' des PME : équipe, rôle des agents IA, sources de revenus et engagements.',
      'À propos de ' || r.n,
      r.n || ' est un média indépendant consacré aux ' || r.t || ' des PME françaises.',
      E'## L''équipe\n\n[À compléter]\n\n## Nos engagements\n\n[À compléter]\n\n## Nos sources de revenus\n\n[À compléter]');
    perform pg_temp.inst(r.k, 'mentions-legales', 'noindex',
      'Mentions légales — ' || r.n,
      'Mentions légales du site ' || r.n || ' : éditeur, directeur de la publication, hébergeur et contact. Informations à compléter avant publication.',
      'Mentions légales', 'Éditeur, directeur de la publication, hébergeur et contact du site ' || r.n || '.',
      E'## Éditeur\n\n[À compléter]\n\n## Directeur de la publication\n\n[À compléter]\n\n## Hébergement\n\n[À compléter]');
    perform pg_temp.inst(r.k, 'donnees-personnelles', 'noindex',
      'Données personnelles et mesure d''audience — ' || r.n,
      'Comment ' || r.n || ' traite les données personnelles : mesure d''audience sans cookie, formulaires, durées de conservation et droits.',
      'Données personnelles', 'Mesure d''audience sans cookie, formulaires, durées de conservation et exercice de vos droits.',
      E'## Mesure d''audience\n\n[À compléter]\n\n## Formulaires\n\n[À compléter]\n\n## Vos droits\n\n[À compléter]');
  end loop;
end;
$$;
