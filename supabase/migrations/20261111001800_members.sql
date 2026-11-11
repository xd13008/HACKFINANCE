-- =============================================================================
-- 1800 · DAF inscrits : compte lecteur, profil déclaré, logiciels connus, projets,
--        recherches et navigation (avec consentement), preuve du consentement aux cookies.
--
-- Principes RGPD appliqués par la base :
-- - aucune lecture publique : anon et l'équipe éditoriale ou commerciale ne voient rien ;
--   seul le rôle admin lit les profils (back-office /admin/inscrits) ;
-- - l'écriture passe uniquement par le serveur (clé de service), après contrôle du jeton de session ;
-- - la navigation n'est rattachée à une personne que si elle a accepté le cookie « personnalisation » ;
-- - durées de conservation appliquées par purge_member_data() (tâche planifiée quotidienne).
-- =============================================================================

create table public.members (
  id                    uuid primary key default gen_random_uuid(),
  site_id               uuid not null references public.sites (id) on delete cascade,
  email                 text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  status                text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  first_name            text check (char_length(first_name) <= 80),
  job_title             text check (char_length(job_title) <= 100),
  company_name          text check (char_length(company_name) <= 200),
  company_size          text check (company_size in ('crea', 'tpe', 'pme1', 'pme2', 'eti', 'ge')),
  sector                text check (char_length(sector) <= 100),
  region                text check (char_length(region) <= 100),
  finance_team_size     text check (finance_team_size in ('1', '2-5', '6-20', '21+')),
  erp                   text check (char_length(erp) <= 100),
  notes                 text check (char_length(notes) <= 2000),          -- besoins exprimés par le DAF lui-même
  consent_newsletter    boolean not null default false,
  newsletter_consent_at timestamptz,
  consent_text          text not null,
  consent_at            timestamptz not null,
  source_path           text,
  utm                   jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  confirmed_at          timestamptz,
  last_seen_at          timestamptz,
  updated_at            timestamptz not null default now(),
  unique (site_id, email)
);
create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();

