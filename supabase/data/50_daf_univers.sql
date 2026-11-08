-- =============================================================================
-- Radar Finances : organisation en 8 univers opérationnels du DAF (décision du 08/11/2026)
--   1 Comptabilité, clôture & conformité   2 Trésorerie & cash        3 Dépenses & achats
--   4 Encaissement (Order-to-Cash)         5 Pilotage & performance   6 Équipe finance & expertise
--   7 Financement, aides & risques         8 RSE & performance durable
-- Les univers réutilisent les identifiants des rubriques existantes (renommées ici) : aucune
-- rubrique n'est supprimée, les fichiers précédents restent rejouables.
-- Garde-fous : univers 7 = aides publiques comparables + sujets réglementés en contenu seul
-- (regulated_topic, data/35 et 45) ; cartes d'entreprise = services de paiement, monétisation
-- par lead ou affiliation à valider juridiquement ; univers 8 = angle DAF, détail sur Radar RSE.
-- Idempotent ; ne publie rien.
-- =============================================================================

-- 1. Univers (renommage des rubriques existantes + création des manquants)
insert into public.verticals (id, site_id, name, slug, description, sort) values
  ('11000000-0000-4000-a000-000000000009', '10000000-0000-4000-a000-000000000001', 'Pilotage & performance', 'pilotage-performance',
   'Budget, prévisions, reporting et BI financière.', 5)
on conflict do nothing;

with u(id, name, slug, description, sort) as (values
  ('11000000-0000-4000-a000-000000000002'::uuid, 'Comptabilité, clôture & conformité', 'comptabilite-conformite',
   'Facture électronique, tenue comptable, clôture, consolidation, rapprochement, signature et archivage.', 1),
  ('11000000-0000-4000-a000-000000000001'::uuid, 'Trésorerie & cash', 'tresorerie-cash',
   'Prévision de trésorerie, communication bancaire et paiements.', 2),
  ('11000000-0000-4000-a000-000000000007'::uuid, 'Dépenses & achats', 'depenses-achats',
   'Notes de frais, cartes d''entreprise, achats, abonnements logiciels et réduction des coûts.', 3),
  ('11000000-0000-4000-a000-000000000004'::uuid, 'Encaissement (Order-to-Cash)', 'encaissement',
   'Facturation, relances, recouvrement et information sur la solvabilité des clients.', 4),
  ('11000000-0000-4000-a000-000000000009'::uuid, 'Pilotage & performance', 'pilotage-performance',
   'Budget, prévisions, reporting et BI financière.', 5),
  ('11000000-0000-4000-a000-000000000005'::uuid, 'Équipe finance & expertise', 'equipe-expertise',
   'Management de transition, experts indépendants, experts-comptables, formation, automatisation et IA.', 6),
  ('11000000-0000-4000-a000-000000000006'::uuid, 'Financement, aides & risques', 'financement-aides-risques',
   'Aides publiques et crédits d''impôt ; financement et assurance en information générale uniquement.', 7),
  ('11000000-0000-4000-a000-000000000008'::uuid, 'RSE & performance durable', 'rse-performance-durable',
   'Reporting ESG et carbone vu de la direction financière ; comparatifs détaillés sur Radar RSE.', 8)
)
update public.verticals v set name = u.name, slug = u.slug, description = u.description, sort = u.sort
from u where v.id = u.id and (v.name, v.slug, coalesce(v.description, ''), v.sort) is distinct from (u.name, u.slug, u.description, u.sort);

