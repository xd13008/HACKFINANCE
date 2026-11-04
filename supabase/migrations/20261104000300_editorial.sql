-- =============================================================================
-- 0300 · Éditorial : tests, notes, contenus versionnés, file de validation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tests réels et notes
-- ---------------------------------------------------------------------------
create type public.test_status as enum ('draft', 'completed', 'validated', 'withdrawn');

create table public.test_runs (
  id               uuid primary key default gen_random_uuid(),
  software_id      uuid not null references public.software (id) on delete cascade,
  category_id      uuid not null references public.categories (id),
  tester_id        uuid not null references auth.users (id),
  tested_at        date not null,
  product_version  text,
  protocol         text not null,                       -- scénario de test suivi
  -- Preuves : [{ "label": "Capture import FEC", "path": "evidence/…" }]
  evidence         jsonb not null default '[]'::jsonb,
  verdict          text,
  pros             text[] not null default '{}',
  cons             text[] not null default '{}',
  best_for         text,
  status           public.test_status not null default 'draft',
  validated_by     uuid references auth.users (id),
  validated_at     timestamptz,
  is_fictional     boolean not null default false,
  requested_by_vendor boolean not null default false,   -- test demandé (et éventuellement payé) par l'éditeur
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index test_runs_sw_idx on public.test_runs (software_id, category_id, status);

create table public.scores (
  id            uuid primary key default gen_random_uuid(),
  test_run_id   uuid not null references public.test_runs (id) on delete cascade,
  criterion_key text not null,
  score         numeric(3, 1) not null check (score between 0 and 10),
  justification text not null,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  validated_by  uuid references auth.users (id),
  validated_at  timestamptz,
  unique (test_run_id, criterion_key)
);

create trigger test_runs_touch before update on public.test_runs
  for each row execute function public.touch_updated_at();

-- Règle 1 : une note publiée référence un test réel validé et un valideur humain.
create or replace function public.guard_score_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tr public.test_runs;
begin
  if new.status = 'published' then
    select * into tr from public.test_runs where id = new.test_run_id;
    if tr.status <> 'validated' then
      raise exception 'Une note publiée doit référencer un test validé (test % en statut %)', tr.id, tr.status;
    end if;
    if jsonb_array_length(tr.evidence) = 0 then
      raise exception 'Une note publiée doit référencer un test réel (preuves manquantes)';
    end if;
    if new.validated_by is null or not public.user_is_human_editor(new.validated_by) then
      raise exception 'Une note publiée doit avoir un valideur humain (rôle éditeur)';
    end if;
  end if;
  return new;
end;
$$;
create trigger scores_guard before insert or update on public.scores
  for each row execute function public.guard_score_publication();

-- Un test ne passe en « validé » que via validate_test_run().
create or replace function public.guard_test_status()
returns trigger language plpgsql as $$
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status <> 'validated')
     and coalesce(current_setting('app.workflow', true), '') <> 'on' then
    raise exception 'Utiliser validate_test_run() pour valider un test';
  end if;
  return new;
end;
$$;
create trigger test_runs_guard before insert or update on public.test_runs
  for each row execute function public.guard_test_status();

