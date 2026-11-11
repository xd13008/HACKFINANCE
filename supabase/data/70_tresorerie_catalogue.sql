-- 70 · Première catégorie complète : logiciels de gestion de trésorerie (Radar Finances)
-- Données de PRODUCTION, idempotentes. Tout est inséré en BROUILLON :
--   logiciels (software.status = 'draft'), faits et prix (status = 'draft'), pages planifiées avec brief SEO.
-- Rien n'est publié : un éditeur vérifie chaque fait sur sa source, valide, puis publie (règles 1, 4 et 6).
-- Aucune note : les notes viennent uniquement des tests réels (protocole docs/tests/PROTOCOLE-TRESORERIE.md).
-- Relevé sur les sites officiels le 11 novembre 2026.

-- 1. Logiciels (brouillons) ------------------------------------------------------------------------------
insert into public.software (id, vendor, name, slug, website, tagline, hq_country, status) values
  ('21000000-0000-4000-a000-000000000101', 'Agicap', 'Agicap', 'agicap', 'https://agicap.com/fr/',
   'Gestion et prévisions de trésorerie pour PME et ETI, multi-banques et multi-entités.', 'FR', 'draft'),
  ('21000000-0000-4000-a000-000000000102', 'Okimia', 'Okimia (ex-Fygr)', 'okimia', 'https://www.okimia.com/',
   'Prévisions de trésorerie pour TPE et PME, anciennement Fygr.', 'FR', 'draft'),
  ('21000000-0000-4000-a000-000000000103', 'Pennylane', 'Pennylane', 'pennylane', 'https://www.pennylane.com/fr',
   'Gestion financière et comptabilité, avec prévisionnel de trésorerie.', 'FR', 'draft'),
  ('21000000-0000-4000-a000-000000000104', 'Cegid', 'Cegid Exabanque', 'cegid-exabanque', 'https://www.cegid.com/fr/produits/cegid-exabanque/',
   'Communication multi-bancaire et trésorerie pour PME, en EBICS ou FTPS.', 'FR', 'draft'),
  ('21000000-0000-4000-a000-000000000105', 'Kyriba', 'Kyriba', 'kyriba', 'https://www.kyriba.com/fr/',
   'Trésorerie, connectivité bancaire et paiements pour ETI et grands groupes.', 'FR', 'draft')
on conflict (slug) do nothing;

-- 2. Rattachement aux catégories (trésorerie ; communication bancaire ; comptabilité) -----------------------
insert into public.software_categories (software_id, category_id, is_primary)
select s.id, c.id, x.is_primary
from (values
  ('agicap', 'tresorerie', true), ('okimia', 'tresorerie', true),
  ('pennylane', 'comptabilite', true), ('pennylane', 'tresorerie', false),
  ('cegid-exabanque', 'communication-bancaire', true), ('cegid-exabanque', 'tresorerie', false),
  ('kyriba', 'communication-bancaire', true)
) as x(sw, cat, is_primary)
join public.software s on s.slug = x.sw
join public.categories c on c.slug = x.cat and c.site_id = '10000000-0000-4000-a000-000000000001'
on conflict do nothing;

-- 3. Faits sourcés (brouillons, à vérifier puis valider) ----------------------------------------------------
-- Codes normalisés, communs à l'assistant (charte §6) : tailles tpe / pme / eti.
insert into public.software_facts (software_id, fact_type, value, source_url, collected_at, status, author_kind, note)
select s.id, x.fact_type, x.value::jsonb, x.source_url, timestamptz '2026-11-11 10:00+01', 'draft', 'agent',
       'Relevé assisté le 11/11/2026. Citation : ' || x.quote || '. Vérifier sur la source avant validation.'
