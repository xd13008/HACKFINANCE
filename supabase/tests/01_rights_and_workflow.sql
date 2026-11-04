-- Tests des droits et de la file de validation (pgTAP) — `pnpm test:db`
-- S'appuient sur le jeu de démonstration (supabase/seeds).
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Bascule d'identité ----------------------------------------------------------
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
-- Nombre de lignes réellement modifiées (0 = bloqué silencieusement par la RLS)
create or replace function pg_temp.affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute format('with u as (%s returning 1) select count(*) from u', q) into n;
  return n;
end;
$$;
grant execute on function pg_temp.affected(text) to anon, authenticated;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;
create or replace function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Identifiants du jeu de démo
create temp table ids as select
  '00000000-0000-4000-a000-000000000001'::uuid as admin,
  '00000000-0000-4000-a000-000000000002'::uuid as editor,
  '00000000-0000-4000-a000-000000000003'::uuid as sales,
  '00000000-0000-4000-a000-000000000004'::uuid as agent,
  '20000000-0000-4000-a000-000000000002'::uuid as cashpilot,
  '30000000-0000-4000-a000-000000000001'::uuid as test_tresoflux,
  (select id from public.content_items where type = 'software_review' and slug = 'cashpilot') as item_cashpilot,
  (select id from public.content_versions where status = 'submitted' limit 1) as pending_version,
  (select id from public.scores where test_run_id = '30000000-0000-4000-a000-000000000001' and criterion_key = 'prix') as score_prix;
grant select on ids to anon, authenticated;

-- =============================================================================
-- 1. Visiteur anonyme
-- =============================================================================
select pg_temp.as_anon();

select ok((select count(*) from public.published_content) >= 30, 'anon : lit les contenus publiés');
select is((select count(*)::int from public.content_versions where status = 'submitted'), 0,
  'anon : ne voit pas les versions en attente');
select is((select count(*)::int from public.listing_requests), 0, 'anon : ne lit pas les demandes de référencement');
select is((select count(*)::int from public.analytics_events), 0, 'anon : ne lit pas les événements analytics');
select throws_ok($$ select internal_contact from public.providers limit 1 $$, '42501', null,
  'anon : n''accède pas aux contacts nominatifs des prestataires');
select lives_ok($$
  insert into public.listing_requests (site_id, kind, company_name, website, contact_name, contact_email, consent_at, consent_text)
  values ('10000000-0000-4000-a000-000000000001', 'software', 'Test SAS', 'https://example.com', 'X', 'x@example.com', now(), 'ok')
$$, 'anon : peut déposer une demande de référencement');
select throws_ok($$
  insert into public.listing_requests (site_id, kind, company_name, website, contact_name, contact_email, consent_at, consent_text, status)
  values ('10000000-0000-4000-a000-000000000001', 'software', 'Test SAS', 'https://example.com', 'X', 'x@example.com', now(), 'ok', 'accepted')
$$, '42501', null, 'anon : ne peut pas déposer une demande déjà acceptée');
select lives_ok($$
  insert into public.placement_requests (site_id, advertiser_name, contact_name, contact_email, consent_at, consent_text)
  values ('10000000-0000-4000-a000-000000000001', 'Annonceur', 'Y', 'y@example.com', now(), 'ok')
$$, 'anon : peut déposer une demande de publicité');
select lives_ok($$
  select public.record_event('daf', md5('test-session'), 'pageview', '/', 'home', null)
$$, 'anon : peut envoyer un événement via record_event()');
select throws_ok($$ select public.approve_version((select pending_version from ids)) $$, '42501', null,
  'anon : ne peut pas appeler approve_version()');

-- =============================================================================
-- 2. Agent : brouillons uniquement
-- =============================================================================
select pg_temp.as_postgres();
select pg_temp.as_user((select agent from ids));

select lives_ok($$
  insert into public.software_facts (software_id, fact_type, value, source_url, status, author_kind, created_by)
  values ((select cashpilot from ids), 'min_price_eur', '21', 'https://example.com/x', 'draft', 'agent', auth.uid())
$$, 'agent : peut créer un fait en brouillon');
select throws_ok($$
  insert into public.software_facts (software_id, fact_type, value, source_url, status, author_kind, created_by)
  values ((select cashpilot from ids), 'min_price_eur', '21', 'https://example.com/x', 'validated', 'agent', auth.uid())
$$, null, null, 'agent : ne peut pas créer un fait validé');
select lives_ok($$
  insert into public.content_versions (content_item_id, version_no, h1, author_id, author_kind)
  values ((select item_cashpilot from ids), 0, 'Brouillon agent', auth.uid(), 'agent')
$$, 'agent : peut créer une version en brouillon');
select throws_ok($$
  insert into public.content_versions (content_item_id, version_no, h1, author_id, author_kind, status)
  values ((select item_cashpilot from ids), 0, 'Version agent approuvée', auth.uid(), 'agent', 'approved')
$$, null, null, 'agent : ne peut pas créer une version approuvée');
select throws_ok($$ select public.approve_version((select pending_version from ids)) $$, 'P0001',
  'Seul un éditeur humain peut approuver une publication', 'agent : ne peut pas publier');
select is(pg_temp.affected('update public.scores set score = 10 where id = (select score_prix from ids)'), 0, 'agent : ne peut pas modifier une note');
select is(pg_temp.affected('update public.content_items set title = ''piraté'' where id = (select item_cashpilot from ids)'), 0, 'agent : ne peut pas modifier un contenu publié');

-- =============================================================================
-- 3. Commercial : visibilité signalée, jamais l'éditorial
-- =============================================================================
select pg_temp.as_postgres();
select pg_temp.as_user((select sales from ids));

