-- Synthèse rédigée des avis tiers (« Ce que disent les utilisateurs ») et note de chaque avis cité.
-- La synthèse est préparée par l'agent à partir des seuls avis cités et relevés (review_sources / review_quotes),
-- puis validée par un éditeur humain. Elle reste distincte de la note éditoriale (test de la rédaction).

alter table public.review_quotes
  add column rating numeric(3, 1) check (rating is null or (rating >= 0 and rating <= 10));
comment on column public.review_quotes.rating is 'Note donnée par l''auteur de l''avis, sur l''échelle de la plateforme (review_sources.rating_scale).';

create table public.review_summaries (
  id            uuid primary key default gen_random_uuid(),
  software_id   uuid references public.software (id) on delete cascade,
  provider_id   uuid references public.providers (id) on delete cascade,
  summary       text not null check (char_length(summary) between 200 and 1500),
  likes         text[] not null default '{}' check (cardinality(likes) <= 6),
  watchouts     text[] not null default '{}' check (cardinality(watchouts) <= 6),
  based_on      int not null check (based_on > 0),             -- nombre d'avis lus pour la synthèse
  period_start  date,                                          -- période couverte par les avis lus
  period_end    date,
  status        public.fact_status not null default 'draft',
  author_kind   text not null default 'human' check (author_kind in ('human', 'agent')),
  created_by    uuid references auth.users (id),
  validated_by  uuid references auth.users (id),
  validated_at  timestamptz,
  created_at    timestamptz not null default now(),
  check ((software_id is not null) <> (provider_id is not null)),
  -- Une synthèse honnête mentionne les deux côtés quand elle liste des points
  check (cardinality(likes) = 0 or cardinality(watchouts) > 0)
);
create index review_summaries_target_idx on public.review_summaries (software_id, provider_id, status, created_at desc);
comment on table public.review_summaries is 'Synthèse rédigée des avis tiers cités ; points appréciés et points de vigilance ; validation humaine.';

create trigger review_summaries_guard before insert or update on public.review_summaries
  for each row execute function public.guard_review_validation();
create trigger audit_review_summaries after insert or update or delete on public.review_summaries
  for each row execute function public.audit_trigger();

alter table public.review_summaries enable row level security;
create policy review_summaries_read on public.review_summaries
  for select using (status = 'validated' or public.is_staff() or public.is_agent());
create policy review_summaries_editor_write on public.review_summaries
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
create policy review_summaries_agent_insert on public.review_summaries
  for insert to authenticated
  with check (public.is_agent() and status = 'draft' and author_kind = 'agent' and created_by = auth.uid());

grant select on public.review_summaries to anon, authenticated;
grant insert, update, delete on public.review_summaries to authenticated;