from (values
  ('agicap', 'multi_entity', 'true', 'https://agicap.com/fr/tarifs/', '« Pilotage multi-banques et multi-entités. »'),
  ('agicap', 'target_sizes', '["pme","eti"]', 'https://agicap.com/fr/tarifs/', 'menu « Tailles d''entreprise » : PME, ETI'),
  ('agicap', 'free_trial', 'true', 'https://agicap.com/fr/', 'bouton « Essayer gratuitement »'),
  ('okimia', 'multi_entity', 'true', 'https://www.okimia.com/tarifs', 'offre Entreprise : « consolidation multi-entités et multi-sociétés »'),
  ('okimia', 'bank_connections', '1800', 'https://www.okimia.com/tarifs', '« Plus de 1800 banques »'),
  ('okimia', 'target_sizes', '["tpe","pme"]', 'https://www.okimia.com/tarifs', '« Pour les TPE et start-ups », « Pour les PME »'),
  ('okimia', 'free_plan', 'false', 'https://www.okimia.com/tarifs', 'aucune offre gratuite ; essai de 7 jours'),
  ('okimia', 'free_trial', 'true', 'https://www.okimia.com/tarifs', '« Les 7 premiers jours sont gratuits. »'),
  ('okimia', 'no_commitment', 'true', 'https://www.okimia.com/tarifs', 'FAQ : sans engagement, « Oui »'),
  ('pennylane', 'free_trial', 'true', 'https://www.pennylane.com/fr/tarifs', '« Profitez de 15 jours d''essai gratuit »'),
  ('pennylane', 'no_commitment', 'true', 'https://www.pennylane.com/fr/tarifs', '« l''abonnement Pennylane est sans engagement »'),
  ('cegid-exabanque', 'bank_protocols', '["EBICS","FTPS"]', 'https://www.cegid.com/fr/produits/cegid-exabanque/', '« Échanges de fichiers avec les protocoles EBICS ou FTPs »'),
  ('cegid-exabanque', 'accounts_included', '3', 'https://www.cegid.com/fr/produits/cegid-exabanque/', '« 3 comptes bancaires inclus »'),
  ('cegid-exabanque', 'free_trial', 'true', 'https://www.cegid.com/fr/produits/cegid-exabanque/', '« Essai gratuit »'),
  ('kyriba', 'bank_connections', '10000', 'https://www.kyriba.com/fr/', '« Connectez-vous à plus de 10 000 banques »'),
  ('kyriba', 'target_sizes', '["eti"]', 'https://www.kyriba.com/fr/', 'ETI et grandes entreprises citées')
) as x(sw, fact_type, value, source_url, quote)
join public.software s on s.slug = x.sw
where not exists (select 1 from public.software_facts f where f.software_id = s.id and f.fact_type = x.fact_type);

-- 4. Offres et prix publics (brouillons) ------------------------------------------------------------------
-- per_unit « jusqu'à 1 entité » : lu par le calcul du coût (src/lib/decision.ts) pour exclure l'offre au-delà d'une société.
insert into public.pricing_plans (software_id, plan_name, price_eur, billing_period, per_unit, conditions, source_url, source_date, status, sort)
select s.id, x.plan, x.price, x.period, x.per_unit, x.conditions, x.source_url, date '2026-11-11', 'draft', x.sort
from (values
  ('okimia', 'Starter', 69::numeric, 'month', 'jusqu''à 1 entité', '2 banques incluses ; CA jusqu''à 2 M€ ; 1 intégration API ; sans engagement ; -30 % en annuel', 'https://www.okimia.com/tarifs', 1),
  ('okimia', 'Pro', 104, 'month', 'jusqu''à 1 entité', '4 banques incluses ; CA jusqu''à 5 M€ ; jusqu''à 3 intégrations ; sans engagement ; -30 % en annuel', 'https://www.okimia.com/tarifs', 2),
  ('okimia', 'Entreprise', null, 'quote', null, 'Multi-entités et multi-sociétés ; banques et intégrations illimitées', 'https://www.okimia.com/tarifs', 3),
  ('agicap', 'Gestion et prévisions de trésorerie', null, 'quote', null, '« Des tarifs sur-mesure adaptés à toutes les entreprises » ; connectivité incluse', 'https://agicap.com/fr/tarifs/', 1),
  ('pennylane', 'Starter', 7, 'month', 'par utilisateur', 'Synchronisation des comptes et rapprochement des transactions ; sans prévisionnel', 'https://www.pennylane.com/fr/tarifs', 1),
  ('pennylane', 'Basique', 14, 'month', 'par utilisateur', 'Sans prévisionnel de trésorerie', 'https://www.pennylane.com/fr/tarifs', 2),
  ('pennylane', 'Essentiel', 24, 'month', 'par utilisateur', 'Inclut le « Prévisionnel de trésorerie »', 'https://www.pennylane.com/fr/tarifs', 3),
  ('pennylane', 'Premium', 79, 'month', 'par utilisateur', 'Avec module comptable', 'https://www.pennylane.com/fr/tarifs', 4),
  ('cegid-exabanque', 'Pack Starter', null, 'quote', null, 'Prix non affiché sur la page produit', 'https://www.cegid.com/fr/produits/cegid-exabanque/', 1),
  ('cegid-exabanque', 'Pack Trésorerie', null, 'quote', null, 'Prix non affiché sur la page produit', 'https://www.cegid.com/fr/produits/cegid-exabanque/', 2)
) as x(sw, plan, price, period, per_unit, conditions, source_url, sort)
join public.software s on s.slug = x.sw
where not exists (select 1 from public.pricing_plans p where p.software_id = s.id and p.plan_name = x.plan);

