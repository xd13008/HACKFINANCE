-- =============================================================================
-- 0700 · Restitution : entonnoir de conversion par rubrique, synthèse Search Console
-- =============================================================================

-- Entonnoir en sessions distinctes : visite → comparatif/annuaire → fiche → clic sortant / formulaire
create or replace function public.analytics_funnel(p_site uuid, p_from date, p_to date, p_rubrique text default null)
returns table (step int, label text, sessions bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    with ev as (
      select e.session_hash, e.event_type, e.page_type
      from public.analytics_events e
      where (p_site is null or e.site_id = p_site)
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
        and (p_rubrique is null or e.session_hash in (
              select e2.session_hash from public.analytics_events e2
              where e2.rubrique = p_rubrique and (p_site is null or e2.site_id = p_site)
                and e2.occurred_at >= p_from and e2.occurred_at < p_to + 1))
    )
    select 1, 'Sessions'::text, count(distinct session_hash) from ev where event_type = 'pageview'
    union all
    select 2, 'Comparatif ou annuaire', count(distinct session_hash) from ev
      where event_type = 'pageview' and page_type in ('category_ranking', 'facet_landing', 'provider_directory', 'alternatives')
    union all
    select 3, 'Fiche, duel ou simulateur', count(distinct session_hash) from ev
      where (event_type = 'pageview' and page_type in ('software_review', 'duel', 'pricing', 'provider', 'simulator')) or event_type = 'simulator_use'
    union all
    select 4, 'Clic sortant', count(distinct session_hash) from ev where event_type = 'outbound_click'
    union all
    select 5, 'Formulaire envoyé', count(distinct session_hash) from ev where event_type in ('form_submit', 'resource_download')
    order by 1;
end;
$$;
grant execute on function public.analytics_funnel(uuid, date, date, text) to authenticated;

-- Synthèse Search Console page × requête sur une période
create or replace function public.gsc_summary(p_site uuid, p_days int default 28)
returns table (site_id uuid, page text, query text, clicks bigint, impressions bigint, ctr numeric, avg_position numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    select g.site_id, g.page, g.query, sum(g.clicks)::bigint, sum(g.impressions)::bigint,
           round(sum(g.clicks)::numeric / nullif(sum(g.impressions), 0) * 100, 2),
           round(sum(g.position * g.impressions) / nullif(sum(g.impressions), 0), 1)
    from public.gsc_metrics g
    where (p_site is null or g.site_id = p_site) and g.date >= current_date - p_days
    group by g.site_id, g.page, g.query;
end;
$$;
grant execute on function public.gsc_summary(uuid, int) to authenticated;
