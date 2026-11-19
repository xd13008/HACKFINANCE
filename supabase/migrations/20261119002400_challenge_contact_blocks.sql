-- =============================================================================
-- 2400 · Écrans de la maquette validée (11/11/2026) : « Challenger ma solution » (écran 8),
--        mise en relation (écran 4), blocs fonctionnels d'une catégorie (écran 13)
-- Règles :
-- - aucune donnée n'est transmise à un éditeur ou un cabinet sans l'accord explicite du visiteur, solution par solution ;
-- - écriture serveur seulement (clé de service, lib/leads.ts), après contrôle ; lecture réservée à l'équipe (admin, commercial) ;
-- - pas de mise en relation dans les sujets réglementés (règle 5) : contrôlé côté serveur et par la base (guard_contact_target) ;
-- - le baromètre de satisfaction n'est publié qu'à partir de 30 réponses, anonyme et agrégé.
-- =============================================================================

-- Écran 8 : réponses au parcours « Challenger »
create table public.challenge_responses (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  target_type      text not null check (target_type in ('software', 'provider', 'spreadsheet')),
  software_id      uuid references public.software (id) on delete set null,
  provider_id      uuid references public.providers (id) on delete set null,
  category_id      uuid references public.categories (id) on delete set null,
  satisfaction     int not null check (satisfaction between 0 and 10),
  reasons          text[] not null default '{}' check (cardinality(reasons) <= 12),
  contract_end     text check (contract_end in ('moins-3-mois', '3-12-mois', 'inconnu')),
  company_size     text check (company_size in ('tpe', 'pme1', 'pme2', 'eti')),
  company          text check (company is null or char_length(company) <= 200),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent_comparison boolean not null check (consent_comparison),   -- envoi du comparatif : obligatoire
  consent_contact_ids uuid[] not null default '{}',                  -- alternatives qu'il accepte d'entendre (optionnel)
  consent_reminder boolean not null default false,                   -- rappel avant l'échéance (optionnel)
  consent_text     text not null,
  consent_at       timestamptz not null default now(),
  mail_status      text not null default 'pending' check (mail_status in ('pending', 'sent', 'failed')),
  created_at       timestamptz not null default now()
);
create index challenge_responses_target_idx on public.challenge_responses (software_id, provider_id);

-- Écran 4 : demandes de mise en relation
create table public.contact_requests (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  category_id    uuid references public.categories (id) on delete set null,
  need           text not null check (char_length(need) between 10 and 2000),
  company        text not null check (char_length(company) between 2 and 200),
  company_size   text not null check (company_size in ('tpe', 'pme1', 'pme2', 'eti')),
  contact_name   text not null check (char_length(contact_name) between 2 and 120),
  job_title      text check (job_title is null or char_length(job_title) <= 120),
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone          text check (phone is null or phone ~ '^[0-9 +().-]{6,25}$'),
  timing         text check (timing in ('immediat', '3-mois', '6-mois', 'information')),
  budget         text check (budget in ('moins-100', '100-250', '250-500', 'plus-500', 'inconnu')),
  consent_newsletter boolean not null default false,
  consent_feedback   boolean not null default false,
  consent_text   text not null,
  consent_at     timestamptz not null default now(),
  status         text not null default 'new' check (status in ('new', 'transmitted', 'closed', 'spam')),
  handled_by     uuid references auth.users (id),
  handled_at     timestamptz,
  origin_path    text,
  created_at     timestamptz not null default now()
);
create index contact_requests_status_idx on public.contact_requests (site_id, status, created_at desc);

-- Une ligne par solution que le visiteur a explicitement cochée : rien d'autre n'est transmis.
create table public.contact_request_targets (
  request_id   uuid not null references public.contact_requests (id) on delete cascade,
  software_id  uuid references public.software (id) on delete cascade,
  provider_id  uuid references public.providers (id) on delete cascade,
  transmitted_at timestamptz,
  check ((software_id is null) <> (provider_id is null))
);
create unique index contact_request_targets_uniq on public.contact_request_targets (request_id, coalesce(software_id, provider_id));