-- 5. Intégrations citées sur les pages officielles ----------------------------------------------------------
-- Visibles seulement quand le logiciel est publié (statut du logiciel, validé par un éditeur).
insert into public.integrations (software_id, name, kind, source_url)
select s.id, x.name, x.kind, x.source_url
from (values
  ('agicap', 'Sage', 'connector', 'https://agicap.com/fr/tarifs/'), ('agicap', 'SAP', 'connector', 'https://agicap.com/fr/tarifs/'),
  ('agicap', 'Oracle', 'connector', 'https://agicap.com/fr/tarifs/'), ('agicap', 'Microsoft', 'connector', 'https://agicap.com/fr/tarifs/'),
  ('agicap', 'API publique', 'api', 'https://agicap.com/fr/tarifs/'),
  ('cegid-exabanque', 'ERP Link', 'connector', 'https://www.cegid.com/fr/produits/cegid-exabanque/')
) as x(sw, name, kind, source_url)
join public.software s on s.slug = x.sw
where not exists (select 1 from public.integrations i where i.software_id = s.id and i.name = x.name);

-- 6. Pages de la catégorie, planifiées avec leur brief (charte : docs/CHARTE-REDACTION-TESTS.md) -------------
create or replace function pg_temp.plan_page(
  p_type public.content_type, p_slug text, p_title text, p_sw text, p_sw_b text, p_kw text,
  p_secondary text[], p_questions text[], p_outline text[], p_words int, p_cta text, p_required text[]
) returns void language plpgsql as $$
declare
  site constant uuid := '10000000-0000-4000-a000-000000000001';
  cat uuid; iid uuid; kid uuid;
begin
  select id into cat from public.categories where site_id = site and slug = 'tresorerie';
  if cat is null or exists (select 1 from public.content_items where site_id = site and type = p_type and slug = p_slug) then return; end if;
  select k.id into kid from public.keyword_targets k
  where k.site_id = site and k.keyword = p_kw and k.target_content_id is null
    and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
  insert into public.content_items (site_id, type, slug, title, category_id, cluster, primary_keyword_id, software_id, software_b_id)
  values (site, p_type, p_slug, p_title, cat, 'tresorerie', kid,
          (select id from public.software where slug = p_sw), (select id from public.software where slug = p_sw_b))
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
end;
$$;

select pg_temp.plan_page('category_ranking', 'tresorerie', 'Logiciel de gestion de trésorerie : le comparatif des solutions testées', null, null,
  'logiciel de gestion de trésorerie',
  '{logiciel de trésorerie,logiciel trésorerie,logiciel gestion de trésorerie,gestion de trésorerie logiciel}',
  '{quel est le meilleur logiciel de trésorerie,combien coûte un logiciel de trésorerie,quel logiciel de trésorerie pour une PME multi-sociétés}',
  '{Notre verdict en 30 secondes,Le classement des logiciels testés,Quel logiciel pour quel profil,Combien coûte un logiciel de trésorerie,Les matchs les plus demandés,Notre méthode de test}',
  1500, 'Trouver le logiciel adapté à mon entreprise', '{/methode}');
select pg_temp.plan_page('software_review', 'agicap', 'Avis Agicap : notre test complet', 'agicap', null,
  'agicap avis', '{agicap prix,agicap tarif,agicap multi-entités}',
  '{agicap est-il adapté à une PME,combien coûte agicap,agicap gère-t-il plusieurs sociétés}',
  '{Notre verdict,Notre avis en résumé,Fonctionnalités,Connexions bancaires,Prévision et scénarios,Prise en main,Rapport qualité-prix,Prix décortiqués,Matchs et alternatives,Méthode et sources}',
  1800, 'Comparer Agicap à ses alternatives', '{/methode,/guides/plan-de-tresorerie}');
select pg_temp.plan_page('software_review', 'okimia', 'Avis Okimia (ex-Fygr) : notre test complet', 'okimia', null,
  'okimia avis', '{fygr avis,okimia prix,fygr okimia}',
  '{fygr est-il devenu okimia,combien coûte okimia,okimia gère-t-il plusieurs sociétés}',
  '{Notre verdict,Notre avis en résumé,Fonctionnalités,Connexions bancaires,Prévision et scénarios,Prise en main,Rapport qualité-prix,Prix décortiqués,Matchs et alternatives,Méthode et sources}',
  1800, 'Comparer Okimia à ses alternatives', '{/methode,/guides/plan-de-tresorerie}');
