-- =============================================================================
-- 0800 · Agents (V2), preuves de test (Storage privé), Search Console
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Search Console : propriété par portail (ex. "sc-domain:dafradar.fr")
-- ---------------------------------------------------------------------------
alter table public.sites add column if not exists gsc_property text;

-- Met à jour la position courante des mots-clés suivis à partir de Search Console.
create or replace function public.refresh_keyword_positions(p_site uuid, p_days int default 28)
returns int
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if not (public.has_role('admin') or public.has_role('editor') or auth.uid() is null) then
    raise exception 'Droits insuffisants';
  end if;
  with pos as (
    select lower(query) as q, round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as p
    from public.gsc_metrics
    where site_id = p_site and date >= current_date - p_days
    group by lower(query)
  ), upd as (
    update public.keyword_targets k
    set current_position = pos.p,
        status = case when k.status = 'published' and pos.p <= 20 then 'ranking' else k.status end
    from pos where k.site_id = p_site and lower(k.keyword) = pos.q
    returning 1
  )
  select count(*) into n from upd;
  return n;
end;
$$;
revoke execute on function public.refresh_keyword_positions(uuid, int) from public, anon;
grant execute on function public.refresh_keyword_positions(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Agents : un agent met à jour ses propres exécutions ; plafonds de coût
-- ---------------------------------------------------------------------------
create policy agent_runs_agent_read on public.agent_runs
  for select to authenticated using (public.is_agent() and started_by = auth.uid());
create policy agent_runs_agent_update on public.agent_runs
  for update to authenticated
  using (public.is_agent() and started_by = auth.uid())
  with check (public.is_agent() and started_by = auth.uid());

-- L'agent relit ses propres rapports (pour ne pas contrôler deux fois la même version).
create policy review_tasks_agent_read on public.review_tasks
  for select to authenticated using (public.is_agent() and created_by = auth.uid());

alter table public.agent_runs add column if not exists target_id uuid;
alter table public.agent_runs add column if not exists triggered_by uuid references auth.users (id);

-- Dépense du mois en cours pour un agent (contrôle du plafond mensuel avant chaque exécution).
create or replace function public.agent_month_cost(p_agent text)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(cost_usd), 0) from public.agent_runs
  where agent = p_agent and created_at >= date_trunc('month', now());
$$;
grant execute on function public.agent_month_cost(text) to authenticated;

insert into public.agent_settings (agent, enabled, max_cost_per_run, max_cost_per_month, allowed_domains) values
  ('veille', false, 0.50, 30, '{}'),
  ('redaction', false, 1.50, 60, '{}'),
  ('controle_qualite', false, 0.50, 30, '{}')
on conflict (agent) do nothing;

-- ---------------------------------------------------------------------------
-- Preuves de test : bucket privé, lecture et écriture réservées aux éditeurs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'video/mp4'])
on conflict (id) do nothing;

create policy evidence_editor_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (public.has_role('editor') or public.has_role('compliance')));
create policy evidence_editor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.has_role('editor'));
create policy evidence_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidence' and public.has_role('editor'));
