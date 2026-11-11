-- =============================================================================
-- 1900 · Jobs : offres d'emploi finance
-- Deux sources : import France Travail (gratuit) et annonces payantes déposées par les inscrits.
-- Règles imposées par la base :
-- - seule une personne éditrice publie une offre (trigger guard_job_publication), jamais le serveur seul ;
-- - une annonce déposée par un inscrit n'est publiable qu'une fois payée ;
-- - anon ne lit que les offres publiées et non expirées, sans les colonnes internes ;
-- - le commercial ne modifie aucune offre.
-- =============================================================================

create table public.job_products (
  code           text primary key check (code ~ '^[a-z0-9-]{2,40}$'),
  label          text not null,
  description    text,
  amount_cents   int not null check (amount_cents > 0),     -- hors taxes
  duration_days  int not null default 30 check (duration_days between 1 and 365),
  featured       boolean not null default false,
  active         boolean not null default true,
  sort           int not null default 0
);

create table public.job_offers (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references public.sites (id) on delete cascade,
  source            text not null check (source in ('france_travail', 'member')),
  external_id       text check (char_length(external_id) <= 40),
  slug              text not null check (slug ~ '^[a-z0-9-]{3,120}$'),
  title             text not null check (char_length(title) between 5 and 160),
  company_name      text check (char_length(company_name) <= 200),
  company_siren     text check (company_siren ~ '^[0-9]{9}$'),
  provider_id       uuid references public.providers (id) on delete set null,
  city              text check (char_length(city) <= 120),
  postal_code       text check (postal_code ~ '^[0-9]{5}$'),
  department        text check (department ~ '^([0-9]{2,3}|2A|2B)$'),
  latitude          numeric(9, 6),
  longitude         numeric(9, 6),
  family            text not null check (family in ('direction-financiere', 'controle-gestion', 'comptabilite', 'audit',
                                                      'tresorerie', 'analyse-financiere', 'fiscalite')),
  contract          text not null check (contract in ('cdi', 'cdd', 'interim', 'stage', 'alternance', 'freelance', 'autre')),
  remote            text check (remote in ('non', 'partiel', 'total')),
  experience        text check (char_length(experience) <= 100),
  salary_min        int check (salary_min between 0 and 1000000),
  salary_max        int check (salary_max between 0 and 1000000),
  salary_text       text check (char_length(salary_text) <= 200),
  description       text not null check (char_length(description) between 50 and 15000),
  apply_url         text check (apply_url ~ '^https?://'),
  apply_email       text check (apply_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source_url        text check (source_url ~ '^https?://'),
  status            text not null default 'draft'
                    check (status in ('draft', 'awaiting_payment', 'pending_review', 'published', 'rejected', 'expired')),
  featured          boolean not null default false,
  reject_reason     text check (char_length(reject_reason) <= 1000),
  reviewed_by       uuid references auth.users (id),
  reviewed_at       timestamptz,
  posted_by_member  uuid references public.members (id) on delete set null,
  source_created_at timestamptz,
  published_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max),
  unique (site_id, slug)
);
create unique index job_offers_external_uniq on public.job_offers (source, external_id) where external_id is not null;
create index job_offers_public_idx on public.job_offers (site_id, status, featured desc, published_at desc);
create index job_offers_member_idx on public.job_offers (posted_by_member);
create trigger job_offers_touch before update on public.job_offers for each row execute function public.touch_updated_at();
create trigger audit_job_offers after insert or update or delete on public.job_offers for each row execute function public.audit_trigger();

create table public.job_orders (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.job_offers (id) on delete cascade,
  member_id          uuid references public.members (id) on delete set null,
  product_code       text not null references public.job_products (code),
  amount_cents       int not null check (amount_cents > 0),
  status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id  text unique,
  stripe_payment_intent text,
  stripe_invoice_id  text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);
create index job_orders_job_idx on public.job_orders (job_id);

