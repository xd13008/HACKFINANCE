-- 1600 · Pages locales des annuaires (métier × ville, métier × département).
-- Comptage par lieu des seules fiches PUBLIÉES, calculé en base (des dizaines de milliers de fiches issues des registres publics).
create index if not exists provider_categories_category_idx on public.provider_categories (category_id, provider_id);
create index if not exists providers_city_slug_idx on public.providers (city_slug) where status = 'published';
create index if not exists providers_department_idx on public.providers (department) where status = 'published';

-- security invoker : les droits de l'appelant s'appliquent (anon ne voit que les fiches publiées, sans SIREN ni contact).
create or replace function public.provider_locations(p_category uuid)
returns table (city text, city_slug text, department text, providers int)
language sql stable security invoker set search_path = public as $$
  select p.city, p.city_slug, p.department, count(*)::int
  from public.provider_categories pc
  join public.providers p on p.id = pc.provider_id
  where pc.category_id = p_category and p.status = 'published' and p.city_slug is not null
  group by p.city, p.city_slug, p.department
  order by count(*) desc, p.city;
$$;
comment on function public.provider_locations(uuid) is 'Villes et départements d''un annuaire, avec le nombre de fiches publiées (pages locales).';
revoke all on function public.provider_locations(uuid) from public;
grant execute on function public.provider_locations(uuid) to anon, authenticated;

-- Annuaire d'un métier, paginable : mêmes colonnes publiques que providers_public + la catégorie (security_invoker : RLS de l'appelant).
create or replace view public.providers_by_category with (security_invoker = true) as
  select pc.category_id, p.*
  from public.provider_categories pc
  join public.providers_public p on p.id = pc.provider_id;
grant select on public.providers_by_category to anon, authenticated;