-- Règle 5 : aucune mise en relation vers une catégorie d'un sujet réglementé (univers « Financement, aides & risques »).
create or replace function public.guard_contact_target()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.category_id is not null and exists (
       select 1 from categories c join verticals v on v.id = c.vertical_id
        where c.id = new.category_id and v.slug = 'financement-aides-risques') then
    raise exception 'Pas de mise en relation sur un sujet réglementé (crédit, financement, assurance)' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger contact_requests_guard before insert or update of category_id on public.contact_requests
  for each row execute function public.guard_contact_target();

-- Écran 13 : blocs fonctionnels d'une catégorie (référentiel éditorial, texte validé par un éditeur).
-- Les constats par logiciel sont des faits software_facts de type « bloc_<code> » : { "level": "inclus|option|absent",
-- "how": "constat du test", "plan": "offre" }, validés par un éditeur comme les autres faits.
create table public.category_blocks (
  category_id uuid not null references public.categories (id) on delete cascade,
  code        text not null check (code ~ '^[a-z0-9_]+$'),
  label       text not null,
  why         text,
  advice      text,
  sort        int not null default 0,
  primary key (category_id, code)
);
create trigger audit_category_blocks after insert or update or delete on public.category_blocks
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
alter table public.challenge_responses enable row level security;
alter table public.contact_requests enable row level security;
alter table public.contact_request_targets enable row level security;
alter table public.category_blocks enable row level security;
revoke all on public.challenge_responses, public.contact_requests, public.contact_request_targets, public.category_blocks from anon, authenticated;

-- Réponses et demandes : écriture par le serveur seulement (clé de service) ; lecture par l'équipe admin et commerciale.
grant select on public.challenge_responses to authenticated;
create policy challenge_responses_read on public.challenge_responses for select to authenticated using (public.has_role('admin'));
grant select, update on public.contact_requests to authenticated;
grant select, update on public.contact_request_targets to authenticated;
create policy contact_requests_read on public.contact_requests for select to authenticated
  using (public.has_role('admin') or public.has_role('sales'));
create policy contact_requests_update on public.contact_requests for update to authenticated
  using (public.has_role('admin') or public.has_role('sales')) with check (public.has_role('admin') or public.has_role('sales'));
create policy contact_request_targets_read on public.contact_request_targets for select to authenticated
  using (public.has_role('admin') or public.has_role('sales'));
create policy contact_request_targets_update on public.contact_request_targets for update to authenticated
  using (public.has_role('admin') or public.has_role('sales')) with check (public.has_role('admin') or public.has_role('sales'));

-- Blocs : lecture publique, écriture éditeur (le commercial ne touche pas au contenu, règle 3).
grant select on public.category_blocks to anon, authenticated;
grant insert, update, delete on public.category_blocks to authenticated;
create policy category_blocks_read on public.category_blocks for select using (true);
create policy category_blocks_write on public.category_blocks for all to authenticated
  using (public.has_role('editor')) with check (public.has_role('editor'));

-- Baromètre de satisfaction (écran 8) : moyenne publiée à partir de 30 réponses, rien de nominatif.
create or replace function public.satisfaction_barometer(p_software uuid default null, p_provider uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when count(*) >= 30 then jsonb_build_object('n', count(*), 'avg', round(avg(satisfaction)::numeric, 1)) else jsonb_build_object('n', count(*)) end
    from challenge_responses
   where (p_software is not null and software_id = p_software) or (p_provider is not null and provider_id = p_provider);
$$;
revoke all on function public.satisfaction_barometer(uuid, uuid) from public;
grant execute on function public.satisfaction_barometer(uuid, uuid) to anon, authenticated;

-- Durée de conservation (CNIL, prospection B2B) : 3 ans après la demande ; appelée chaque jour par /api/cron/purge.
create or replace function public.purge_lead_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int;
begin
  delete from challenge_responses where created_at < now() - interval '3 years'; get diagnostics a = row_count;
  delete from contact_requests where created_at < now() - interval '3 years'; get diagnostics b = row_count;
  return jsonb_build_object('challenge_responses', a, 'contact_requests', b);
end;
$$;
revoke execute on function public.purge_lead_data() from public, anon, authenticated;