-- 2. Nouvelles catégories issues de la grille des univers (brouillon)
insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000070', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000001',
   'software', 'Logiciels de trésorerie groupe et communication bancaire', 'communication-bancaire', 'communication bancaire',
   'Connexion sécurisée aux banques (EBICS, SWIFT, API), paiements de masse, positions et prévisions de groupe (TMS).',
   '[{"key":"connectivite","label":"Connectivité bancaire (EBICS, SWIFT, API)","weight":25},
     {"key":"paiements","label":"Paiements de masse et circuits de validation","weight":20},
     {"key":"securite","label":"Sécurité et lutte contre la fraude","weight":20},
     {"key":"positions","label":"Positions et prévisions de groupe","weight":15},
     {"key":"integrations","label":"Intégrations ERP","weight":5},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 30),
  ('12000000-0000-4000-a000-000000000071', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000007',
   'software', 'Cartes d''entreprise et gestion des dépenses', 'cartes-entreprise', 'cartes d''entreprise',
   'Cartes à plafonds et règles de dépense, collecte automatique des justificatifs. Services de paiement : toute rémunération par lead ou affiliation est soumise à validation juridique (ARCHITECTURE §9).',
   '[{"key":"controle","label":"Plafonds et règles de dépense","weight":25},
     {"key":"justificatifs","label":"Collecte et rapprochement des justificatifs","weight":20},
     {"key":"integrations","label":"Export et intégrations comptables","weight":20},
     {"key":"conditions","label":"Frais et conditions","weight":20},
     {"key":"ergonomie","label":"Prise en main","weight":15}]', 0, 'draft', 31),
  ('12000000-0000-4000-a000-000000000072', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000004',
   'software', 'Information sur la solvabilité des entreprises', 'information-solvabilite', 'information sur la solvabilité',
   'Données légales et financières, scores et alertes sur les clients et fournisseurs (hors assurance-crédit).',
   '[{"key":"couverture","label":"Couverture et fraîcheur des données","weight":25},
     {"key":"alertes","label":"Alertes et surveillance","weight":20},
     {"key":"scoring","label":"Scores et explications","weight":20},
     {"key":"integrations","label":"Intégrations (CRM, ERP, recouvrement)","weight":20},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 32),
  ('12000000-0000-4000-a000-000000000073', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000009',
   'software', 'Logiciels de reporting et BI financière', 'reporting-bi', 'reporting et BI',
   'Tableaux de bord financiers connectés à la comptabilité, à l''ERP et aux banques.',
   '[{"key":"connecteurs","label":"Connecteurs de données","weight":25},
     {"key":"tableaux","label":"Tableaux de bord financiers","weight":25},
     {"key":"gouvernance","label":"Fiabilité et gouvernance des données","weight":20},
     {"key":"ergonomie","label":"Prise en main","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 33),
  ('12000000-0000-4000-a000-000000000074', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'software', 'Automatisation et IA pour la finance', 'automatisation-ia-finance', 'automatisation et IA finance',
   'Robots logiciels (RPA) et agents IA pour le lettrage, le rapprochement, la saisie et la clôture, sous contrôle humain.',
   '[{"key":"cas_usage","label":"Cas d''usage finance couverts","weight":25},
     {"key":"controle","label":"Fiabilité et contrôle humain","weight":25},
     {"key":"integrations","label":"Intégrations (comptabilité, ERP, banque)","weight":20},
     {"key":"securite","label":"Sécurité et confidentialité des données","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 34),
  ('12000000-0000-4000-a000-000000000075', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'provider', 'Management de transition et experts finance indépendants', 'management-transition', 'manager de transition',
   'Annuaire factuel des cabinets de management de transition, DAF à temps partagé et experts finance indépendants (sans classement en V1).',
   '[]', 0, 'draft', 35),
  ('12000000-0000-4000-a000-000000000076', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000008',
   'software', 'Logiciels de reporting ESG et carbone', 'reporting-esg', 'reporting ESG',
   'Collecte des données extra-financières, bilan carbone et indicateurs CSRD vus de la direction financière ; comparatifs détaillés sur Radar RSE.',
   '[{"key":"csrd","label":"Couverture CSRD et ESRS","weight":25},
     {"key":"carbone","label":"Bilan carbone (scopes 1 à 3)","weight":25},
     {"key":"collecte","label":"Collecte des données et circuit de validation","weight":20},
     {"key":"audit","label":"Piste d''audit pour la vérification","weight":15},
     {"key":"prix","label":"Rapport qualité-prix","weight":15}]', 0, 'draft', 36)
on conflict (site_id, slug) do nothing;

-- 3. Rattachement de chaque catégorie à son univers
with m(slug, vid) as (values
  ('facturation-electronique', '11000000-0000-4000-a000-000000000002'), ('comptabilite', '11000000-0000-4000-a000-000000000002'),
  ('consolidation', '11000000-0000-4000-a000-000000000002'), ('rapprochement-bancaire', '11000000-0000-4000-a000-000000000002'),
  ('signature-electronique', '11000000-0000-4000-a000-000000000002'), ('ged', '11000000-0000-4000-a000-000000000002'),
  ('tresorerie', '11000000-0000-4000-a000-000000000001'), ('communication-bancaire', '11000000-0000-4000-a000-000000000001'),
  ('notes-de-frais', '11000000-0000-4000-a000-000000000007'), ('cartes-entreprise', '11000000-0000-4000-a000-000000000007'),
  ('achats', '11000000-0000-4000-a000-000000000007'), ('gestion-abonnements-saas', '11000000-0000-4000-a000-000000000007'),
  ('cabinets-reduction-couts', '11000000-0000-4000-a000-000000000007'),
  ('facturation', '11000000-0000-4000-a000-000000000004'), ('recouvrement', '11000000-0000-4000-a000-000000000004'),
  ('information-solvabilite', '11000000-0000-4000-a000-000000000004'),
  ('pilotage-financier', '11000000-0000-4000-a000-000000000009'), ('reporting-bi', '11000000-0000-4000-a000-000000000009'),
  ('experts-comptables', '11000000-0000-4000-a000-000000000005'), ('management-transition', '11000000-0000-4000-a000-000000000005'),
  ('organismes-formation-finance', '11000000-0000-4000-a000-000000000005'), ('plateformes-lms', '11000000-0000-4000-a000-000000000005'),
  ('automatisation-ia-finance', '11000000-0000-4000-a000-000000000005'),
  ('cabinets-cir-cii', '11000000-0000-4000-a000-000000000006'),
  ('reporting-esg', '11000000-0000-4000-a000-000000000008')
)
update public.categories c set vertical_id = m.vid::uuid
from m
where c.site_id = '10000000-0000-4000-a000-000000000001' and c.slug = m.slug and c.vertical_id is distinct from m.vid::uuid;

-- 4. Pages à rédiger pour les nouvelles catégories (fiche + brief ; mots-clés à mesurer)
create or replace function pg_temp.plan_u(
  p_type public.content_type, p_slug text, p_title text, p_category_slug text, p_cluster text,
  p_kw text, p_secondary text[], p_outline text[], p_words int, p_cta text
) returns void language plpgsql as $$
declare
  site constant uuid := '10000000-0000-4000-a000-000000000001';
  iid uuid;
begin
  if exists (select 1 from public.content_items where site_id = site and type = p_type and slug = p_slug) then return; end if;
  insert into public.content_items (site_id, type, slug, title, category_id, cluster)
  values (site, p_type, p_slug, p_title, (select id from public.categories where site_id = site and slug = p_category_slug), p_cluster)
  returning id into iid;
  insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, outline, entities, target_words, cta)
  values (iid, p_kw, p_secondary,
          (select jsonb_agg(jsonb_build_object('level', 2, 'text', t)) from unnest(p_outline) t),
          array['volume de recherche à mesurer (Semrush) avant rédaction'], p_words, p_cta);
end;
$$;

select pg_temp.plan_u('category_ranking', 'communication-bancaire', 'Meilleurs logiciels de trésorerie groupe et communication bancaire', 'communication-bancaire', 'tresorerie',
  'logiciel tms', array['logiciel communication bancaire', 'ebics', 'trésorerie groupe'],
  array['Notre classement', 'Critères de choix', 'EBICS, SWIFT, API : comprendre la connectivité', 'Prix', 'Méthode de test'], 1000, 'Comparer les logiciels testés');
select pg_temp.plan_u('category_ranking', 'cartes-entreprise', 'Meilleures cartes d''entreprise pour gérer les dépenses', 'cartes-entreprise', 'depenses',
  'carte entreprise', array['carte de paiement entreprise', 'spend management'],
  array['Notre classement', 'Critères de choix', 'Plafonds, règles et justificatifs', 'Frais', 'Méthode de test'], 1000, 'Comparer les solutions testées');
select pg_temp.plan_u('category_ranking', 'information-solvabilite', 'Meilleurs outils d''information sur la solvabilité des entreprises', 'information-solvabilite', 'recouvrement',
  'solvabilité entreprise', array['vérifier la solvabilité d''un client', 'score de défaillance'],
  array['Notre classement', 'Critères de choix', 'Sources des données', 'Prix', 'Méthode de test'], 900, 'Comparer les outils testés');
select pg_temp.plan_u('category_ranking', 'reporting-bi', 'Meilleurs logiciels de reporting et BI financière', 'reporting-bi', 'pilotage',
  'logiciel reporting financier', array['tableau de bord financier', 'bi finance'],
  array['Notre classement', 'Critères de choix', 'Connecteurs et fiabilité des données', 'Prix', 'Méthode de test'], 1000, 'Comparer les logiciels testés');
select pg_temp.plan_u('category_ranking', 'automatisation-ia-finance', 'Automatisation et IA pour la finance : les solutions testées', 'automatisation-ia-finance', 'automatisation',
  'ia finance', array['rpa finance', 'automatisation comptable', 'agent ia comptabilité'],
  array['Notre classement', 'Cas d''usage (lettrage, rapprochement, saisie, clôture)', 'Contrôle humain et fiabilité', 'Prix', 'Méthode de test'], 1200, 'Comparer les solutions testées');
select pg_temp.plan_u('provider_directory', 'management-transition', 'Management de transition et experts finance indépendants', 'management-transition', 'equipe',
  'management de transition finance', array['daf de transition', 'daf à temps partagé', 'freelance finance'],
  array['Transition, temps partagé ou mission : que choisir', 'Les cabinets et experts référencés', 'Référencer son cabinet'], 800, 'Référencer mon cabinet');
select pg_temp.plan_u('category_ranking', 'reporting-esg', 'Meilleurs logiciels de reporting ESG et carbone pour la direction financière', 'reporting-esg', 'rse-carbone',
  'logiciel reporting esg', array['logiciel csrd', 'logiciel bilan carbone'],
  array['Notre classement', 'Ce que la CSRD demande à la finance', 'Critères de choix', 'Prix', 'Méthode de test'], 1000, 'Comparer les logiciels testés');

-- 5. Mots-clés mesurés le 08/11/2026 (Semrush FR) et rattachement aux pages planifiées
--    « logiciel tms » (1 600) est ambigu (logistique) : enregistré, non utilisé comme mot-clé principal.
insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000001', 'logiciel tms', 1600, 4.86, 25, 'commercial', 'tresorerie', 'semrush', '2026-11-08'),
  ('10000000-0000-4000-a000-000000000001', 'carte entreprise', 880, 2.27, 19, 'commercial', 'depenses', 'semrush', '2026-11-08'),
  ('10000000-0000-4000-a000-000000000001', 'management de transition finance', 590, 3.14, 11, 'commercial', 'equipe', 'semrush', '2026-11-08'),
  ('10000000-0000-4000-a000-000000000001', 'ia finance', 390, 2.48, 21, 'informational', 'automatisation', 'semrush', '2026-11-08')
on conflict (site_id, keyword) do nothing;

update public.seo_briefs b set primary_keyword = 'logiciel trésorerie groupe'
from public.content_items i
where b.content_item_id = i.id and i.site_id = '10000000-0000-4000-a000-000000000001'
  and i.type = 'category_ranking' and i.slug = 'communication-bancaire' and b.primary_keyword = 'logiciel tms';

update public.content_items i set primary_keyword_id = k.id
from public.seo_briefs b, public.keyword_targets k
where b.content_item_id = i.id and k.site_id = i.site_id and k.keyword = b.primary_keyword
  and i.site_id = '10000000-0000-4000-a000-000000000001' and i.primary_keyword_id is null
  and k.keyword in ('carte entreprise', 'management de transition finance', 'ia finance')
  and not exists (select 1 from public.content_items x where x.primary_keyword_id = k.id);
