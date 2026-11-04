-- =============================================================================
-- 0600 · Mesure d'audience first-party (sans cookie) et traçabilité des agents
-- =============================================================================

create table public.analytics_events (
  id            bigint generated always as identity primary key,
  site_id       uuid not null references public.sites (id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  -- hachage(IP + user-agent + site + sel quotidien) calculé côté serveur ; aucune IP stockée
  session_hash  text not null check (char_length(session_hash) between 16 and 64),
  event_type    text not null check (event_type in (
                  'pageview', 'outbound_click', 'sponsored_impression', 'form_submit',
                  'simulator_use', 'resource_download', 'scroll_depth')),
  path          text not null check (char_length(path) <= 500),
  page_type     text,              -- gabarit (content_type ou route)
  rubrique      text,              -- verticale ou catégorie (slug)
  category_id   uuid,
  entity_id     uuid,              -- logiciel, prestataire ou contenu concerné
  placement_id  uuid,              -- emplacement sponsorisé concerné
  link_kind     text check (link_kind is null or link_kind in ('editorial', 'affiliate', 'sponsored')),
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  device        text check (device is null or device in ('mobile', 'tablet', 'desktop', 'bot')),
  props         jsonb not null default '{}'::jsonb
);
create index analytics_events_site_time on public.analytics_events (site_id, occurred_at desc);
create index analytics_events_session on public.analytics_events (site_id, session_hash, occurred_at);
create index analytics_events_type on public.analytics_events (site_id, event_type, occurred_at desc);

-- Point d'entrée unique de la collecte (appelé par /api/collect avec la clé publique).
create or replace function public.record_event(
  p_site_key text, p_session_hash text, p_event_type text, p_path text,
  p_page_type text default null, p_rubrique text default null, p_category_id uuid default null,
  p_entity_id uuid default null, p_placement_id uuid default null, p_link_kind text default null,
  p_referrer_host text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_device text default null, p_props jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  sid uuid;
begin
  select id into sid from public.sites where key = p_site_key;
  if sid is null then return; end if;
  if p_device = 'bot' then return; end if;
  insert into public.analytics_events (
    site_id, session_hash, event_type, path, page_type, rubrique, category_id, entity_id, placement_id,
    link_kind, referrer_host, utm_source, utm_medium, utm_campaign, device, props)
  values (
    sid, p_session_hash, p_event_type, left(p_path, 500), left(p_page_type, 50), left(p_rubrique, 100),
    p_category_id, p_entity_id, p_placement_id, p_link_kind, left(p_referrer_host, 200),
    left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100), p_device,
    coalesce(p_props, '{}'::jsonb));
end;
$$;
revoke execute on function public.record_event from public;
grant execute on function public.record_event to anon, authenticated;

-- Purge : conservation 25 mois (recommandation CNIL pour la mesure d'audience).
create or replace function public.purge_analytics()
returns int language sql security definer set search_path = public as $$
  with d as (delete from public.analytics_events where occurred_at < now() - interval '25 months' returning 1)
  select count(*)::int from d;
$$;
revoke execute on function public.purge_analytics() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions de restitution (back-office, staff uniquement)
-- ---------------------------------------------------------------------------
create or replace function public.require_staff()
returns void language plpgsql stable as $$
begin
  if not public.is_staff() then raise exception 'Accès réservé à l''équipe'; end if;
end;
$$;

-- Vue d'ensemble : visites, sessions, clics sortants, demandes, par jour
create or replace function public.analytics_daily(p_site uuid, p_from date, p_to date)
returns table (day date, pageviews bigint, sessions bigint, outbound_clicks bigint,
               sponsored_clicks bigint, form_submits bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    select (e.occurred_at at time zone 'Europe/Paris')::date as day,
           count(*) filter (where e.event_type = 'pageview'),
           count(distinct e.session_hash) filter (where e.event_type = 'pageview'),
           count(*) filter (where e.event_type = 'outbound_click'),
           count(*) filter (where e.event_type = 'outbound_click' and e.link_kind = 'sponsored'),
           count(*) filter (where e.event_type = 'form_submit')
    from public.analytics_events e
    where (p_site is null or e.site_id = p_site)
      and e.occurred_at >= p_from and e.occurred_at < p_to + 1
    group by 1 order by 1;
end;
$$;

-- Trafic et conversion par rubrique
create or replace function public.analytics_by_rubrique(p_site uuid, p_from date, p_to date)
returns table (rubrique text, pageviews bigint, sessions bigint, outbound_clicks bigint,
               click_rate numeric, form_submits bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    with s as (
      select coalesce(e.rubrique, '(autre)') as r, e.event_type, e.session_hash
      from public.analytics_events e
      where (p_site is null or e.site_id = p_site)
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
    )
    select r,
           count(*) filter (where event_type = 'pageview'),
           count(distinct session_hash) filter (where event_type = 'pageview'),
           count(*) filter (where event_type = 'outbound_click'),
           round(100.0 * count(*) filter (where event_type = 'outbound_click')
                 / nullif(count(*) filter (where event_type = 'pageview'), 0), 2),
           count(*) filter (where event_type = 'form_submit')
    from s group by r order by 2 desc;
end;
$$;

-- Pages : vues, sorties, clics
create or replace function public.analytics_top_pages(p_site uuid, p_from date, p_to date, p_limit int default 50)
returns table (path text, page_type text, rubrique text, pageviews bigint, sessions bigint,
               entries bigint, outbound_clicks bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    with ev as (
      select e.*, row_number() over (partition by e.site_id, e.session_hash, (e.occurred_at at time zone 'Europe/Paris')::date
                                     order by e.occurred_at) as rn
      from public.analytics_events e
      where (p_site is null or e.site_id = p_site)
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
        and e.event_type = 'pageview'
    ), clicks as (
      select e.path, count(*) as c from public.analytics_events e
      where (p_site is null or e.site_id = p_site) and e.event_type = 'outbound_click'
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
      group by e.path
    )
    select ev.path, max(ev.page_type), max(ev.rubrique), count(*), count(distinct ev.session_hash),
           count(*) filter (where ev.rn = 1), coalesce(max(clicks.c), 0)
    from ev left join clicks on clicks.path = ev.path
    group by ev.path order by 4 desc limit p_limit;
end;
$$;

-- Parcours : transitions entre gabarits au sein d'une session (pour Sankey / entonnoir)
create or replace function public.analytics_journeys(p_site uuid, p_from date, p_to date, p_rubrique text default null)
returns table (from_step text, to_step text, transitions bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    with ev as (
      select e.session_hash, e.occurred_at,
             case when e.event_type = 'outbound_click'
                  then 'clic:' || coalesce(e.link_kind, 'editorial')
                  when e.event_type = 'form_submit' then 'formulaire'
                  else coalesce(e.page_type, 'autre') end as step,
             e.rubrique
      from public.analytics_events e
      where (p_site is null or e.site_id = p_site)
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
        and e.event_type in ('pageview', 'outbound_click', 'form_submit')
    ), sessions_in as (
      select distinct session_hash from ev where p_rubrique is null or rubrique = p_rubrique
    ), seq as (
      select ev.session_hash, ev.step,
             lag(ev.step) over (partition by ev.session_hash order by ev.occurred_at) as prev
      from ev join sessions_in using (session_hash)
    )
    select coalesce(prev, 'entrée'), step, count(*)
    from seq
    where prev is distinct from step
    group by 1, 2 order by 3 desc limit 200;
end;
$$;

-- Performance des emplacements sponsorisés (reporting annonceur)
create or replace function public.analytics_placements(p_site uuid, p_from date, p_to date)
returns table (placement_id uuid, impressions bigint, clicks bigint, ctr numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    select e.placement_id,
           count(*) filter (where e.event_type = 'sponsored_impression'),
           count(*) filter (where e.event_type = 'outbound_click'),
           round(100.0 * count(*) filter (where e.event_type = 'outbound_click')
                 / nullif(count(*) filter (where e.event_type = 'sponsored_impression'), 0), 2)
    from public.analytics_events e
    where e.placement_id is not null and (p_site is null or e.site_id = p_site)
      and e.occurred_at >= p_from and e.occurred_at < p_to + 1
    group by e.placement_id order by 2 desc;
end;
$$;

-- Sources de trafic
create or replace function public.analytics_sources(p_site uuid, p_from date, p_to date)
returns table (source text, sessions bigint, pageviews bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_staff();
  return query
    with first_hits as (
      select distinct on (e.session_hash) e.session_hash, e.referrer_host, e.utm_source, e.utm_medium
      from public.analytics_events e
      where (p_site is null or e.site_id = p_site) and e.event_type = 'pageview'
        and e.occurred_at >= p_from and e.occurred_at < p_to + 1
      order by e.session_hash, e.occurred_at
    ), classified as (
      select session_hash,
        case
          when utm_source is not null then 'campagne:' || utm_source
          when referrer_host is null then 'direct'
          when referrer_host ~ '(google|bing|qwant|duckduckgo|ecosia|yahoo)\.' then 'organique'
          when referrer_host ~ '(chatgpt|openai|perplexity|claude|gemini|copilot)' then 'assistants IA'
          when referrer_host ~ '(linkedin|facebook|twitter|x\.com|t\.co)' then 'social'
          else 'référent:' || referrer_host
        end as src
      from first_hits
    )
    select c.src, count(distinct c.session_hash),
           (select count(*) from public.analytics_events e2
             where e2.event_type = 'pageview' and e2.session_hash in (select session_hash from classified c2 where c2.src = c.src)
               and (p_site is null or e2.site_id = p_site)
               and e2.occurred_at >= p_from and e2.occurred_at < p_to + 1)
    from classified c group by c.src order by 2 desc;
end;
$$;

grant execute on function public.analytics_daily(uuid, date, date) to authenticated;
grant execute on function public.analytics_by_rubrique(uuid, date, date) to authenticated;
grant execute on function public.analytics_top_pages(uuid, date, date, int) to authenticated;
grant execute on function public.analytics_journeys(uuid, date, date, text) to authenticated;
grant execute on function public.analytics_placements(uuid, date, date) to authenticated;
grant execute on function public.analytics_sources(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Agents (V2) : journal des exécutions
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent       text not null check (agent in ('veille', 'redaction', 'controle_qualite', 'opportunites_seo', 'verification_prestataires')),
  input       jsonb not null default '{}'::jsonb,
  output      jsonb,
  status      text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  cost_usd    numeric(10, 4) not null default 0,
  duration_ms int,
  error       text,
  started_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

create table public.agent_settings (
  agent              text primary key,
  enabled            boolean not null default false,
  max_cost_per_run   numeric(10, 2) not null default 1,
  max_cost_per_month numeric(10, 2) not null default 50,
  allowed_domains    text[] not null default '{}',
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.analytics_events enable row level security;
alter table public.agent_runs       enable row level security;
alter table public.agent_settings   enable row level security;

create policy analytics_staff_read on public.analytics_events
  for select to authenticated using (public.is_staff());
revoke insert, update, delete on public.analytics_events from anon, authenticated;

create policy agent_runs_staff_read on public.agent_runs
  for select to authenticated using (public.is_staff());
create policy agent_runs_agent_insert on public.agent_runs
  for insert to authenticated with check (public.is_agent() and started_by = auth.uid());
create policy agent_runs_admin_write on public.agent_runs
  for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy agent_settings_staff_read on public.agent_settings
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy agent_settings_admin_write on public.agent_settings
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