select is(pg_temp.affected('update public.scores set score = 10 where id = (select score_prix from ids)'), 0, 'commercial : ne peut pas modifier une note');
select is(pg_temp.affected('update public.test_runs set verdict = ''Le meilleur !'' where id = (select test_tresoflux from ids)'), 0, 'commercial : ne peut pas modifier un verdict');
select is(pg_temp.affected('update public.categories set criteria = ''[{"key":"prix","label":"Prix","weight":100}]'''), 0, 'commercial : ne peut pas modifier la grille de critères');
select throws_ok($$
  insert into public.content_versions (content_item_id, version_no, h1, author_id)
  values ((select item_cashpilot from ids), 0, 'Version commerciale', auth.uid())
$$, '42501', null, 'commercial : ne peut pas rédiger de contenu');
select throws_ok($$ select public.approve_version((select pending_version from ids)) $$, 'P0001', null,
  'commercial : ne peut pas publier');
select lives_ok($$
  update public.placement_requests set status = 'qualified' where advertiser_name = 'Éditeur fictif D'
$$, 'commercial : gère le pipeline des demandes de publicité');
select lives_ok($$
  insert into public.sponsored_placements (inventory_id, software_id, starts_on, ends_on)
  values ('50000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', current_date, current_date + 30)
$$, 'commercial : peut créer un emplacement sponsorisé');
select throws_ok($$
  insert into public.sponsored_placements (inventory_id, software_id, starts_on, ends_on)
  values ('50000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', current_date, current_date + 10)
$$, '23P01', null, 'commercial : pas de double réservation d''un même emplacement');

-- Le classement éditorial est indépendant des emplacements sponsorisés
select is((select editorial_rank::int from public.editorial_rankings where software_id = (select cashpilot from ids)), 3,
  'Cashpilot sponsorisé reste 3e du classement éditorial');

-- =============================================================================
-- 4. Éditeur : publie, mais uniquement via la file de validation
-- =============================================================================
select pg_temp.as_postgres();
select pg_temp.as_user((select editor from ids));

select throws_ok($$ update public.content_items set status = 'draft' where id = (select item_cashpilot from ids) $$,
  'P0001', 'Statut de publication modifiable uniquement via la file de validation',
  'éditeur : ne peut pas changer un statut de publication directement');
select is(pg_temp.affected('update public.content_versions set status = ''approved'' where id = (select pending_version from ids)'), 0,
  'éditeur : ne peut pas approuver une version par UPDATE');
select is(pg_temp.affected('update public.scores set status = ''published'' where status = ''draft'''), 0, 'éditeur : ne peut pas publier une note hors validate_test_run()');
select is(pg_temp.affected('update public.test_runs set verdict = ''modifié après validation'' where id = (select test_tresoflux from ids)'), 0,
  'éditeur : un test validé est figé');

-- Checklist SEO bloquante
select lives_ok($$
  insert into public.content_items (id, site_id, type, slug, title, created_by)
  values ('99000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'guide', 'guide-test', 'Guide test', auth.uid());
  insert into public.content_versions (id, content_item_id, version_no, meta_title, h1, body, author_id)
  values ('99000000-0000-4000-a000-000000000002', '99000000-0000-4000-a000-000000000001', 0, 'Court', 'Titre', 'Corps', auth.uid());
$$, 'éditeur : crée un brouillon');
select throws_ok($$ select public.submit_version('99000000-0000-4000-a000-000000000002') $$,
  'P0001', null, 'éditeur : soumission refusée si la checklist SEO échoue');
select is((select (public.seo_check('99000000-0000-4000-a000-000000000002') ->> 'passed')::boolean), false,
  'seo_check() signale les erreurs bloquantes');
select throws_ok($$ select public.approve_version('99000000-0000-4000-a000-000000000002') $$,
  'P0001', null, 'éditeur : impossible d''approuver un brouillon non soumis');

-- Test sans preuve → validation impossible
select lives_ok($$
  insert into public.test_runs (id, software_id, category_id, tester_id, tested_at, protocol, status)
  values ('99000000-0000-4000-a000-000000000003', (select cashpilot from ids), '12000000-0000-4000-a000-000000000001',
          auth.uid(), current_date, 'Test sans preuve', 'completed')
$$, 'éditeur : crée un test');
select throws_ok($$ select public.validate_test_run('99000000-0000-4000-a000-000000000003') $$,
  'P0001', 'Impossible de valider un test sans preuve', 'un test sans preuve ne peut pas être validé');

-- =============================================================================
-- 5. Conformité : un blocage empêche la publication
-- =============================================================================
-- (l'éditeur de démo cumule le rôle conformité)
select lives_ok($$ select public.block_item((select item_cashpilot from ids), 'Revue juridique en cours') $$,
  'conformité : bloque une publication');
select throws_ok($$ select public.approve_version((select pending_version from ids)) $$,
  'P0001', null, 'un contenu bloqué ne peut pas être approuvé');
select lives_ok($$ select public.unblock_item((select item_cashpilot from ids)) $$, 'conformité : débloque');
select lives_ok($$ select public.approve_version((select pending_version from ids), 'Prix confirmé') $$,
  'éditeur : approuve la version soumise');
select is((select published_version_id from public.content_items where id = (select item_cashpilot from ids)),
  (select pending_version from ids), 'la version approuvée est celle publiée');

-- =============================================================================
-- 6. Administrateur : ne publie pas sans validation éditoriale
-- =============================================================================
select pg_temp.as_postgres();
select pg_temp.as_user((select admin from ids));
select throws_ok($$ select public.reject_version((select pending_version from ids), 'non') $$,
  'P0001', null, 'administrateur : ne peut pas décider d''une publication');

select * from finish();
rollback;
