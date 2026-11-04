-- =============================================================================
-- 0200 · Faits : logiciels, prestataires, faits sourcés, prix
-- =============================================================================

create type public.fact_status as enum ('draft', 'validated', 'rejected', 'superseded');

create table public.software (
  id                uuid primary key default gen_random_uuid(),
  vendor            text not null,
  name              text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  website           text,
  logo_path         text,
  tagline           text,
  founded_year      int,
  hq_country        text default 'FR',
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_fictional      boolean not null default false,   -- jeu de données fictif clairement identifié
  claimed_by_email  text,
  claimed_at        timestamptz,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.software_categories (
  software_id uuid not null references public.software (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (software_id, category_id)
);

-- Faits sourcés : type libre normalisé (free_plan, min_price, integrations, features…)
create table public.software_facts (
  id            uuid primary key default gen_random_uuid(),
  software_id   uuid not null references public.software (id) on delete cascade,
  fact_type     text not null check (fact_type ~ '^[a-z0-9_]+$'),
  value         jsonb not null,
  source_url    text not null check (source_url ~ '^https?://'),
  collected_at  timestamptz not null default now(),
  status        public.fact_status not null default 'draft',
  author_kind   text not null default 'human' check (author_kind in ('human', 'agent', 'vendor')),
  created_by    uuid references auth.users (id),
  validated_by  uuid references auth.users (id),
  validated_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);
create index software_facts_sw_idx on public.software_facts (software_id, fact_type, status);

create table public.pricing_plans (
  id            uuid primary key default gen_random_uuid(),
  software_id   uuid not null references public.software (id) on delete cascade,
  plan_name     text not null,
  price_eur     numeric(10, 2),            -- null = sur devis
  billing_period text not null default 'month' check (billing_period in ('month', 'year', 'one_time', 'quote', 'free')),
  per_unit      text,                      -- « par utilisateur », « par entité »…
  conditions    text,
  source_url    text not null check (source_url ~ '^https?://'),
  source_date   date not null,
  status        public.fact_status not null default 'draft',
  sort          int not null default 0,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now()
);

create table public.integrations (
  software_id uuid not null references public.software (id) on delete cascade,
  name        text not null,
  kind        text not null default 'native' check (kind in ('native', 'api', 'connector')),
  source_url  text,
  primary key (software_id, name)
);

-- Prestataires : cabinets de cession, banques d'affaires, experts-comptables, avocats…
create table public.providers (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique check (slug ~ '^[a-z0-9-]+$'),
  profession            text not null,          -- 'conseil-cession', 'banque-affaires', 'expert-comptable', 'avocat'
  regulated_profession  boolean not null default false,
  siren                 text check (siren is null or siren ~ '^[0-9]{9}$'),
  website               text,
  city                  text,
  city_slug             text,
  region                text,
  specialties           text[] not null default '{}',
  deal_size_range       text,
  description           text,
  public_references     jsonb not null default '[]'::jsonb,   -- [{ "label": "...", "source_url": "..." }]
  verification_status   text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  verified_by           uuid references auth.users (id),
  verified_at           timestamptz,
  status                text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_fictional          boolean not null default false,
  -- Données nominatives internes (non exposées publiquement avant revue RGPD)
  internal_contact      jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.provider_categories (
  provider_id uuid not null references public.providers (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (provider_id, category_id)
);

create trigger software_touch before update on public.software
  for each row execute function public.touch_updated_at();
create trigger providers_touch before update on public.providers
  for each row execute function public.touch_updated_at();

create trigger audit_software after insert or update or delete on public.software
  for each row execute function public.audit_trigger();
create trigger audit_software_facts after insert or update or delete on public.software_facts
  for each row execute function public.audit_trigger();
create trigger audit_pricing after insert or update or delete on public.pricing_plans
  for each row execute function public.audit_trigger();
create trigger audit_providers after insert or update or delete on public.providers
  for each row execute function public.audit_trigger();

-- Un fait validé doit l'être par un humain éditeur.
create or replace function public.guard_fact_validation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status is distinct from 'validated') then
    if auth.uid() is not null and not public.user_is_human_editor(auth.uid()) then
      raise exception 'Seul un éditeur humain peut valider un fait';
    end if;
    if tg_table_name = 'software_facts' then
      new.validated_by := coalesce(new.validated_by, auth.uid());
      new.validated_at := coalesce(new.validated_at, now());
    end if;
  end if;
  return new;
end;
$$;
create trigger software_facts_guard before insert or update on public.software_facts
  for each row execute function public.guard_fact_validation();
create trigger pricing_guard before insert or update on public.pricing_plans
  for each row execute function public.guard_fact_validation();

-- Les données nominatives internes ne sont jamais servies publiquement : vue publique dédiée.
create view public.providers_public with (security_invoker = true) as
  select id, name, slug, profession, regulated_profession, website, city, city_slug, region,
         specialties, deal_size_range, description, public_references, verification_status,
         verified_at, is_fictional, updated_at
  from public.providers
  where status = 'published';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.software            enable row level security;
alter table public.software_categories enable row level security;
alter table public.software_facts      enable row level security;
alter table public.pricing_plans       enable row level security;
alter table public.integrations        enable row level security;
alter table public.providers           enable row level security;
alter table public.provider_categories enable row level security;

create policy software_read on public.software
  for select using (status = 'published' or public.is_staff() or public.is_agent());
create policy software_editor_write on public.software
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy software_categories_read on public.software_categories for select using (true);
create policy software_categories_write on public.software_categories
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy facts_read on public.software_facts
  for select using (status = 'validated' or public.is_staff() or public.is_agent());
create policy facts_editor_write on public.software_facts
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
-- Un agent n'écrit que des brouillons, à son nom.
create policy facts_agent_insert on public.software_facts
  for insert to authenticated
  with check (public.is_agent() and status = 'draft' and author_kind = 'agent' and created_by = auth.uid());

create policy pricing_read on public.pricing_plans
  for select using (status = 'validated' or public.is_staff() or public.is_agent());
create policy pricing_editor_write on public.pricing_plans
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
create policy pricing_agent_insert on public.pricing_plans
  for insert to authenticated
  with check (public.is_agent() and status = 'draft' and created_by = auth.uid());

create policy integrations_read on public.integrations for select using (true);
create policy integrations_write on public.integrations
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

-- Table brute réservée à l'équipe ; le public passe par providers_public.
create policy providers_staff_read on public.providers
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy providers_public_read on public.providers
  for select to anon using (status = 'published');
create policy providers_editor_write on public.providers
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
-- Colonnes nominatives : jamais lisibles par anon.
revoke select on public.providers from anon;
grant select (id, name, slug, profession, regulated_profession, website, city, city_slug, region,
              specialties, deal_size_range, description, public_references, verification_status,
              verified_at, status, is_fictional, updated_at)
  on public.providers to anon;

create policy provider_categories_read on public.provider_categories for select using (true);
create policy provider_categories_write on public.provider_categories
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
