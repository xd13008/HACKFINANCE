-- =============================================================================
-- 2000 · Agent de vérification des offres d'emploi (annonces payantes et France Travail)
-- Décision du dirigeant (11/11/2026) : la relecture des offres d'emploi est déléguée à un agent.
-- Garde-fous imposés par la base :
-- - l'agent ne modifie aucune offre directement : il passe par agent_review_job(), qui journalise chaque décision ;
-- - il ne publie que si un administrateur humain a activé la publication automatique (job_settings.auto_publish) ;
--   sinon sa décision reste une recommandation ;
-- - une annonce payante n'est publiable qu'une fois payée (inchangé) ; le doute (« escalate ») reste en attente humaine ;
-- - périmètre limité aux offres d'emploi : les contenus éditoriaux restent soumis aux règles 1 et 4 (aucune publication par un agent).
-- =============================================================================

alter table public.job_offers add column if not exists universe_slug text
  check (universe_slug in ('comptabilite-conformite', 'tresorerie-cash', 'depenses-achats', 'encaissement', 'pilotage-performance',
                           'equipe-expertise', 'financement-aides-risques', 'rse-performance-durable'));
create index if not exists job_offers_universe_idx on public.job_offers (site_id, universe_slug) where status = 'published';

create table public.job_settings (
  site_id      uuid primary key references public.sites (id) on delete cascade,
  auto_publish boolean not null default false,
  updated_by   uuid references auth.users (id),
  updated_at   timestamptz not null default now()
);
create trigger job_settings_touch before update on public.job_settings for each row execute function public.touch_updated_at();
create trigger audit_job_settings after insert or update or delete on public.job_settings for each row execute function public.audit_trigger();

create table public.job_reviews (
  id          bigserial primary key,
  job_id      uuid not null references public.job_offers (id) on delete cascade,
  reviewer    text not null check (reviewer in ('agent', 'rules')),
  verdict     text not null check (verdict in ('approve', 'reject', 'escalate')),
  universe_slug text,
  reasons     text[] not null default '{}' check (cardinality(reasons) <= 8),
  confidence  numeric(3, 2) check (confidence between 0 and 1),
  applied     boolean not null default false,          -- décision appliquée (publication automatique active)
  run_id      uuid references public.agent_runs (id) on delete set null,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index job_reviews_job_idx on public.job_reviews (job_id, created_at desc);

-- Journal des agents : nouvel agent
alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs add constraint agent_runs_agent_check
  check (agent in ('veille', 'redaction', 'controle_qualite', 'opportunites_seo', 'verification_prestataires', 'verification_offres'));
insert into public.agent_settings (agent, enabled, max_cost_per_run, max_cost_per_month, allowed_domains)
values ('verification_offres', false, 3.00, 60, '{}') on conflict (agent) do nothing;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
alter table public.job_settings enable row level security;
alter table public.job_reviews enable row level security;
revoke all on public.job_settings, public.job_reviews from anon, authenticated;
grant select, insert, update on public.job_settings to authenticated;
create policy job_settings_read on public.job_settings for select to authenticated using (public.is_staff() or public.is_agent());
create policy job_settings_admin_insert on public.job_settings for insert to authenticated with check (public.has_role('admin'));
create policy job_settings_admin_update on public.job_settings for update to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
grant select on public.job_reviews to authenticated;
create policy job_reviews_read on public.job_reviews for select to authenticated using (public.is_staff() or public.is_agent());

-- L'agent lit les offres à vérifier (rien d'autre) ; il n'a aucun droit d'écriture direct sur job_offers.
create policy job_offers_agent_read on public.job_offers for select to authenticated
  using (public.is_agent() and status = 'pending_review');