create or replace function public.validate_test_run(p_test_run uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  tr public.test_runs;
  missing text[];
begin
  if not public.user_is_human_editor(auth.uid()) then
    raise exception 'Seul un éditeur humain peut valider un test';
  end if;
  select * into tr from public.test_runs where id = p_test_run for update;
  if tr.id is null then raise exception 'Test introuvable'; end if;
  if tr.status <> 'completed' then
    raise exception 'Le test doit être au statut « completed » (actuellement %)', tr.status;
  end if;
  if jsonb_array_length(tr.evidence) = 0 then
    raise exception 'Impossible de valider un test sans preuve';
  end if;

  -- Tous les critères de la catégorie doivent être notés.
  select array_agg(c ->> 'key') into missing
  from public.categories cat, jsonb_array_elements(cat.criteria) c
  where cat.id = tr.category_id
    and not exists (select 1 from public.scores s where s.test_run_id = tr.id and s.criterion_key = c ->> 'key');
  if missing is not null then
    raise exception 'Critères non notés : %', array_to_string(missing, ', ');
  end if;

  perform set_config('app.workflow', 'on', true);

  -- L'ancien test validé du même logiciel/catégorie est retiré.
  update public.test_runs set status = 'withdrawn'
  where software_id = tr.software_id and category_id = tr.category_id
    and status = 'validated' and id <> tr.id;

  update public.test_runs
  set status = 'validated', validated_by = auth.uid(), validated_at = now()
  where id = tr.id;

  update public.scores
  set status = 'published', validated_by = auth.uid(), validated_at = now()
  where test_run_id = tr.id;

  update public.software set status = 'published' where id = tr.software_id and status = 'draft';

  perform set_config('app.workflow', 'off', true);
  perform public.audit_workflow('validate_test_run', 'test_runs', tr.id, jsonb_build_object('software_id', tr.software_id));
end;
$$;
revoke execute on function public.validate_test_run(uuid) from public, anon;

create trigger audit_test_runs after insert or update or delete on public.test_runs
  for each row execute function public.audit_trigger();
create trigger audit_scores after insert or update or delete on public.scores
  for each row execute function public.audit_trigger();

-- Note globale par logiciel × catégorie, calculée uniquement à partir des notes publiées.
create view public.software_category_scores with (security_invoker = true) as
  select
    tr.software_id,
    tr.category_id,
    tr.id as test_run_id,
    tr.tested_at,
    tr.validated_at,
    tr.validated_by,
    tr.tester_id,
    tr.requested_by_vendor,
    round(sum(s.score * (c ->> 'weight')::numeric) / 100.0, 1) as overall_score,
    jsonb_object_agg(s.criterion_key, s.score) as criteria_scores
  from public.test_runs tr
  join public.categories cat on cat.id = tr.category_id
  join lateral jsonb_array_elements(cat.criteria) c on true
  join public.scores s on s.test_run_id = tr.id and s.criterion_key = c ->> 'key' and s.status = 'published'
  where tr.status = 'validated'
  group by tr.id;

-- Classement éditorial : ne dépend que des notes. Aucune table commerciale n'y participe.
create view public.editorial_rankings with (security_invoker = true) as
  select
    scs.*,
    rank() over (partition by scs.category_id order by scs.overall_score desc) as editorial_rank
  from public.software_category_scores scs
  join public.software sw on sw.id = scs.software_id and sw.status = 'published';

-- ---------------------------------------------------------------------------
-- Contenus versionnés
-- ---------------------------------------------------------------------------
create type public.content_type as enum (
  'home', 'software_review', 'pricing', 'alternatives', 'category_ranking', 'facet_landing',
  'duel', 'guide', 'pillar', 'simulator', 'resource', 'provider_directory', 'glossary', 'page'
);
create type public.item_status as enum ('draft', 'published', 'unpublished', 'blocked');
create type public.version_status as enum ('draft', 'submitted', 'approved', 'superseded');

create table public.content_items (
  id                 uuid primary key default gen_random_uuid(),
  site_id            uuid not null references public.sites (id) on delete cascade,
  type               public.content_type not null,
  -- Slug selon le type : logiciel (software_review/pricing/alternatives), 'categorie' (classement),
  -- 'categorie/facette' (landing), 'a-vs-b' (duel), sinon slug libre.
  slug               text not null check (slug ~ '^[a-z0-9-]+(/[a-z0-9-]+)?$' or (type = 'home' and slug = '')),
  path               text generated always as (
    case type
      when 'home'               then '/'
      when 'software_review'    then '/logiciels/' || slug
      when 'pricing'            then '/logiciels/' || slug || '/prix'
      when 'alternatives'       then '/logiciels/' || slug || '/alternatives'
      when 'category_ranking'   then '/meilleurs-logiciels/' || slug
      when 'facet_landing'      then '/meilleurs-logiciels/' || slug
      when 'duel'               then '/comparer/' || slug
      when 'guide'              then '/guides/' || slug
      when 'pillar'             then '/dossiers/' || slug
      when 'simulator'          then '/outils/' || slug
      when 'resource'           then '/ressources/' || slug
      when 'provider_directory' then '/prestataires/' || slug
      when 'glossary'           then '/lexique/' || slug
      else '/' || slug
    end
  ) stored,
  title              text not null,                -- titre interne
  software_id        uuid references public.software (id) on delete cascade,
  software_b_id      uuid references public.software (id) on delete cascade,   -- duel
  category_id        uuid references public.categories (id) on delete set null,
  facet_id           uuid references public.facets (id) on delete set null,
  cluster            text,                          -- cluster SEO (hub & spoke)
  pillar_id          uuid references public.content_items (id) on delete set null,
  robots             text not null default 'index' check (robots in ('index', 'noindex')),
  status             public.item_status not null default 'draft',
  published_version_id uuid,
  first_published_at timestamptz,
  published_at       timestamptz,
  review_due_at      timestamptz,
  blocked_reason     text,
  is_fictional       boolean not null default false,
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (site_id, type, slug),
  check (type <> 'duel' or (software_id is not null and software_b_id is not null and software_id <> software_b_id)),
  check (type not in ('software_review', 'pricing', 'alternatives') or software_id is not null),
  check (type not in ('category_ranking', 'facet_landing', 'provider_directory') or category_id is not null)
);
create unique index content_items_path_idx on public.content_items (site_id, path);
create index content_items_status_idx on public.content_items (site_id, status, type);

create table public.content_versions (
  id               uuid primary key default gen_random_uuid(),
  content_item_id  uuid not null references public.content_items (id) on delete cascade,
  version_no       int not null,
  meta_title       text not null default '',
  meta_description text not null default '',
  h1               text not null default '',
  summary          text not null default '',          -- réponse directe en tête de page (GEO)
  body             text not null default '',          -- Markdown
  faq              jsonb not null default '[]'::jsonb, -- [{ "q": "...", "a": "..." }]
  data             jsonb not null default '{}'::jsonb, -- données propres au gabarit (verdict de duel, config simulateur…)
  status           public.version_status not null default 'draft',
  author_id        uuid references auth.users (id),
  author_kind      text not null default 'human' check (author_kind in ('human', 'agent')),
  submitted_at     timestamptz,
  decided_by       uuid references auth.users (id),
  decided_at       timestamptz,
  decision_comment text,
  seo_report       jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (content_item_id, version_no)
);

alter table public.content_items
  add constraint content_items_published_version_fk
  foreign key (published_version_id) references public.content_versions (id) on delete set null;

create table public.content_sources (
  id                 uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.content_versions (id) on delete cascade,
  url                text not null check (url ~ '^https?://'),
  title              text,
  accessed_at        date not null,
  excerpt            text           -- passage concerné
);

-- Numérotation automatique des versions.
create or replace function public.set_version_no()
returns trigger language plpgsql as $$
begin
  if new.version_no is null or new.version_no = 0 then
    select coalesce(max(version_no), 0) + 1 into new.version_no
    from public.content_versions where content_item_id = new.content_item_id;
  end if;
  return new;
end;
$$;
create trigger content_versions_no before insert on public.content_versions
  for each row execute function public.set_version_no();

-- Les colonnes de statut ne changent que via les fonctions de workflow.
create or replace function public.guard_workflow_columns()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.workflow', true), '') = 'on' then
    return new;
  end if;
  if tg_table_name = 'content_items' then
    if tg_op = 'INSERT' then
      if new.status <> 'draft' or new.published_version_id is not null then
        raise exception 'Un contenu est créé en brouillon';
      end if;
    elsif new.status is distinct from old.status
       or new.published_version_id is distinct from old.published_version_id
       or new.published_at is distinct from old.published_at
       or new.first_published_at is distinct from old.first_published_at
       or new.blocked_reason is distinct from old.blocked_reason then
      raise exception 'Statut de publication modifiable uniquement via la file de validation';
    end if;
  elsif tg_table_name = 'content_versions' then
    if tg_op = 'INSERT' then
      if new.status <> 'draft' then
        raise exception 'Une version est créée en brouillon';
      end if;
    else
      if old.status <> 'draft' then
        raise exception 'Seule une version en brouillon est modifiable';
      end if;
      if new.status is distinct from old.status
         or new.decided_by is distinct from old.decided_by
         or new.decided_at is distinct from old.decided_at then
        raise exception 'Statut de version modifiable uniquement via la file de validation';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger content_items_guard before insert or update on public.content_items
  for each row execute function public.guard_workflow_columns();
create trigger content_versions_guard before insert or update on public.content_versions
  for each row execute function public.guard_workflow_columns();
create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();
create trigger content_versions_touch before update on public.content_versions
  for each row execute function public.touch_updated_at();

create trigger audit_content_items after insert or update or delete on public.content_items
  for each row execute function public.audit_trigger();
create trigger audit_content_versions after insert or update or delete on public.content_versions
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Tâches de revue (validation, conformité, qualité, SEO, fraîcheur, signalements)
-- ---------------------------------------------------------------------------
create table public.review_tasks (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid references public.sites (id) on delete cascade,
  kind             text not null check (kind in ('validation', 'compliance', 'qa_report', 'seo', 'freshness', 'error_report', 'veille', 'listing')),
  content_item_id  uuid references public.content_items (id) on delete cascade,
  content_version_id uuid references public.content_versions (id) on delete cascade,
  software_id      uuid references public.software (id) on delete cascade,
  reason           text not null,
  details          jsonb not null default '{}'::jsonb,
  blocking         boolean not null default false,   -- bloque l'approbation tant qu'ouverte
  assigned_to      uuid references auth.users (id),
  status           text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  decision         text,
  comment          text,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  closed_at        timestamptz
);
create index review_tasks_open_idx on public.review_tasks (status, kind);
create trigger audit_review_tasks after insert or update or delete on public.review_tasks
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Workflow : approuver, rejeter, bloquer, dépublier
-- ---------------------------------------------------------------------------
create or replace function public.review_interval(t public.content_type)
returns interval language sql immutable as $$
  select case
    when t in ('software_review', 'pricing', 'alternatives', 'category_ranking', 'facet_landing', 'duel') then interval '90 days'
    when t in ('guide', 'pillar', 'simulator', 'resource', 'provider_directory') then interval '180 days'
    else interval '365 days'
  end;
$$;

create or replace function public.approve_version(p_version uuid, p_comment text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v public.content_versions;
  it public.content_items;
begin
  if not public.user_is_human_editor(auth.uid()) then
    raise exception 'Seul un éditeur humain peut approuver une publication';
  end if;

  select * into v from public.content_versions where id = p_version for update;
  if v.id is null then raise exception 'Version introuvable'; end if;
  if v.status <> 'submitted' then
    raise exception 'Seule une version soumise peut être approuvée (statut : %)', v.status;
  end if;

  select * into it from public.content_items where id = v.content_item_id for update;
  if it.status = 'blocked' then
    raise exception 'Contenu bloqué par la conformité : %', coalesce(it.blocked_reason, '');
  end if;
  if exists (
    select 1 from public.review_tasks
    where content_item_id = it.id and status = 'open' and blocking
  ) then
    raise exception 'Une tâche bloquante (conformité ou qualité) est encore ouverte';
  end if;
  if it.software_id is not null and not exists (
    select 1 from public.software where id = it.software_id and status = 'published'
  ) then
    raise exception 'Le logiciel lié doit être publié';
  end if;

  perform set_config('app.workflow', 'on', true);

  update public.content_versions set status = 'superseded'
  where content_item_id = it.id and status = 'approved';

  update public.content_versions
  set status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_comment = p_comment
  where id = v.id;

  update public.content_items
  set status = 'published',
      published_version_id = v.id,
      published_at = now(),
      first_published_at = coalesce(first_published_at, now()),
      review_due_at = now() + public.review_interval(it.type)
  where id = it.id;

  update public.review_tasks
  set status = 'done', decision = 'approved', closed_at = now(), comment = coalesce(p_comment, comment)
  where content_version_id = v.id and kind = 'validation' and status = 'open';

  perform set_config('app.workflow', 'off', true);
  perform public.audit_workflow('approve', 'content_versions', v.id,
    jsonb_build_object('content_item_id', it.id, 'path', it.path, 'comment', p_comment));
end;
$$;

-- Un rejet renvoie la version en brouillon, avec le motif.
create or replace function public.reject_version(p_version uuid, p_comment text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v public.content_versions;
begin
  if not (public.user_is_human_editor(auth.uid()) or (public.has_role('compliance') and not public.is_agent())) then
    raise exception 'Seul un éditeur ou la conformité peut rejeter';
  end if;
  if coalesce(trim(p_comment), '') = '' then
    raise exception 'Un motif de rejet est obligatoire';
  end if;
  select * into v from public.content_versions where id = p_version for update;
  if v.status <> 'submitted' then
    raise exception 'Seule une version soumise peut être rejetée';
  end if;

  perform set_config('app.workflow', 'on', true);
  update public.content_versions
  set status = 'draft', submitted_at = null, decision_comment = p_comment
  where id = v.id;
  update public.review_tasks
  set status = 'done', decision = 'rejected', comment = p_comment, closed_at = now()
  where content_version_id = v.id and kind = 'validation' and status = 'open';
  perform set_config('app.workflow', 'off', true);

  perform public.audit_workflow('reject', 'content_versions', v.id, jsonb_build_object('comment', p_comment));
end;
$$;

create or replace function public.block_item(p_item uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('compliance') or public.is_agent() then
    raise exception 'Seule la conformité peut bloquer une publication';
  end if;
  perform set_config('app.workflow', 'on', true);
  update public.content_items set status = 'blocked', blocked_reason = p_reason where id = p_item;
  perform set_config('app.workflow', 'off', true);
  perform public.audit_workflow('block', 'content_items', p_item, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.unblock_item(p_item uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('compliance') or public.is_agent() then
    raise exception 'Seule la conformité peut débloquer une publication';
  end if;
  perform set_config('app.workflow', 'on', true);
  update public.content_items
  set status = case when published_version_id is not null then 'published'::public.item_status else 'draft' end,
      blocked_reason = null
  where id = p_item and status = 'blocked';
  perform set_config('app.workflow', 'off', true);
  perform public.audit_workflow('unblock', 'content_items', p_item, '{}'::jsonb);
end;
$$;

create or replace function public.unpublish_item(p_item uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.user_is_human_editor(auth.uid()) then
    raise exception 'Seul un éditeur peut dépublier';
  end if;
  perform set_config('app.workflow', 'on', true);
  update public.content_items set status = 'unpublished' where id = p_item and status = 'published';
  perform set_config('app.workflow', 'off', true);
  perform public.audit_workflow('unpublish', 'content_items', p_item, jsonb_build_object('reason', p_reason));
end;
$$;

revoke execute on function public.approve_version(uuid, text) from public, anon;
revoke execute on function public.reject_version(uuid, text) from public, anon;
revoke execute on function public.block_item(uuid, text) from public, anon;
revoke execute on function public.unblock_item(uuid) from public, anon;
revoke execute on function public.unpublish_item(uuid, text) from public, anon;
grant execute on function public.approve_version(uuid, text) to authenticated;
grant execute on function public.reject_version(uuid, text) to authenticated;
grant execute on function public.block_item(uuid, text) to authenticated;
grant execute on function public.unblock_item(uuid) to authenticated;
grant execute on function public.unpublish_item(uuid, text) to authenticated;
grant execute on function public.validate_test_run(uuid) to authenticated;

-- Vue publique : seules les versions approuvées des contenus publiés.
create view public.published_content with (security_invoker = true) as
  select
    i.id, i.site_id, i.type, i.slug, i.path, i.software_id, i.software_b_id, i.category_id, i.facet_id,
    i.cluster, i.pillar_id, i.robots, i.first_published_at, i.published_at, i.is_fictional,
    v.id as version_id, v.version_no, v.meta_title, v.meta_description, v.h1, v.summary, v.body, v.faq, v.data,
    v.author_id, v.author_kind, v.decided_by as validated_by, v.decided_at as validated_at, v.updated_at as content_updated_at
  from public.content_items i
  join public.content_versions v on v.id = i.published_version_id
  where i.status = 'published';

-- ---------------------------------------------------------------------------
-- RLS et privilèges
-- ---------------------------------------------------------------------------
alter table public.test_runs        enable row level security;
alter table public.scores           enable row level security;
alter table public.content_items    enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_sources  enable row level security;
alter table public.review_tasks     enable row level security;

create policy test_runs_read on public.test_runs
  for select using (status = 'validated' or public.is_staff() or public.is_agent());
-- Un test validé est figé : pour le modifier, on en crée un nouveau.
create policy test_runs_editor_insert on public.test_runs
  for insert to authenticated with check (public.has_role('editor') and status in ('draft', 'completed'));
create policy test_runs_editor_update on public.test_runs
  for update to authenticated
  using (public.has_role('editor') and status in ('draft', 'completed'))
  with check (public.has_role('editor') and status in ('draft', 'completed'));
create policy test_runs_editor_delete on public.test_runs
  for delete to authenticated using (public.has_role('editor') and status in ('draft', 'completed'));

create policy scores_read on public.scores
  for select using (status = 'published' or public.is_staff() or public.is_agent());
-- Notes : éditeur uniquement, et seulement tant que la note est en brouillon.
create policy scores_editor_insert on public.scores
  for insert to authenticated with check (public.has_role('editor') and status = 'draft');
create policy scores_editor_update on public.scores
  for update to authenticated using (public.has_role('editor') and status = 'draft')
  with check (public.has_role('editor') and status = 'draft');
create policy scores_editor_delete on public.scores
  for delete to authenticated using (public.has_role('editor') and status = 'draft');

create policy content_items_read on public.content_items
  for select using (status = 'published' or public.is_staff() or public.is_agent());
create policy content_items_insert on public.content_items
  for insert to authenticated with check (public.has_role('editor') or public.is_agent());
create policy content_items_update on public.content_items
  for update to authenticated using (public.has_role('editor')) with check (public.has_role('editor'));
create policy content_items_delete on public.content_items
  for delete to authenticated using (public.has_role('editor') and status = 'draft' and published_version_id is null);

create policy content_versions_read on public.content_versions
  for select using (
    public.is_staff() or public.is_agent()
    or exists (select 1 from public.content_items i where i.published_version_id = content_versions.id and i.status = 'published')
  );
create policy content_versions_insert on public.content_versions
  for insert to authenticated with check (
    status = 'draft' and (
      (public.has_role('editor') and author_kind = 'human')
      or (public.is_agent() and author_kind = 'agent' and author_id = auth.uid())
    )
  );
create policy content_versions_update on public.content_versions
  for update to authenticated
  using (status = 'draft' and (public.has_role('editor') or (public.is_agent() and author_id = auth.uid())))
  with check (status = 'draft' and (public.has_role('editor') or (public.is_agent() and author_id = auth.uid())));
create policy content_versions_delete on public.content_versions
  for delete to authenticated using (status = 'draft' and public.has_role('editor'));

create policy content_sources_read on public.content_sources
  for select using (
    public.is_staff() or public.is_agent()
    or exists (
      select 1 from public.content_items i
      where i.published_version_id = content_sources.content_version_id and i.status = 'published'
    )
  );
create policy content_sources_write on public.content_sources
  for all to authenticated
  using (
    exists (select 1 from public.content_versions v where v.id = content_version_id and v.status = 'draft')
    and (public.has_role('editor') or public.is_agent())
  )
  with check (
    exists (select 1 from public.content_versions v where v.id = content_version_id and v.status = 'draft')
    and (public.has_role('editor') or public.is_agent())
  );

create policy review_tasks_staff_read on public.review_tasks
  for select to authenticated using (public.is_staff());
create policy review_tasks_staff_write on public.review_tasks
  for all to authenticated
  using (public.has_role('editor') or public.has_role('compliance') or public.has_role('admin'))
  with check (public.has_role('editor') or public.has_role('compliance') or public.has_role('admin'));
create policy review_tasks_agent_insert on public.review_tasks
  for insert to authenticated
  with check (public.is_agent() and kind in ('qa_report', 'veille', 'seo') and created_by = auth.uid());