-- ---------------------------------------------------------------------------
-- Publication : une personne éditrice, et une annonce payée pour les dépôts des inscrits
-- ---------------------------------------------------------------------------
create or replace function public.guard_job_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare days int;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    -- Fonction en security definer : current_user vaut toujours le propriétaire. On teste donc le rôle de la requête
    -- (« none » = maintenance directe en base, jamais via l'API ; service_role et anon sont refusés).
    if not (coalesce(nullif(current_setting('role', true), ''), 'none') = 'none'
            or (auth.uid() is not null and public.user_is_human_editor(auth.uid()))) then
      raise exception 'Seule une personne éditrice peut publier une offre d''emploi' using errcode = '42501';
    end if;
    if new.source = 'member' then
      select p.duration_days into days from job_orders o join job_products p on p.code = o.product_code
       where o.job_id = new.id and o.status = 'paid' order by o.paid_at desc limit 1;
      if days is null then
        raise exception 'Annonce non payée : publication impossible' using errcode = 'P0001';
      end if;
      new.expires_at := now() + make_interval(days => days);
    else
      new.expires_at := coalesce(new.expires_at, now() + interval '7 days');
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();
  end if;
  if new.status = 'rejected' and (tg_op = 'INSERT' or old.status is distinct from 'rejected') then
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger job_offers_guard before insert or update on public.job_offers
  for each row execute function public.guard_job_publication();

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
alter table public.job_products enable row level security;
alter table public.job_offers enable row level security;
alter table public.job_orders enable row level security;
revoke all on public.job_products, public.job_offers, public.job_orders from anon, authenticated;

grant select on public.job_products to anon, authenticated;
create policy job_products_read on public.job_products for select using (active);

-- Public : offres publiées et non expirées, colonnes publiques seulement
grant select (id, site_id, source, slug, title, company_name, provider_id, city, postal_code, department, latitude, longitude,
              family, contract, remote, experience, salary_min, salary_max, salary_text, description, apply_url, apply_email,
              source_url, status, featured, source_created_at, published_at, expires_at, updated_at)
  on public.job_offers to anon;
create policy job_offers_public_read on public.job_offers for select to anon
  using (status = 'published' and expires_at > now());

-- Équipe : lecture de tout ; seuls les éditeurs relisent (publier, refuser, retirer)
grant select, update on public.job_offers to authenticated;
create policy job_offers_staff_read on public.job_offers for select to authenticated using (public.is_staff());
create policy job_offers_editor_update on public.job_offers for update to authenticated
  using (public.has_role('editor')) with check (public.has_role('editor'));

grant select on public.job_orders to authenticated;
create policy job_orders_admin_read on public.job_orders for select to authenticated using (public.has_role('admin'));

-- Publication en masse des offres importées en attente (éditeurs seulement)
create or replace function public.approve_imported_jobs(p_site uuid, p_family text default null)
returns int language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.has_role('editor') then
    raise exception 'Seul un éditeur peut publier des offres' using errcode = '42501';
  end if;
  update public.job_offers set status = 'published'
   where site_id = p_site and source = 'france_travail' and status = 'pending_review'
     and (p_family is null or family = p_family) and (expires_at is null or expires_at > now());
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.approve_imported_jobs(uuid, text) from public, anon;
grant execute on function public.approve_imported_jobs(uuid, text) to authenticated;

-- Import France Travail (serveur seulement) : nouvelle offre en attente de relecture ; offre connue mise à jour
-- et prolongée de 7 jours ; une offre expirée qui revient repasse en relecture.
create or replace function public.upsert_imported_jobs(p_site uuid, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into job_offers (site_id, source, external_id, slug, title, company_name, city, postal_code, department, latitude, longitude,
                          family, contract, experience, salary_min, salary_max, salary_text, description, apply_url, source_url,
                          source_created_at, status, expires_at)
  select p_site, 'france_travail', r.external_id, r.slug, r.title, r.company_name, r.city, r.postal_code, r.department, r.latitude, r.longitude,
         r.family, r.contract, r.experience, r.salary_min, r.salary_max, r.salary_text, r.description, r.apply_url, r.source_url,
         r.source_created_at, 'pending_review', now() + interval '7 days'
    from jsonb_to_recordset(p_rows) as r(external_id text, slug text, title text, company_name text, city text, postal_code text,
         department text, latitude numeric, longitude numeric, family text, contract text, experience text, salary_min int,
         salary_max int, salary_text text, description text, apply_url text, source_url text, source_created_at timestamptz)
  on conflict (source, external_id) where external_id is not null do update set
    title = excluded.title, company_name = excluded.company_name, city = excluded.city, postal_code = excluded.postal_code,
    department = excluded.department, latitude = excluded.latitude, longitude = excluded.longitude, family = excluded.family,
    contract = excluded.contract, experience = excluded.experience, salary_min = excluded.salary_min, salary_max = excluded.salary_max,
    salary_text = excluded.salary_text, description = excluded.description, apply_url = excluded.apply_url,
    source_url = excluded.source_url, expires_at = now() + interval '7 days',
    status = case when job_offers.status = 'expired' then 'pending_review' else job_offers.status end;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.upsert_imported_jobs(uuid, jsonb) from public, anon, authenticated;

-- Expiration quotidienne (appelée par /api/cron/purge)
create or replace function public.expire_jobs()
returns int language sql security definer set search_path = public as $$
  with u as (update job_offers set status = 'expired' where status = 'published' and expires_at <= now() returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.expire_jobs() from public, anon, authenticated;
