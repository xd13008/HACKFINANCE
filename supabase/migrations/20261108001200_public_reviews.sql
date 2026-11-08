-- Avis publiés sur des plateformes tierces (G2, Capterra, Trustpilot, Google…), cités avec leur source.
-- Principe : CITER, pas copier (art. L122-5 3° CPI : courte citation, auteur et source indiqués ;
-- pas d'extraction substantielle d'une base d'avis, art. L342-1 CPI). Ces avis ne sont PAS vérifiés
-- par la rédaction (art. L111-7-2 C. conso) et n'entrent jamais dans la note éditoriale.
-- Circuit : un agent ou un éditeur propose en brouillon ; seul un éditeur humain valide ; seul le validé est public.

-- 1. Relevé de la note affichée par une plateforme, à une date donnée
create table public.review_sources (
  id            uuid primary key default gen_random_uuid(),
  software_id   uuid references public.software (id) on delete cascade,
  provider_id   uuid references public.providers (id) on delete cascade,
  platform      text not null check (platform in ('g2', 'capterra', 'getapp', 'trustpilot', 'google', 'app_store', 'play_store', 'appvizer', 'autre')),
  platform_name text,                                   -- libellé affiché si platform = 'autre'
  url           text not null check (url ~ '^https://'),
  rating        numeric(3, 2) check (rating >= 0),
  rating_scale  int not null default 5 check (rating_scale in (5, 10)),
  review_count  int check (review_count >= 0),
  captured_at   date not null,                          -- date du relevé (règle : aucun fait sans source datée)
  status        public.fact_status not null default 'draft',
  author_kind   text not null default 'human' check (author_kind in ('human', 'agent')),
  created_by    uuid references auth.users (id),
  validated_by  uuid references auth.users (id),
  validated_at  timestamptz,
  created_at    timestamptz not null default now(),
  check ((software_id is not null) <> (provider_id is not null)),
  check (rating is null or rating <= rating_scale),
  check (platform <> 'autre' or platform_name is not null)
);
create index review_sources_target_idx on public.review_sources (software_id, provider_id, status);

-- 2. Courte citation d'un avis, avec lien vers l'avis original
create table public.review_quotes (
  id               uuid primary key default gen_random_uuid(),
  review_source_id uuid not null references public.review_sources (id) on delete cascade,
  quote            text not null check (char_length(quote) between 20 and 300),  -- courte citation, jamais l'avis entier
  review_url       text not null check (review_url ~ '^https://'),
  author_label     text not null check (char_length(author_label) between 3 and 80), -- fonction et taille, jamais nom complet
  review_date      date not null,
  sentiment        text not null check (sentiment in ('positive', 'negative', 'mixed')),
  translated       boolean not null default false,       -- citation traduite par la rédaction
  status           public.fact_status not null default 'draft',
  author_kind      text not null default 'human' check (author_kind in ('human', 'agent')),
  created_by       uuid references auth.users (id),
  validated_by     uuid references auth.users (id),
  validated_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index review_quotes_source_idx on public.review_quotes (review_source_id, status);

comment on table public.review_sources is 'Notes affichées par des plateformes d''avis tierces, relevées à une date, lien obligatoire. Non vérifiées par la rédaction.';
comment on table public.review_quotes is 'Courtes citations d''avis tiers (300 caractères max.), lien vers l''avis original, auteur décrit par sa fonction (pas de nom).';

-- 3. Validation réservée à un éditeur humain (comme les faits)
create or replace function public.guard_review_validation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status is distinct from 'validated') then
    if auth.uid() is not null and not public.user_is_human_editor(auth.uid()) then
      raise exception 'Seul un éditeur humain peut valider un avis cité';
    end if;
    new.validated_by := coalesce(new.validated_by, auth.uid());
    new.validated_at := coalesce(new.validated_at, now());
  end if;
  return new;
end;
$$;
create trigger review_sources_guard before insert or update on public.review_sources
  for each row execute function public.guard_review_validation();
create trigger review_quotes_guard before insert or update on public.review_quotes
  for each row execute function public.guard_review_validation();
create trigger audit_review_sources after insert or update or delete on public.review_sources
  for each row execute function public.audit_trigger();
create trigger audit_review_quotes after insert or update or delete on public.review_quotes
  for each row execute function public.audit_trigger();

-- 4. Droits
alter table public.review_sources enable row level security;
alter table public.review_quotes  enable row level security;

create policy review_sources_read on public.review_sources
  for select using (status = 'validated' or public.is_staff() or public.is_agent());
create policy review_sources_editor_write on public.review_sources
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
create policy review_sources_agent_insert on public.review_sources
  for insert to authenticated
  with check (public.is_agent() and status = 'draft' and author_kind = 'agent' and created_by = auth.uid());

-- Une citation n'est publique que si son relevé l'est aussi
create policy review_quotes_read on public.review_quotes
  for select using (
    (status = 'validated' and exists (select 1 from public.review_sources s where s.id = review_source_id and s.status = 'validated'))
    or public.is_staff() or public.is_agent());
create policy review_quotes_editor_write on public.review_quotes
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
create policy review_quotes_agent_insert on public.review_quotes
  for insert to authenticated
  with check (public.is_agent() and status = 'draft' and author_kind = 'agent' and created_by = auth.uid());

grant select on public.review_sources, public.review_quotes to anon, authenticated;
grant insert, update, delete on public.review_sources, public.review_quotes to authenticated;
