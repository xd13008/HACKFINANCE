-- =============================================================================
-- 0100 · Plateforme : portails, taxonomie, rôles, audit
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Rôles applicatifs
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'editor', 'sales', 'compliance', 'agent');

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.staff_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  job_title    text,
  bio          text,
  is_public    boolean not null default false  -- affiché comme auteur / valideur
);

-- Vrai si l'utilisateur courant possède le rôle demandé.
create or replace function public.has_role(r public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r);
$$;

-- Membre humain de l'équipe (tout rôle sauf agent).
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'editor', 'sales', 'compliance')
  );
$$;

create or replace function public.is_agent()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'agent')
     and not exists (
       select 1 from public.user_roles
       where user_id = auth.uid() and role in ('admin', 'editor', 'sales', 'compliance')
     );
$$;

-- Vrai si l'utilisateur donné est un humain éditeur (utilisé par les contraintes).
create or replace function public.user_is_human_editor(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = 'editor')
     and not exists (select 1 from public.user_roles where user_id = uid and role = 'agent');
$$;

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(txt)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Portails et taxonomie
-- ---------------------------------------------------------------------------
create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z0-9-]+$'),
  name        text not null,
  domain      text not null unique,
  base_path   text not null default '',          -- '' = domaine dédié ; '/daf' = sous-dossier
  tagline     text,
  description text,
  audience    text,
  theme       jsonb not null default '{}'::jsonb,  -- couleurs, logo
  status      text not null default 'draft' check (status in ('draft', 'live')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.verticals (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  sort        int not null default 0,
  unique (site_id, slug)
);

create type public.category_kind as enum ('software', 'provider');

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete cascade,
  vertical_id uuid references public.verticals (id) on delete set null,
  parent_id   uuid references public.categories (id) on delete set null,
  kind        public.category_kind not null default 'software',
  name        text not null,
  slug        text not null check (slug ~ '^[a-z0-9-]+$'),
  short_name  text,                 -- « trésorerie » dans « logiciel de trésorerie »
  description text,
  -- Critères de notation : [{ "key": "fonctionnalites", "label": "...", "weight": 30 }]
  criteria    jsonb not null default '[]'::jsonb,
  -- Valeur commerciale (volume × CPC Semrush), sert au prix indicatif des emplacements
  value_score numeric(12, 2) not null default 0,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (site_id, slug)
);

-- Les pondérations d'une catégorie notée totalisent 100.
create or replace function public.check_category_criteria()
returns trigger language plpgsql as $$
declare
  total numeric;
begin
  if jsonb_typeof(new.criteria) <> 'array' then
    raise exception 'criteria doit être un tableau JSON';
  end if;
  if jsonb_array_length(new.criteria) > 0 then
    select coalesce(sum((c ->> 'weight')::numeric), 0) into total
    from jsonb_array_elements(new.criteria) c;
    if total <> 100 then
      raise exception 'La somme des pondérations doit valoir 100 (actuellement %)', total;
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_criteria before insert or update of criteria on public.categories
  for each row execute function public.check_category_criteria();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger sites_touch before update on public.sites
  for each row execute function public.touch_updated_at();

create type public.facet_type as enum ('price', 'company_size', 'sector', 'feature', 'integration', 'city');

create table public.facets (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  facet_type  public.facet_type not null,
  name        text not null,
  slug        text not null check (slug ~ '^[a-z0-9-]+$'),
  -- Règle de filtrage sur les faits : { "fact_type": "free_plan", "equals": true }
  rule        jsonb not null default '{}'::jsonb,
  -- Seules les facettes déclarées landing sont indexables (contenu propre requis)
  is_landing  boolean not null default false,
  unique (category_id, slug)
);

-- ---------------------------------------------------------------------------
-- Journal d'audit (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor_id     uuid,
  actor_kind   text not null default 'human' check (actor_kind in ('human', 'agent', 'system', 'public')),
  action       text not null,                 -- INSERT / UPDATE / DELETE / workflow:*
  table_name   text not null,
  row_id       text,
  before       jsonb,
  after        jsonb,
  source_url   text,
  agent_run_id uuid
);
create index audit_log_row_idx on public.audit_log (table_name, row_id);
create index audit_log_at_idx on public.audit_log (at desc);

create or replace function public.current_actor_kind()
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'system'
    when public.is_agent() then 'agent'
    else 'human'
  end;
$$;

create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rid text;
  src text;
begin
  if tg_op = 'DELETE' then
    rid := coalesce(to_jsonb(old) ->> 'id', null);
  else
    rid := coalesce(to_jsonb(new) ->> 'id', null);
    src := coalesce(to_jsonb(new) ->> 'source_url', null);
  end if;

  insert into public.audit_log (actor_id, actor_kind, action, table_name, row_id, before, after, source_url)
  values (
    auth.uid(),
    public.current_actor_kind(),
    tg_op,
    tg_table_name,
    rid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    src
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_workflow(p_action text, p_table text, p_row uuid, p_details jsonb)
returns void
language sql security definer set search_path = public
as $$
  insert into public.audit_log (actor_id, actor_kind, action, table_name, row_id, after)
  values (auth.uid(), public.current_actor_kind(), 'workflow:' || p_action, p_table, p_row::text, p_details);
$$;
revoke execute on function public.audit_workflow(text, text, uuid, jsonb) from public, anon, authenticated;

create trigger audit_sites after insert or update or delete on public.sites
  for each row execute function public.audit_trigger();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();
create trigger audit_facets after insert or update or delete on public.facets
  for each row execute function public.audit_trigger();
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_roles     enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.sites          enable row level security;
alter table public.verticals      enable row level security;
alter table public.categories     enable row level security;
alter table public.facets         enable row level security;
alter table public.audit_log      enable row level security;

create policy user_roles_self_read on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy user_roles_admin_write on public.user_roles
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy staff_profiles_public_read on public.staff_profiles
  for select using (is_public or public.is_staff());
create policy staff_profiles_self_write on public.staff_profiles
  for all to authenticated
  using (user_id = auth.uid() or public.has_role('admin'))
  with check (user_id = auth.uid() or public.has_role('admin'));

create policy sites_public_read on public.sites for select using (true);
create policy sites_admin_write on public.sites
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy verticals_public_read on public.verticals for select using (true);
create policy verticals_write on public.verticals
  for all to authenticated
  using (public.has_role('admin') or public.has_role('editor'))
  with check (public.has_role('admin') or public.has_role('editor'));

-- Catégories : la grille de critères influe sur les notes → éditeur uniquement.
create policy categories_public_read on public.categories
  for select using (status = 'published' or public.is_staff() or public.is_agent());
create policy categories_editor_write on public.categories
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy facets_public_read on public.facets for select using (true);
create policy facets_editor_write on public.facets
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

-- Audit : lecture staff, aucune écriture directe (les triggers sont security definer).
create policy audit_staff_read on public.audit_log for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
