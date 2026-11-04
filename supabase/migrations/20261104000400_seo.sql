-- =============================================================================
-- 0400 · Moteur SEO : mots-clés cibles, briefs, checklist bloquante, redirections, GSC
-- =============================================================================

create table public.keyword_targets (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  keyword          text not null,
  volume           int not null default 0,
  cpc_eur          numeric(8, 2) not null default 0,
  kd               int not null default 0 check (kd between 0 and 100),
  intent           text not null default 'informational'
                   check (intent in ('informational', 'commercial', 'transactional', 'navigational')),
  cluster          text,
  -- Score de priorité : volume × (1 + CPC/5) × poids d'intention ÷ (KD + 10)
  priority         numeric(12, 2) generated always as (
    round(
      volume * (1 + cpc_eur / 5.0)
      * (case when intent in ('commercial', 'transactional') then 1.5 else 1.0 end)
      / (kd + 10.0), 2)
  ) stored,
  target_content_id uuid references public.content_items (id) on delete set null,
  status           text not null default 'todo' check (status in ('todo', 'in_progress', 'published', 'ranking', 'ignored')),
  current_position numeric(5, 1),
  source           text not null default 'semrush',
  refreshed_at     timestamptz not null default now(),
  unique (site_id, keyword)
);
-- Un mot-clé principal ↔ une seule page cible (anti-cannibalisation).
create unique index keyword_targets_one_page on public.keyword_targets (target_content_id, keyword);
create index keyword_targets_priority_idx on public.keyword_targets (site_id, priority desc);

alter table public.content_items
  add column primary_keyword_id uuid unique references public.keyword_targets (id) on delete set null;

