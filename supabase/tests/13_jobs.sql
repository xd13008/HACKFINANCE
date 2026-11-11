-- Jobs : publication par un éditeur seulement, annonce payée, lecture publique limitée — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.affected(q text) returns int language plpgsql as $f$
declare n int;
begin
  execute format('with u as (%s returning 1) select count(*) from u', q) into n;
  return n;
end;
$f$;
grant execute on function pg_temp.affected(text) to authenticated;

insert into public.job_products (code, label, amount_cents, duration_days) values ('test-30', 'Test', 1000, 30) on conflict do nothing;
insert into public.members (id, site_id, email, status, consent_text, consent_at)
values ('15000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'recruteur@exemple.test', 'active', 't', now());
insert into public.job_offers (id, site_id, source, external_id, slug, title, family, contract, description, status, expires_at, posted_by_member) values
  ('15000000-0000-4000-a000-0000000000a1', '10000000-0000-4000-a000-000000000001', 'france_travail', 'T1', 'test-publiee', 'Comptable H/F', 'comptabilite', 'cdi', repeat('x', 60), 'published', now() + interval '3 days', null),
  ('15000000-0000-4000-a000-0000000000a2', '10000000-0000-4000-a000-000000000001', 'france_travail', 'T2', 'test-attente', 'Auditeur H/F', 'audit', 'cdi', repeat('x', 60), 'pending_review', now() + interval '3 days', null),
  ('15000000-0000-4000-a000-0000000000a3', '10000000-0000-4000-a000-000000000001', 'france_travail', 'T3', 'test-perimee', 'Trésorier H/F', 'tresorerie', 'cdi', repeat('x', 60), 'published', now() - interval '1 day', null),
  ('15000000-0000-4000-a000-0000000000a4', '10000000-0000-4000-a000-000000000001', 'member', null, 'test-membre', 'DAF H/F', 'direction-financiere', 'cdi', repeat('x', 60), 'pending_review', null, '15000000-0000-4000-a000-000000000001');

-- Anonyme
set local role anon;
select is((select array_agg(slug order by slug) from public.job_offers where slug like 'test-%'), array['test-publiee'],
  'anon : seules les offres publiées et non expirées sont visibles');
select throws_ok($$ select posted_by_member from public.job_offers $$, '42501', null, 'anon : ne voit pas l''auteur d''une annonce');
select throws_ok($$ select * from public.job_orders $$, '42501', null, 'anon : ne voit pas les commandes');
select throws_ok($$ select public.approve_imported_jobs('10000000-0000-4000-a000-000000000001') $$, '42501', null, 'anon : ne publie pas');
reset role;

-- Serveur (clé de service) : ne publie jamais seul
set local role service_role;
select throws_ok($$ update public.job_offers set status = 'published' where slug = 'test-attente' $$, '42501', null,
  'serveur : ne peut pas publier une offre sans relecture humaine');
reset role;

-- Commercial : aucune modification
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select is(pg_temp.affected($$ update public.job_offers set title = 'X H/F' where slug = 'test-publiee' $$), 0,
  'commercial : ne modifie aucune offre');
select throws_ok($$ select public.approve_imported_jobs('10000000-0000-4000-a000-000000000001') $$, '42501', null, 'commercial : ne publie pas');
reset role;

-- Éditeur
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select throws_ok($$ update public.job_offers set status = 'published' where slug = 'test-membre' $$, 'P0001', null,
  'éditeur : une annonce non payée ne peut pas être publiée');
reset role;
insert into public.job_orders (job_id, member_id, product_code, amount_cents, status, paid_at)
values ('15000000-0000-4000-a000-0000000000a4', '15000000-0000-4000-a000-000000000001', 'test-30', 1000, 'paid', now());
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select lives_ok($$ update public.job_offers set status = 'published' where slug = 'test-membre' $$, 'éditeur : publie une annonce payée');
select ok((select expires_at between now() + interval '29 days' and now() + interval '31 days' from public.job_offers where slug = 'test-membre'),
  'L''annonce payée expire après la durée achetée');
select is((select reviewed_by from public.job_offers where slug = 'test-membre'), '00000000-0000-4000-a000-000000000002'::uuid,
  'Le relecteur est enregistré');
select is(public.approve_imported_jobs('10000000-0000-4000-a000-000000000001', 'audit'), 1, 'éditeur : publie en masse les offres importées');
select is((select count(*)::int from public.job_orders), 0, 'éditeur : ne voit pas les commandes (admin seulement)');
reset role;

-- Import : réservé au serveur ; une offre expirée qui revient repasse en relecture
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select throws_ok($$ select public.upsert_imported_jobs('10000000-0000-4000-a000-000000000001', '[]') $$, '42501', null,
  'éditeur : n''appelle pas la fonction d''import');
reset role;
update public.job_offers set status = 'expired' where slug = 'test-perimee';
set local role service_role;
select public.upsert_imported_jobs('10000000-0000-4000-a000-000000000001',
  '[{"external_id":"T3","slug":"test-perimee","title":"Trésorier H/F","family":"tresorerie","contract":"cdi","description":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}]');
reset role;
select is((select status from public.job_offers where slug = 'test-perimee'), 'pending_review', 'Une offre expirée réimportée repasse en relecture');
select is((select status from public.job_offers where slug = 'test-publiee'), 'published', 'Une offre publiée n''est pas modifiée par l''import d''une autre');

select * from finish();
rollback;
