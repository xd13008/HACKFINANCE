-- =============================================================================
-- 0500 · Demandes publiques (référencement, revendication, publicité, ressources,
--        signalements) et régie (inventaire, emplacements sponsorisés, affiliation)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Demandes de référencement dans l'annuaire
-- ---------------------------------------------------------------------------
create table public.listing_requests (
  id                 uuid primary key default gen_random_uuid(),
  site_id            uuid not null references public.sites (id) on delete cascade,
  kind               text not null check (kind in ('software', 'provider')),
  company_name       text not null check (char_length(company_name) between 2 and 200),
  product_name       text,
  siren              text check (siren is null or siren ~ '^[0-9]{9}$'),
  website            text not null check (website ~ '^https?://'),
  category_id        uuid references public.categories (id) on delete set null,
  profession         text,
  city               text,
  contact_name       text not null,
  contact_email      text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_role       text,
  message            text check (message is null or char_length(message) <= 4000),
  consent_at         timestamptz not null,
  consent_text       text not null,
  -- Contrôles automatiques : { "siren_found": true, "email_domain_match": true, "duplicate_of": null }
  checks             jsonb not null default '{}'::jsonb,
  status             text not null default 'new'
                     check (status in ('new', 'checking', 'accepted', 'rejected', 'duplicate')),
  decided_by         uuid references auth.users (id),
  decided_at         timestamptz,
  decision_comment   text,
  created_software_id uuid references public.software (id) on delete set null,
  created_provider_id uuid references public.providers (id) on delete set null,
  utm                jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index listing_requests_status_idx on public.listing_requests (site_id, status, created_at desc);

-- Revendication d'une fiche par l'éditeur ou le cabinet
create table public.profile_claims (
  id               uuid primary key default gen_random_uuid(),
  target_type      text not null check (target_type in ('software', 'provider')),
  target_id        uuid not null,
  claimant_name    text not null,
  claimant_email   text not null check (claimant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  claimant_role    text,
  proposed_changes jsonb not null default '{}'::jsonb,   -- chaque changement → review_task avec source
  email_domain_match boolean,
  status           text not null default 'new' check (status in ('new', 'verified', 'rejected')),
  consent_at       timestamptz not null,
  decided_by       uuid references auth.users (id),
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Régie : inventaire publicitaire
-- ---------------------------------------------------------------------------
create type public.placement_type as enum (
  'category_sponsored',  -- position sponsorisée signalée sur un classement
  'enhanced_listing',    -- fiche enrichie (logo, démo, CTA)
  'guide_banner',        -- encart dans les guides d'un cluster
  'newsletter',
  'simulator_sponsor',   -- sponsoring d'un simulateur
  'directory_featured'   -- prestataire mis en avant dans l'annuaire
);

create table public.placement_inventory (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  placement_type   public.placement_type not null,
  category_id      uuid references public.categories (id) on delete cascade,
  content_item_id  uuid references public.content_items (id) on delete cascade,
  slot             int not null default 1 check (slot between 1 and 5),
  label            text not null default 'Sponsorisé' check (char_length(trim(label)) > 0),
  base_price_month numeric(10, 2),      -- null = calcul automatique
  active           boolean not null default true,
  unique (site_id, placement_type, category_id, content_item_id, slot)
);

-- Prix indicatif mensuel : plancher 150 €, sinon 4 % de la valeur Semrush mensuelle (volume × CPC).
create view public.placement_inventory_priced with (security_invoker = true) as
  select pi.*,
         c.name as category_name,
         c.slug as category_slug,
         coalesce(pi.base_price_month,
           greatest(150, round(coalesce(c.value_score, 0) * 0.04 / 10) * 10)) as indicative_price_month
  from public.placement_inventory pi
  left join public.categories c on c.id = pi.category_id;

create table public.commercial_contracts (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  client_name    text not null,
  reference      text not null unique,
  starts_on      date not null,
  ends_on        date not null check (ends_on >= starts_on),
  amount_eur     numeric(12, 2),
  status         text not null default 'draft' check (status in ('draft', 'signed', 'active', 'ended', 'cancelled')),
  notes          text,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

create table public.sponsored_placements (
  id             uuid primary key default gen_random_uuid(),
  inventory_id   uuid not null references public.placement_inventory (id) on delete cascade,
  contract_id    uuid references public.commercial_contracts (id) on delete set null,
  software_id    uuid references public.software (id) on delete cascade,
  provider_id    uuid references public.providers (id) on delete cascade,
  headline       text,
  cta_label      text default 'Voir l''offre',
  cta_url        text check (cta_url is null or cta_url ~ '^https?://'),
  starts_on      date not null,
  ends_on        date not null check (ends_on >= starts_on),
  status         text not null default 'scheduled' check (status in ('scheduled', 'active', 'paused', 'ended')),
  created_at     timestamptz not null default now(),
  check (software_id is not null or provider_id is not null)
);

-- Pas de double réservation d'un même emplacement sur une période.
create extension if not exists btree_gist with schema extensions;
alter table public.sponsored_placements
  add constraint sponsored_no_overlap exclude using gist (
    inventory_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  ) where (status in ('scheduled', 'active'));

-- Emplacements à afficher aujourd'hui (le libellé « Sponsorisé » est toujours joint).
create view public.active_sponsored_placements with (security_invoker = true) as
  select sp.id, sp.software_id, sp.provider_id, sp.headline, sp.cta_label, sp.cta_url,
         pi.site_id, pi.placement_type, pi.category_id, pi.content_item_id, pi.slot, pi.label
  from public.sponsored_placements sp
  join public.placement_inventory pi on pi.id = sp.inventory_id and pi.active
  where sp.status in ('scheduled', 'active') and current_date between sp.starts_on and sp.ends_on;

create table public.affiliate_links (
  id           uuid primary key default gen_random_uuid(),
  software_id  uuid not null references public.software (id) on delete cascade,
  url          text not null check (url ~ '^https?://'),
  network      text,
  commission   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create unique index affiliate_links_one_active on public.affiliate_links (software_id) where active;

-- ---------------------------------------------------------------------------
-- Demandes d'apparition sur les emplacements publicitaires
-- ---------------------------------------------------------------------------
create table public.placement_requests (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites (id) on delete cascade,
  advertiser_name text not null check (char_length(advertiser_name) between 2 and 200),
  website         text check (website is null or website ~ '^https?://'),
  contact_name    text not null,
  contact_email   text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone   text,
  placement_types public.placement_type[] not null default '{}',
  category_ids    uuid[] not null default '{}',
  period_start    date,
  period_end      date,
  budget_range    text,
  message         text check (message is null or char_length(message) <= 4000),
  consent_at      timestamptz not null,
  consent_text    text not null,
  status          text not null default 'new'
                  check (status in ('new', 'qualified', 'quote_sent', 'signed', 'active', 'ended', 'lost')),
  owner_id        uuid references auth.users (id),
  quoted_amount   numeric(12, 2),
  contract_id     uuid references public.commercial_contracts (id) on delete set null,
  notes           text,
  utm             jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger placement_requests_touch before update on public.placement_requests
  for each row execute function public.touch_updated_at();

-- Ressources téléchargeables (e-mail contre modèle)
create table public.resource_leads (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites (id) on delete cascade,
  resource_content_id uuid references public.content_items (id) on delete set null,
  email               text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company_size        text,
  job_title           text,
  consent_newsletter  boolean not null default false,
  consent_at          timestamptz not null,
  consent_text        text not null,
  origin_path         text,
  utm                 jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Signalement d'erreur et droit de réponse
create table public.error_reports (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  page_path      text not null,
  kind           text not null default 'error' check (kind in ('error', 'right_of_reply')),
  reporter_name  text,
  reporter_email text not null check (reporter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message        text not null check (char_length(message) between 10 and 4000),
  source_url     text,
  consent_at     timestamptz not null,
  status         text not null default 'new' check (status in ('new', 'in_review', 'corrected', 'answered', 'dismissed')),
  response       text,
  handled_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  -- Délai de traitement affiché publiquement : 10 jours ouvrés
  due_at         timestamptz not null default now() + interval '14 days'
);

-- Toute demande publique crée une tâche dans le back-office.
create or replace function public.task_on_public_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'listing_requests' then
    insert into public.review_tasks (site_id, kind, reason, details)
    values (new.site_id, 'listing', 'Demande de référencement : ' || new.company_name,
            jsonb_build_object('listing_request_id', new.id));
  elsif tg_table_name = 'error_reports' then
    insert into public.review_tasks (site_id, kind, reason, details)
    values (new.site_id, 'error_report',
            case new.kind when 'right_of_reply' then 'Droit de réponse : ' else 'Signalement d''erreur : ' end || new.page_path,
            jsonb_build_object('error_report_id', new.id));
  end if;
  return new;
end;
$$;
create trigger listing_requests_task after insert on public.listing_requests
  for each row execute function public.task_on_public_request();
create trigger error_reports_task after insert on public.error_reports
  for each row execute function public.task_on_public_request();

create trigger audit_listing_requests after update or delete on public.listing_requests
  for each row execute function public.audit_trigger();
create trigger audit_placement_requests after update or delete on public.placement_requests
  for each row execute function public.audit_trigger();
create trigger audit_sponsored after insert or update or delete on public.sponsored_placements
  for each row execute function public.audit_trigger();
create trigger audit_inventory after insert or update or delete on public.placement_inventory
  for each row execute function public.audit_trigger();
create trigger audit_affiliate after insert or update or delete on public.affiliate_links
  for each row execute function public.audit_trigger();
create trigger audit_contracts after insert or update or delete on public.commercial_contracts
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.listing_requests     enable row level security;
alter table public.profile_claims       enable row level security;
alter table public.placement_inventory  enable row level security;
alter table public.commercial_contracts enable row level security;
alter table public.sponsored_placements enable row level security;
alter table public.affiliate_links      enable row level security;
alter table public.placement_requests   enable row level security;
alter table public.resource_leads       enable row level security;
alter table public.error_reports        enable row level security;

-- Formulaires publics : insertion seule, statut initial imposé, aucune lecture.
create policy listing_requests_public_insert on public.listing_requests
  for insert to anon, authenticated
  with check (status = 'new' and decided_by is null and created_software_id is null and created_provider_id is null);
create policy listing_requests_staff on public.listing_requests
  for select to authenticated using (public.is_staff());
create policy listing_requests_editor_update on public.listing_requests
  for update to authenticated
  using (public.has_role('editor') or public.has_role('admin'))
  with check (public.has_role('editor') or public.has_role('admin'));

create policy profile_claims_public_insert on public.profile_claims
  for insert to anon, authenticated with check (status = 'new' and decided_by is null);
create policy profile_claims_staff on public.profile_claims
  for select to authenticated using (public.is_staff());
create policy profile_claims_editor_update on public.profile_claims
  for update to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy placement_requests_public_insert on public.placement_requests
  for insert to anon, authenticated
  with check (status = 'new' and owner_id is null and quoted_amount is null and contract_id is null);
create policy placement_requests_staff_read on public.placement_requests
  for select to authenticated using (public.is_staff());
create policy placement_requests_sales_update on public.placement_requests
  for update to authenticated
  using (public.has_role('sales') or public.has_role('admin'))
  with check (public.has_role('sales') or public.has_role('admin'));

create policy resource_leads_public_insert on public.resource_leads
  for insert to anon, authenticated with check (true);
create policy resource_leads_staff_read on public.resource_leads
  for select to authenticated using (public.has_role('admin') or public.has_role('sales') or public.has_role('editor'));

create policy error_reports_public_insert on public.error_reports
  for insert to anon, authenticated
  with check (status = 'new' and response is null and handled_by is null);
create policy error_reports_staff on public.error_reports
  for select to authenticated using (public.is_staff());
create policy error_reports_update on public.error_reports
  for update to authenticated
  using (public.has_role('editor') or public.has_role('compliance'))
  with check (public.has_role('editor') or public.has_role('compliance'));

-- Inventaire : lisible publiquement (page /publicite), géré par le commercial.
create policy inventory_public_read on public.placement_inventory for select using (active or public.is_staff());
create policy inventory_sales_write on public.placement_inventory
  for all to authenticated
  using (public.has_role('sales') or public.has_role('admin'))
  with check (public.has_role('sales') or public.has_role('admin'));

create policy contracts_staff_read on public.commercial_contracts
  for select to authenticated using (public.has_role('sales') or public.has_role('admin') or public.has_role('compliance'));
create policy contracts_sales_write on public.commercial_contracts
  for all to authenticated
  using (public.has_role('sales') or public.has_role('admin'))
  with check (public.has_role('sales') or public.has_role('admin'));

create policy sponsored_public_read on public.sponsored_placements
  for select using (status in ('scheduled', 'active') or public.is_staff());
create policy sponsored_sales_write on public.sponsored_placements
  for all to authenticated
  using (public.has_role('sales') or public.has_role('admin'))
  with check (public.has_role('sales') or public.has_role('admin'));

create policy affiliate_public_read on public.affiliate_links for select using (active or public.is_staff());
create policy affiliate_sales_write on public.affiliate_links
  for all to authenticated
  using (public.has_role('sales') or public.has_role('admin'))
  with check (public.has_role('sales') or public.has_role('admin'));
