-- Chaque univers de Radar Finances propose des logiciels ET des prestataires (data/55)
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (select count(*)::int from public.verticals v join public.sites s on s.id = v.site_id
   where s.key = 'daf' and not exists (select 1 from public.categories c where c.vertical_id = v.id and c.kind = 'software')),
  0, 'Chaque univers a au moins une catégorie de logiciels');

select is(
  (select count(*)::int from public.verticals v join public.sites s on s.id = v.site_id
   where s.key = 'daf' and not exists (select 1 from public.categories c where c.vertical_id = v.id and c.kind = 'provider')),
  0, 'Chaque univers a au moins une catégorie de prestataires');

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.kind = 'provider' and c.criteria <> '[]'::jsonb),
  0, 'Prestataires : annuaires sans classement en V1');

select * from finish();
rollback;