-- ---------------------------------------------------------------------------
-- Publication : éditeur humain, ou agent avec une approbation journalisée à l'instant et la publication
-- automatique activée par un administrateur
-- ---------------------------------------------------------------------------
create or replace function public.guard_job_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare days int;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    -- Fonction en security definer : current_user vaut toujours le propriétaire. On teste donc le rôle de la requête
    -- (« none » = maintenance directe en base, jamais via l'API ; service_role et anon sont refusés).
    if not (coalesce(nullif(current_setting('role', true), ''), 'none') = 'none'
            or (auth.uid() is not null and public.user_is_human_editor(auth.uid()))
            or (public.is_agent()
                and exists (select 1 from job_settings s where s.site_id = new.site_id and s.auto_publish)
                and exists (select 1 from job_reviews r where r.job_id = new.id and r.reviewer = 'agent' and r.verdict = 'approve' and r.applied
                              and r.created_by = auth.uid() and r.created_at > now() - interval '5 minutes'))) then
      raise exception 'Seule une personne éditrice, ou l''agent de vérification autorisé par un administrateur, peut publier une offre'
        using errcode = '42501';
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

-- Décision de l'agent : journalisée ; appliquée seulement si la publication automatique est active.
create or replace function public.agent_review_job(p_job uuid, p_verdict text, p_universe text, p_reasons text[],
  p_confidence numeric default null, p_run uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare j job_offers; auto boolean; applied boolean := false;
begin
  if not public.is_agent() then
    raise exception 'Réservé à l''agent de vérification' using errcode = '42501';
  end if;
  if p_verdict not in ('approve', 'reject', 'escalate') then
    raise exception 'Verdict inconnu' using errcode = '22023';
  end if;
  select * into j from job_offers where id = p_job for update;
  if not found or j.status <> 'pending_review' then return coalesce(j.status, 'introuvable'); end if;
  select coalesce(s.auto_publish, false) into auto from job_settings s where s.site_id = j.site_id;
  auto := coalesce(auto, false);
  applied := auto and p_verdict in ('approve', 'reject');
  insert into job_reviews (job_id, reviewer, verdict, universe_slug, reasons, confidence, applied, run_id, created_by)
  values (p_job, 'agent', p_verdict, p_universe, coalesce(p_reasons[1:8], '{}'), p_confidence, applied, p_run, auth.uid());
  if p_universe is not null then
    update job_offers set universe_slug = p_universe where id = p_job;
  end if;
  if applied and p_verdict = 'approve' then
    update job_offers set status = 'published', reject_reason = null where id = p_job;
  elsif applied and p_verdict = 'reject' then
    update job_offers set status = 'rejected',
      reject_reason = left(array_to_string(coalesce(p_reasons, '{}'), ' ; '), 1000) where id = p_job;
  end if;
  return (select status from job_offers where id = p_job);
end;
$$;
revoke all on function public.agent_review_job(uuid, text, text, text[], numeric, uuid) from public, anon;
grant execute on function public.agent_review_job(uuid, text, text, text[], numeric, uuid) to authenticated;

-- Import : l'univers calculé à l'import est enregistré
create or replace function public.upsert_imported_jobs(p_site uuid, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into job_offers (site_id, source, external_id, slug, title, company_name, city, postal_code, department, latitude, longitude,
                          family, universe_slug, contract, experience, salary_min, salary_max, salary_text, description, apply_url, source_url,
                          source_created_at, status, expires_at)
  select p_site, 'france_travail', r.external_id, r.slug, r.title, r.company_name, r.city, r.postal_code, r.department, r.latitude, r.longitude,
         r.family, r.universe_slug, r.contract, r.experience, r.salary_min, r.salary_max, r.salary_text, r.description, r.apply_url, r.source_url,
         r.source_created_at, 'pending_review', now() + interval '7 days'
    from jsonb_to_recordset(p_rows) as r(external_id text, slug text, title text, company_name text, city text, postal_code text,
         department text, latitude numeric, longitude numeric, family text, universe_slug text, contract text, experience text, salary_min int,
         salary_max int, salary_text text, description text, apply_url text, source_url text, source_created_at timestamptz)
  on conflict (source, external_id) where external_id is not null do update set
    title = excluded.title, company_name = excluded.company_name, city = excluded.city, postal_code = excluded.postal_code,
    department = excluded.department, latitude = excluded.latitude, longitude = excluded.longitude, family = excluded.family, universe_slug = excluded.universe_slug,
    contract = excluded.contract, experience = excluded.experience, salary_min = excluded.salary_min, salary_max = excluded.salary_max,
    salary_text = excluded.salary_text, description = excluded.description, apply_url = excluded.apply_url,
    source_url = excluded.source_url, expires_at = now() + interval '7 days',
    status = case when job_offers.status = 'expired' then 'pending_review' else job_offers.status end;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.upsert_imported_jobs(uuid, jsonb) from public, anon, authenticated;

-- Suivi des e-mails envoyés au recruteur (publication ou refus), pour ne prévenir qu'une fois
alter table public.job_offers add column if not exists notified_status text;

-- Public : l'univers de l'offre est affiché et filtrable
grant select (universe_slug) on public.job_offers to anon;