-- Jetons à usage unique (confirmation, lien de connexion) et sessions : seul le hachage SHA-256 est stocké.
create table public.member_tokens (
  token_hash  text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  member_id   uuid not null references public.members (id) on delete cascade,
  kind        text not null check (kind in ('confirm', 'login', 'session')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index member_tokens_member_idx on public.member_tokens (member_id);

-- Navigateur ayant accepté la personnalisation (cookie rf_vid). Rattaché au compte lors de l'inscription ou de la connexion.
create table public.visitors (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites (id) on delete cascade,
  member_id       uuid references public.members (id) on delete cascade,
  consent         jsonb not null,               -- {"personalisation": true}
  consent_version text not null,
  consented_at    timestamptz not null,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);
create index visitors_member_idx on public.visitors (member_id);

-- Preuve du choix (acceptation ou refus), sans donnée identifiante : conservée 13 mois.
create table public.consent_log (
  id          bigserial primary key,
  site_id     uuid not null references public.sites (id) on delete cascade,
  visitor_id  uuid references public.visitors (id) on delete set null,
  choices     jsonb not null,
  version     text not null,
  created_at  timestamptz not null default now()
);

-- Navigation rattachée à un navigateur consentant
create table public.visitor_events (
  id           bigserial primary key,
  visitor_id   uuid not null references public.visitors (id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  event_type   text not null check (char_length(event_type) <= 40),
  path         text not null check (char_length(path) <= 500),
  page_type    text check (char_length(page_type) <= 50),
  category_id  uuid,
  entity_id    uuid,
  props        jsonb not null default '{}'::jsonb
);
create index visitor_events_visitor_idx on public.visitor_events (visitor_id, occurred_at desc);

-- Recherches faites dans « Trouver » : taille, outils en place, besoin, solutions proposées
create table public.visitor_searches (
  id            bigserial primary key,
  visitor_id    uuid not null references public.visitors (id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  company_size  text check (char_length(company_size) <= 20),
  stack         text[] not null default '{}' check (cardinality(stack) <= 40),
  universe_slug text check (char_length(universe_slug) <= 100),
  need_slug     text check (char_length(need_slug) <= 100),
  result_slugs  text[] not null default '{}' check (cardinality(result_slugs) <= 20)
);
create index visitor_searches_visitor_idx on public.visitor_searches (visitor_id, occurred_at desc);

-- Logiciels connus du DAF (déclarés ou déduits de ses recherches)
create table public.member_software (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members (id) on delete cascade,
  software_id   uuid references public.software (id) on delete set null,
  software_name text not null check (char_length(software_name) between 1 and 120),
  relation      text not null check (relation in ('uses', 'evaluating', 'knows', 'left')),
  satisfaction  smallint check (satisfaction between 1 and 5),
  source        text not null default 'declared' check (source in ('declared', 'search')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index member_software_uniq on public.member_software (member_id, lower(software_name));
create trigger member_software_touch before update on public.member_software for each row execute function public.touch_updated_at();

-- Projets déclarés : sous-rubrique et échéance
create table public.member_projects (
  member_id   uuid not null references public.members (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  horizon     text not null check (horizon in ('0-3', '3-6', '6-12', '12+')),
  created_at  timestamptz not null default now(),
  primary key (member_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Droits : aucune lecture hors admin, aucune écriture hors serveur (clé de service)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['members', 'member_tokens', 'visitors', 'consent_log', 'visitor_events', 'visitor_searches',
                           'member_software', 'member_projects'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.members, public.visitors, public.consent_log, public.visitor_events, public.visitor_searches,
                public.member_software, public.member_projects to authenticated;
create policy members_admin_read on public.members for select to authenticated using (public.has_role('admin'));
create policy visitors_admin_read on public.visitors for select to authenticated using (public.has_role('admin'));
create policy consent_log_admin_read on public.consent_log for select to authenticated using (public.has_role('admin'));
create policy visitor_events_admin_read on public.visitor_events for select to authenticated using (public.has_role('admin'));
create policy visitor_searches_admin_read on public.visitor_searches for select to authenticated using (public.has_role('admin'));
create policy member_software_admin_read on public.member_software for select to authenticated using (public.has_role('admin'));
create policy member_projects_admin_read on public.member_projects for select to authenticated using (public.has_role('admin'));
-- member_tokens : aucune politique, donc illisible même pour l'admin.

-- ---------------------------------------------------------------------------
-- Durées de conservation (CNIL) — appelée chaque jour par /api/cron/purge
-- ---------------------------------------------------------------------------
create or replace function public.purge_member_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := '{}'::jsonb; n int;
begin
  delete from member_tokens where expires_at < now(); get diagnostics n = row_count; r := r || jsonb_build_object('tokens', n);
  -- inscription jamais confirmée : 30 jours
  delete from members where status = 'pending' and created_at < now() - interval '30 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('pending', n);
  -- compte inactif depuis 3 ans
  delete from members where coalesce(last_seen_at, confirmed_at, created_at) < now() - interval '3 years';
  get diagnostics n = row_count; r := r || jsonb_build_object('inactive', n);
  -- navigateur sans compte, inactif depuis 13 mois (durée de vie maximale d'un cookie)
  delete from visitors where member_id is null and last_seen_at < now() - interval '13 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('visitors', n);
  -- navigation et recherches : 25 mois
  delete from visitor_events where occurred_at < now() - interval '25 months'; get diagnostics n = row_count; r := r || jsonb_build_object('events', n);
  delete from visitor_searches where occurred_at < now() - interval '25 months'; get diagnostics n = row_count; r := r || jsonb_build_object('searches', n);
  delete from consent_log where created_at < now() - interval '13 months'; get diagnostics n = row_count; r := r || jsonb_build_object('consents', n);
  return r;
end;
$$;
revoke execute on function public.purge_member_data() from public, anon, authenticated;