create table public.seo_briefs (
  id                 uuid primary key default gen_random_uuid(),
  content_item_id    uuid not null unique references public.content_items (id) on delete cascade,
  primary_keyword    text not null,
  secondary_keywords text[] not null default '{}',
  questions          text[] not null default '{}',      -- People also ask
  outline            jsonb not null default '[]'::jsonb, -- [{ "level": 2, "text": "..." }]
  entities           text[] not null default '{}',
  competitors        jsonb not null default '[]'::jsonb, -- top 10 : [{ "domain": "...", "url": "..." }]
  target_words       int,
  required_links     uuid[] not null default '{}',       -- content_items à lier obligatoirement
  cta                text,
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger seo_briefs_touch before update on public.seo_briefs
  for each row execute function public.touch_updated_at();

create table public.redirects (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete cascade,
  from_path   text not null check (from_path ~ '^/'),
  to_path     text not null check (to_path ~ '^/'),
  status_code int not null default 301 check (status_code in (301, 302, 308, 410)),
  reason      text,
  created_at  timestamptz not null default now(),
  unique (site_id, from_path),
  check (from_path <> to_path)
);

-- Changement de slug d'un contenu déjà publié → 301 automatique, sans chaîne.
create or replace function public.redirect_on_path_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.path is distinct from old.path and old.first_published_at is not null then
    update public.redirects set to_path = new.path
      where site_id = new.site_id and to_path = old.path;
    delete from public.redirects where site_id = new.site_id and from_path = new.path;
    insert into public.redirects (site_id, from_path, to_path, reason)
      values (new.site_id, old.path, new.path, 'slug modifié')
      on conflict (site_id, from_path) do update set to_path = excluded.to_path;
  end if;
  return new;
end;
$$;
create trigger content_items_redirect after update of slug, type on public.content_items
  for each row execute function public.redirect_on_path_change();

create table public.gsc_metrics (
  site_id     uuid not null references public.sites (id) on delete cascade,
  date        date not null,
  page        text not null,
  query       text not null,
  clicks      int not null default 0,
  impressions int not null default 0,
  ctr         numeric(6, 4) not null default 0,
  position    numeric(6, 2) not null default 0,
  primary key (site_id, date, page, query)
);

-- ---------------------------------------------------------------------------
-- Checklist SEO — source unique, appelée à la soumission et affichée en back-office
-- ---------------------------------------------------------------------------
create or replace function public.seo_check(p_version uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v public.content_versions;
  it public.content_items;
  kw text;
  br public.seo_briefs;
  checks jsonb := '[]'::jsonb;
  first_words text;
  internal_links int;
  src_count int;
  dup int;
  needs_links boolean;
  needs_sources boolean;
  missing_required int;

begin
  select * into v from public.content_versions where id = p_version;
  if v.id is null then raise exception 'Version introuvable'; end if;
  select * into it from public.content_items where id = v.content_item_id;
  select keyword into kw from public.keyword_targets where id = it.primary_keyword_id;
  select * into br from public.seo_briefs where content_item_id = it.id;

  needs_links   := it.type in ('guide', 'pillar', 'resource', 'simulator');
  needs_sources := it.type in ('guide', 'pillar', 'software_review', 'pricing', 'alternatives', 'duel', 'category_ranking', 'facet_landing');

  checks := checks || jsonb_build_object('code', 'meta_title_length', 'blocking', true,
    'ok', char_length(v.meta_title) between 15 and 60,
    'message', format('Title entre 15 et 60 caractères (%s)', char_length(v.meta_title)));

  checks := checks || jsonb_build_object('code', 'meta_description_length', 'blocking', true,
    'ok', char_length(v.meta_description) between 70 and 155,
    'message', format('Meta description entre 70 et 155 caractères (%s)', char_length(v.meta_description)));

  checks := checks || jsonb_build_object('code', 'h1_present', 'blocking', true,
    'ok', char_length(trim(v.h1)) > 0, 'message', 'H1 renseigné');

  checks := checks || jsonb_build_object('code', 'no_h1_in_body', 'blocking', true,
    'ok', v.body !~ '(^|\n)# ', 'message', 'Pas de second H1 dans le corps (utiliser ##)');

  checks := checks || jsonb_build_object('code', 'summary_present', 'blocking', false,
    'ok', char_length(trim(v.summary)) >= 80,
    'message', 'Réponse directe en tête de page (80 caractères min.)');

  if it.type not in ('home', 'page') then
    checks := checks || jsonb_build_object('code', 'primary_keyword_set', 'blocking', true,
      'ok', kw is not null, 'message', 'Mot-clé principal associé (plan de production)');
  end if;

  if kw is not null then
    checks := checks || jsonb_build_object('code', 'keyword_in_h1', 'blocking', true,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(v.h1))) > 0,
      'message', format('Le H1 contient « %s »', kw));
    checks := checks || jsonb_build_object('code', 'keyword_in_title', 'blocking', false,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(v.meta_title))) > 0,
      'message', format('Le title contient « %s »', kw));
    first_words := array_to_string((regexp_split_to_array(trim(v.summary || ' ' || v.body), '\s+'))[1:100], ' ');
    checks := checks || jsonb_build_object('code', 'keyword_early', 'blocking', false,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(first_words))) > 0,
      'message', 'Mot-clé dans les 100 premiers mots');
  end if;

  select count(*) into dup
  from public.content_items i2 join public.content_versions v2 on v2.id = i2.published_version_id
  where i2.site_id = it.site_id and i2.id <> it.id and i2.status = 'published'
    and lower(v2.meta_title) = lower(v.meta_title);
  checks := checks || jsonb_build_object('code', 'meta_title_unique', 'blocking', true,
    'ok', dup = 0, 'message', 'Title unique sur le portail');

  if needs_links then
    select count(*) into internal_links from regexp_matches(v.body, '\]\(/[^)]*\)', 'g');
    checks := checks || jsonb_build_object('code', 'internal_links', 'blocking', true,
      'ok', internal_links >= 3, 'message', format('Au moins 3 liens internes dans le corps (%s)', internal_links));
  end if;

  if br.id is not null and array_length(br.required_links, 1) > 0 then
    select count(*) into missing_required
    from public.content_items ri
    where ri.id = any (br.required_links) and position('](' || ri.path || ')' in v.body) = 0;
    checks := checks || jsonb_build_object('code', 'required_links', 'blocking', true,
      'ok', missing_required = 0, 'message', format('Liens imposés par le brief présents (%s manquant(s))', missing_required));
  end if;

  if needs_sources then
    select count(*) into src_count from public.content_sources where content_version_id = v.id;
    checks := checks || jsonb_build_object('code', 'sources', 'blocking', true,
      'ok', src_count >= 1, 'message', format('Au moins une source datée (%s)', src_count));
  end if;

  if br.id is not null and array_length(br.questions, 1) > 0 then
    checks := checks || jsonb_build_object('code', 'faq', 'blocking', false,
      'ok', jsonb_array_length(v.faq) >= 2, 'message', 'FAQ prévue par le brief (2 questions min.)');
  end if;

  if br.id is not null and br.target_words is not null then
    checks := checks || jsonb_build_object('code', 'length', 'blocking', false,
      'ok', array_length(regexp_split_to_array(trim(v.body), '\s+'), 1) >= br.target_words * 0.8,
      'message', format('Longueur proche de la cible (%s mots)', br.target_words));
  end if;

  checks := checks || jsonb_build_object('code', 'images_alt', 'blocking', true,
    'ok', v.body !~ '!\[\]\(', 'message', 'Toutes les images ont un texte alternatif');

  return jsonb_build_object(
    'passed', not exists (
      select 1 from jsonb_array_elements(checks) c where (c ->> 'blocking')::boolean and not (c ->> 'ok')::boolean
    ),
    'checks', checks
  );
