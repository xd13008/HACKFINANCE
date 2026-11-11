-- Localisation des prestataires : publique (adresse de la société), données nominatives toujours fermées — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.providers (name, slug, profession, city, postal_code, department, latitude, longitude, offices, coverage, siren, internal_contact, status)
values ('Cabinet Test Localisation', 'cabinet-test-localisation', 'conseil-tresorerie', 'Lyon', '69003', '69', 45.76, 4.85,
        '{Paris}', 'national', '123456789', '{"email":"x@example.com"}', 'published');

set local role anon;
select is((select department from public.providers_public where slug = 'cabinet-test-localisation'), '69',
  'anon : lit le département d''un cabinet publié');
select is((select offices from public.providers_public where slug = 'cabinet-test-localisation'), '{Paris}'::text[],
  'anon : lit les autres bureaux d''un cabinet publié');
select throws_ok($$ select siren from public.providers limit 1 $$, '42501', null, 'anon : le SIREN reste fermé');
select throws_ok($$ select internal_contact from public.providers limit 1 $$, '42501', null, 'anon : les contacts restent fermés');
reset role;

select throws_ok($$ insert into public.providers (name, slug, profession, postal_code) values ('X', 'x-cp', 'conseil', '6900') $$,
  '23514', null, 'Code postal invalide refusé');

select * from finish();
rollback;
