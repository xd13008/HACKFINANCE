-- =============================================================================
-- 0900 · Questions des internautes (Semrush « People also ask ») par cluster
-- Alimente les FAQ et les plans des briefs SEO, et le contexte de l'agent de rédaction.
-- =============================================================================

create table public.keyword_questions (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  cluster    text not null,
  question   text not null,
  volume     int not null default 0,
  source     text not null default 'semrush',
  used_in    uuid references public.content_items (id) on delete set null,   -- contenu qui y répond
  created_at timestamptz not null default now(),
  unique (site_id, question)
);
create index keyword_questions_cluster_idx on public.keyword_questions (site_id, cluster, volume desc);

alter table public.keyword_questions enable row level security;

create policy keyword_questions_read on public.keyword_questions
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy keyword_questions_editor_write on public.keyword_questions
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
