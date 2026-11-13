-- Faits des pages ville : seules les fiches publiées comptent, aucune donnée nominative — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.categories (id, site_id, kind, name, slug, criteria, status) values
  ('12000000-0000-4000-a000-0000000000f7', '10000000-0000-4000-a000-000000000001', 'provider', 'Test faits A', 'test-faits-a', '[]', 'published'),
  ('12000000-0000-4000-a000-0000000000f8', '10000000-0000-4000-a000-000000000001', 'provider', 'Test faits B', 'test-faits-b', '[]', 'published'),
  ('12000000-0000-4000-a000-0000000000f9', '10000000-0000-4000-a000-000000000001', 'provider', 'Test faits C', 'test-faits-c', '[]', 'draft');
insert into public.providers (id, name, slug, profession, city, city_slug, postal_code, status, verification_status, siren) values
  ('13000000-0000-4000-a000-0000000000d1', 'F1', 'faits-1', 'test-faits-a', 'Testville', 'testville', '99001', 'published', 'verified', '111111111'),
  ('13000000-0000-4000-a000-0000000000d2', 'F2', 'faits-2', 'test-faits-a', 'Testville', 'testville', '99001', 'published', 'unverified', null),
  ('13000000-0000-4000-a000-0000000000d3', 'F3', 'faits-3', 'test-faits-a', 'Testville', 'testville', '99002', 'published', 'unverified', null),
  ('13000000-0000-4000-a000-0000000000d4', 'F4', 'faits-4', 'test-faits-a', 'Testville', 'testville', '99003', 'draft', 'unverified', null);
insert into public.provider_categories (provider_id, category_id) values
  ('13000000-0000-4000-a000-0000000000d1', '12000000-0000-4000-a000-0000000000f7'), ('13000000-0000-4000-a000-0000000000d2', '12000000-0000-4000-a000-0000000000f7'),
  ('13000000-0000-4000-a000-0000000000d3', '12000000-0000-4000-a000-0000000000f7'), ('13000000-0000-4000-a000-0000000000d4', '12000000-0000-4000-a000-0000000000f7'),
  ('13000000-0000-4000-a000-0000000000d1', '12000000-0000-4000-a000-0000000000f8'), ('13000000-0000-4000-a000-0000000000d3', '12000000-0000-4000-a000-0000000000f9');

set local role anon;
select is((public.provider_city_facts('12000000-0000-4000-a000-0000000000f7', 'testville')->>'total')::int, 3, 'anon : seules les fiches publiées sont comptées');
select is((public.provider_city_facts('12000000-0000-4000-a000-0000000000f7', 'testville')->>'verified')::int, 1, 'anon : fiches vérifiées comptées');
select is(public.provider_city_facts('12000000-0000-4000-a000-0000000000f7', 'testville')->'postal_codes',
  '[{"code":"99001","n":2},{"code":"99002","n":1}]'::jsonb, 'anon : codes postaux des fiches publiées (le brouillon 99003 est absent)');
select is(public.provider_city_facts('12000000-0000-4000-a000-0000000000f7', 'testville')->'other_directories',
  '[{"slug":"test-faits-b","name":"Test faits B","n":1}]'::jsonb, 'anon : seuls les autres annuaires publiés apparaissent');
select ok(public.provider_city_facts('12000000-0000-4000-a000-0000000000f7', 'testville')::text !~ '111111111', 'anon : aucun SIREN dans les faits');
reset role;

select * from finish();
rollback;