end;
$$;
grant execute on function public.seo_check(uuid) to authenticated;

-- Soumission à la file de validation : bloquée si la checklist SEO échoue.
create or replace function public.submit_version(p_version uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v public.content_versions;
  it public.content_items;
  report jsonb;
begin
  select * into v from public.content_versions where id = p_version for update;
  if v.id is null then raise exception 'Version introuvable'; end if;
  if not (public.has_role('editor') or (public.is_agent() and v.author_id = auth.uid())) then
    raise exception 'Droits insuffisants pour soumettre';
  end if;
  if v.status <> 'draft' then
    raise exception 'Seul un brouillon peut être soumis';
  end if;

  report := public.seo_check(p_version);
  if not (report ->> 'passed')::boolean then
    raise exception 'Checklist SEO non conforme : %', (
      select string_agg(c ->> 'message', ' · ')
      from jsonb_array_elements(report -> 'checks') c
      where (c ->> 'blocking')::boolean and not (c ->> 'ok')::boolean
    ) using errcode = 'P0001';
  end if;

  select * into it from public.content_items where id = v.content_item_id;

  perform set_config('app.workflow', 'on', true);
  update public.content_versions
  set status = 'submitted', submitted_at = now(), seo_report = report
  where id = v.id;
  perform set_config('app.workflow', 'off', true);

  insert into public.review_tasks (site_id, kind, content_item_id, content_version_id, reason, created_by)
  values (it.site_id, 'validation', it.id, v.id, 'Version ' || v.version_no || ' soumise', auth.uid());

  perform public.audit_workflow('submit', 'content_versions', v.id, report);
  return report;
end;
$$;
revoke execute on function public.submit_version(uuid) from public, anon;
grant execute on function public.submit_version(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Maillage interne : pages publiées et leurs liens entrants depuis le corps
-- ---------------------------------------------------------------------------
create view public.internal_link_stats with (security_invoker = true) as
  with pages as (
    select id, site_id, path, type, body from public.published_content
  ), links as (
    select p.site_id, p.id as from_id, (regexp_matches(p.body, '\]\((/[^)#?\s]*)', 'g'))[1] as to_path
    from pages p
  )
  select
    p.id, p.site_id, p.path, p.type,
    (select count(distinct l.from_id) from links l where l.site_id = p.site_id and l.to_path = p.path and l.from_id <> p.id) as inbound_body_links,
    (select count(*) from links l where l.from_id = p.id) as outbound_body_links
  from pages p;

-- Contenus à revoir (fraîcheur)
create view public.stale_content with (security_invoker = true) as
  select i.id, i.site_id, i.type, i.path, i.title, i.review_due_at, i.published_at
  from public.content_items i
  where i.status = 'published' and i.review_due_at is not null and i.review_due_at < now() + interval '14 days';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.keyword_targets enable row level security;
alter table public.seo_briefs      enable row level security;
alter table public.redirects       enable row level security;
alter table public.gsc_metrics     enable row level security;

create policy keyword_targets_staff_read on public.keyword_targets
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy keyword_targets_editor_write on public.keyword_targets
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy seo_briefs_staff_read on public.seo_briefs
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy seo_briefs_editor_write on public.seo_briefs
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy redirects_public_read on public.redirects for select using (true);
create policy redirects_editor_write on public.redirects
  for all to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));

create policy gsc_staff_read on public.gsc_metrics
  for select to authenticated using (public.is_staff() or public.is_agent());
create policy gsc_admin_write on public.gsc_metrics
  for all to authenticated
  using (public.has_role('admin') or public.has_role('editor'))
  with check (public.has_role('admin') or public.has_role('editor'));
