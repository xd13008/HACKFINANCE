-- Publication en masse des fiches d'un annuaire par ville ou département : éditeurs seulement — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

insert into public.categories (id, site_id, kind, name, slug, criteria, status)
values ('12000000-0000-4000-a000-0000000000fe', '10000000-0000-4000-a000-000000000001', 'provider', 'Test masse', 'test-masse', '[]', 'published');
insert into public.providers (id, name, slug, profession, city, city_slug, department, status, verification_status) values
  ('13000000-0000-4000-a000-0000000000e1', 'Brest 1', 'masse-brest-1', 'test-masse', 'Brest', 'brest', '29', 'draft', 'unverified'),
  ('13000000-0000-4000-a000-0000000000e2', 'Brest 2', 'masse-brest-2', 'test-masse', 'Brest', 'brest', '29', 'draft', 'unverified'),
  ('13000000-0000-4000-a000-0000000000e3', 'Brest rejetée', 'masse-brest-3', 'test-masse', 'Brest', 'brest', '29', 'draft', 'rejected'),
  ('13000000-0000-4000-a000-0000000000e4', 'Quimper', 'masse-quimper', 'test-masse', 'Quimper', 'quimper', '29', 'draft', 'unverified'),
  ('13000000-0000-4000-a000-0000000000e5', 'Rennes', 'masse-rennes', 'test-masse', 'Rennes', 'rennes', '35', 'draft', 'unverified');
insert into public.provider_categories (provider_id, category_id)
select id, '12000000-0000-4000-a000-0000000000fe' from public.providers where slug like 'masse-%';

-- Commercial et agent : refus
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$ select public.publish_providers('12000000-0000-4000-a000-0000000000fe', 'brest') $$, '42501', null,
  'commercial : ne peut pas publier de fiches');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select throws_ok($$ select public.publish_providers('12000000-0000-4000-a000-0000000000fe', 'brest') $$, '42501', null,
  'agent : ne peut pas publier de fiches');
reset role;

-- Anonyme : pas de droit d'exécution
set local role anon;
select throws_ok($$ select public.publish_providers('12000000-0000-4000-a000-0000000000fe', 'brest') $$, '42501', null,
  'anon : ne peut pas appeler la fonction');
reset role;
select is((select count(*)::int from public.providers where slug like 'masse-%' and status = 'published'), 0,
  'Après les refus, aucune fiche n''est publiée');

-- Éditeur
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select throws_ok($$ select public.publish_providers('12000000-0000-4000-a000-0000000000fe') $$, '22023', null,
  'éditeur : une ville ou un département est obligatoire');
select is(public.publish_providers('12000000-0000-4000-a000-0000000000fe', 'brest'), 2,
  'éditeur : publie les 2 fiches de Brest, jamais la fiche rejetée');
select is(public.publish_providers('12000000-0000-4000-a000-0000000000fe', null, '29'), 1,
  'éditeur : publie par département (Quimper restait)');
reset role;
select is((select array_agg(slug order by slug) from public.providers where slug like 'masse-%' and status = 'published'),
  array['masse-brest-1', 'masse-brest-2', 'masse-quimper'], 'Rennes et la fiche rejetée restent en brouillon, non vérifiées');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select is(public.publish_providers('12000000-0000-4000-a000-0000000000fe', 'brest', null, false), 2,
  'éditeur : peut retirer les fiches d''une ville');
reset role;

select * from finish();
rollback;