select pg_temp.plan_page('software_review', 'cegid-exabanque', 'Avis Cegid Exabanque : notre test complet', 'cegid-exabanque', null,
  'cegid exabanque avis', '{exabanque,exabanque ebics}',
  '{exabanque fonctionne-t-il en ebics,combien coûte cegid exabanque}',
  '{Notre verdict,Notre avis en résumé,Fonctionnalités,Connexions bancaires,Prévision et scénarios,Prise en main,Rapport qualité-prix,Prix décortiqués,Matchs et alternatives,Méthode et sources}',
  1800, 'Comparer Exabanque à ses alternatives', '{/methode,/guides/plan-de-tresorerie}');
select pg_temp.plan_page('pricing', 'agicap', 'Prix Agicap : combien coûte le logiciel ?', 'agicap', null,
  'agicap prix', '{agicap tarif,agicap tarifs}', '{combien coûte agicap par mois,agicap propose-t-il un essai gratuit}',
  '{Ce que coûte Agicap,Ce qui fait varier le prix,Comparaison avec les alternatives}', 800, 'Comparer les prix des logiciels de trésorerie', '{/methode}');
select pg_temp.plan_page('alternatives', 'agicap', 'Alternatives à Agicap : les solutions testées', 'agicap', null,
  'alternative agicap', '{agicap alternative,concurrent agicap}', '{quelle alternative à agicap pour une TPE,quelle alternative moins chère à agicap}',
  '{Pourquoi les équipes quittent Agicap,Le tableau des alternatives,Choisir selon votre raison de partir,Les alternatives une par une}',
  1200, 'Comparer les alternatives', '{/methode}');
select pg_temp.plan_page('duel', 'agicap-vs-okimia', 'Agicap ou Okimia (ex-Fygr) : lequel choisir ?', 'agicap', 'okimia',
  'agicap vs fygr', '{agicap ou fygr,agicap vs okimia}', '{agicap ou fygr pour une pme}',
  '{Qui gagne pour quel profil,Le match critère par critère,Prix pour 1 3 et 5 sociétés,Les différences qui comptent}', 900, 'Voir le match détaillé', '{/methode}');
select pg_temp.plan_page('duel', 'agicap-vs-cegid-exabanque', 'Agicap ou Cegid Exabanque : lequel choisir ?', 'agicap', 'cegid-exabanque',
  'agicap vs exabanque', '{agicap ou exabanque}', '{agicap ou exabanque pour une pme multi-banques}',
  '{Qui gagne pour quel profil,Le match critère par critère,Prix,Les différences qui comptent}', 900, 'Voir le match détaillé', '{/methode}');

-- 7. Notes publiques G2 et GetApp (avis tiers, brouillons) -------------------------------------------------
-- Relevées le 11/11/2026 via les pages indexées par les moteurs de recherche (G2 et GetApp bloquent la lecture automatique).
-- L'éditeur ouvre chaque page, corrige la note et le nombre d'avis si besoin, puis valide (guard_review_validation).
-- Nombre d'avis laissé vide quand les relevés divergeaient. Jamais intégrées à la note éditoriale ni en AggregateRating.
insert into public.review_sources (software_id, platform, url, rating, rating_scale, review_count, captured_at, status, author_kind)
select s.id, x.platform, x.url, x.rating, 5, x.review_count, date '2026-11-11', 'draft', 'agent'
from (values
  ('agicap', 'getapp', 'https://www.getapp.com/finance-accounting-software/a/agicap/', 4.3::numeric, 161),
  ('agicap', 'g2', 'https://www.g2.com/products/agicap/reviews', 4.4, null::int),
  ('okimia', 'getapp', 'https://www.getapp.com/finance-accounting-software/a/fygr/', 4.8, 5),
  ('kyriba', 'g2', 'https://www.g2.com/compare/agicap-vs-kyriba', 4.5, null),
  ('kyriba', 'getapp', 'https://www.getapp.com/finance-accounting-software/a/the-treasury-cloud/', 4.3, null)
) as x(sw, platform, url, rating, review_count)
join public.software s on s.slug = x.sw
where not exists (select 1 from public.review_sources r where r.software_id = s.id and r.platform = x.platform);
