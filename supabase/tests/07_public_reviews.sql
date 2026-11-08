-- Avis tiers cités (migration 1200) : brouillon par l'agent, validation humaine, lecture publique du seul validé
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;
create or replace function pg_temp.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Agent : brouillon uniquement --------------------------------------------------
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select lives_ok($$
  insert into public.review_sources (id, software_id, platform, url, rating, review_count, captured_at, status, author_kind, created_by)
  select '78000000-0000-4000-a000-000000000001', id, 'g2', 'https://www.g2.com/products/exemple/reviews', 4.5, 120, current_date, 'draft', 'agent', auth.uid()
  from public.software limit 1 $$, 'agent : propose un relevé de note en brouillon');
select throws_ok($$
  insert into public.review_sources (software_id, platform, url, captured_at, status, author_kind, created_by)
  select id, 'g2', 'https://www.g2.com/x', current_date, 'validated', 'agent', auth.uid() from public.software limit 1 $$,
  'P0001', null, 'agent : ne peut pas créer un relevé validé');
select lives_ok($$
  insert into public.review_quotes (id, review_source_id, quote, review_url, author_label, review_date, sentiment, status, author_kind, created_by)
  values ('78000000-0000-4000-a000-000000000002', '78000000-0000-4000-a000-000000000001',
          'La consolidation multi-entités nous fait gagner une journée par mois.', 'https://www.g2.com/products/exemple/reviews/1',
          'DAF, PME de 50 à 200 salariés', current_date - 30, 'positive', 'draft', 'agent', auth.uid()) $$,
  'agent : propose une citation en brouillon');
update public.review_quotes set status = 'validated' where id = '78000000-0000-4000-a000-000000000002';
select pg_temp.reset();
select is((select status::text from public.review_quotes where id = '78000000-0000-4000-a000-000000000002'), 'draft',
  'agent : ne peut pas valider une citation (reste en brouillon)');

-- Contraintes : citation courte, lien https -------------------------------------
select pg_temp.reset();
select throws_ok($$
  insert into public.review_quotes (review_source_id, quote, review_url, author_label, review_date, sentiment)
  values ('78000000-0000-4000-a000-000000000001', repeat('x', 301), 'https://www.g2.com/r', 'DAF, PME', current_date, 'mixed') $$,
  '23514', null, 'une citation dépasse 300 caractères : refusée (citer, pas copier)');
select throws_ok($$
  insert into public.review_sources (software_id, platform, url, captured_at)
  select id, 'g2', 'http://www.g2.com/x', current_date from public.software limit 1 $$,
  '23514', null, 'lien non https : refusé');

-- Public : rien tant que ce n'est pas validé ---------------------------------------
select pg_temp.as_anon();
select is((select count(*)::int from public.review_quotes where id = '78000000-0000-4000-a000-000000000002'), 0,
  'public : ne voit pas une citation en brouillon');

-- Commercial : aucune écriture ------------------------------------------------------
select pg_temp.reset();
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$
  insert into public.review_sources (software_id, platform, url, captured_at)
  select id, 'trustpilot', 'https://fr.trustpilot.com/review/exemple', current_date from public.software limit 1 $$,
  '42501', null, 'commercial : ne peut pas ajouter un avis');

-- Éditeur humain : valide ------------------------------------------------------------
select pg_temp.reset();
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
update public.review_sources set status = 'validated' where id = '78000000-0000-4000-a000-000000000001';
update public.review_quotes set status = 'validated' where id = '78000000-0000-4000-a000-000000000002';
select is((select validated_by from public.review_quotes where id = '78000000-0000-4000-a000-000000000002'),
  '00000000-0000-4000-a000-000000000002'::uuid, 'éditeur : la validation enregistre le valideur');

select pg_temp.reset();
select pg_temp.as_anon();
select is((select count(*)::int from public.review_quotes where id = '78000000-0000-4000-a000-000000000002'), 1,
  'public : voit la citation validée');
select is((select count(*)::int from public.review_sources where id = '78000000-0000-4000-a000-000000000001'), 1,
  'public : voit le relevé validé');

select pg_temp.reset();
select * from finish();
rollback;
