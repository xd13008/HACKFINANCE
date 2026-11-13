-- 2100 · Faits locaux des pages « métier + ville » : répartition des fiches PUBLIÉES par code postal,
-- fiches vérifiées, et présence de la même ville dans les autres annuaires publiés. Rend chaque page ville unique
-- à partir des seules données (aucun texte rédigé), sans exposer de donnée nominative.
create or replace function public.provider_city_facts(p_category uuid, p_city_slug text)
returns jsonb language sql stable security invoker set search_path = public as $$
  with mine as (
    select p.postal_code, p.verification_status
    from public.provider_categories pc join public.providers p on p.id = pc.provider_id
    where pc.category_id = p_category and p.city_slug = p_city_slug and p.status = 'published'
  ), others as (
    select c.slug, c.name, count(*)::int as n
    from public.categories c
    join public.provider_categories pc on pc.category_id = c.id
    join public.providers p on p.id = pc.provider_id
    where c.kind = 'provider' and c.status = 'published' and c.id <> p_category
      and c.site_id = (select site_id from public.categories where id = p_category)
      and p.city_slug = p_city_slug and p.status = 'published'
    group by c.slug, c.name
  )
  select jsonb_build_object(
    'total', (select count(*) from mine),
    'verified', (select count(*) from mine where verification_status = 'verified'),
    'postal_codes', coalesce((select jsonb_agg(jsonb_build_object('code', postal_code, 'n', n) order by n desc, postal_code)
                              from (select postal_code, count(*)::int as n from mine where postal_code is not null group by postal_code) x), '[]'::jsonb),
    'other_directories', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'n', n) order by n desc) from others), '[]'::jsonb)
  );
$$;
comment on function public.provider_city_facts(uuid, text) is 'Faits d''une page ville d''annuaire (fiches publiées seulement) : codes postaux, fiches vérifiées, autres annuaires.';
revoke all on function public.provider_city_facts(uuid, text) from public;
grant execute on function public.provider_city_facts(uuid, text) to anon, authenticated;
