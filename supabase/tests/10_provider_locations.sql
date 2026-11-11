-- Pages locales des annuaires : seules les fiches publiées sont comptées et listées — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.categories (id, site_id, kind, name, slug, criteria, status)
values ('12000000-0000-4000-a000-0000000000ff', '10000000-0000-4000-a000-000000000001', 'provider', 'Test local', 'test-local', '[]', 'published');
insert into public.providers (id, name, slug, profession, city, city_slug, department, status) values
  ('13000000-0000-4000-a000-0000000000f1', 'Pub Lyon 1', 'pub-lyon-1', 'test-local', 'Lyon', 'lyon', '69', 'published'),
  ('13000000-0000-4000-a000-0000000000f2', 'Pub Lyon 2', 'pub-lyon-2', 'test-local', 'Lyon', 'lyon', '69', 'published'),
  ('13000000-0000-4000-a000-0000000000f3', 'Brouillon Lyon', 'brouillon-lyon', 'test-local', 'Lyon', 'lyon', '69', 'draft'),
  ('13000000-0000-4000-a000-0000000000f4', 'Brouillon Nantes', 'brouillon-nantes', 'test-local', 'Nantes', 'nantes', '44', 'draft');
insert into public.provider_categories (provider_id, category_id)
select id, '12000000-0000-4000-a000-0000000000ff' from public.providers where slug in ('pub-lyon-1', 'pub-lyon-2', 'brouillon-lyon', 'brouillon-nantes');

set local role anon;
select is((select providers from public.provider_locations('12000000-0000-4000-a000-0000000000ff') where city_slug = 'lyon'), 2,
  'anon : seules les fiches publiées sont comptées par ville');
select is((select count(*)::int from public.provider_locations('12000000-0000-4000-a000-0000000000ff') where city_slug = 'nantes'), 0,
  'anon : une ville sans fiche publiée n''apparaît pas');
select is((select count(*)::int from public.provider_categories pc join public.providers p on p.id = pc.provider_id
           where pc.category_id = '12000000-0000-4000-a000-0000000000ff'), 2,
  'anon : la liste d''un annuaire ne contient que les fiches publiées');
select throws_ok($$ select siren from public.providers limit 1 $$, '42501', null, 'anon : le SIREN reste fermé');
select is((select count(*)::int from public.providers_by_category where category_id = '12000000-0000-4000-a000-0000000000ff' and city_slug = 'lyon'), 2,
  'anon : la vue par métier ne liste que les fiches publiées');
select hasnt_column('public', 'providers_by_category', 'siren', 'La vue par métier n''expose pas le SIREN');
reset role;

select * from finish();
rollback;
