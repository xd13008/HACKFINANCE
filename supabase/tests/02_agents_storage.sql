-- Droits ajoutés en 0800 : exécutions d'agents, preuves (Storage), positions Search Console
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;
create or replace function pg_temp.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;
create or replace function pg_temp.affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute format('with u as (%s returning 1) select count(*) from u', q) into n;
  return n;
end;
$$;
grant execute on function pg_temp.affected(text) to anon, authenticated;

-- Une exécution lancée par un humain (admin) et une par l'agent
insert into public.agent_runs (id, agent, started_by) values
  ('77000000-0000-4000-a000-000000000001', 'veille', '00000000-0000-4000-a000-000000000001');

-- Agent ---------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select lives_ok($$ insert into public.agent_runs (id, agent, started_by) values ('77000000-0000-4000-a000-000000000002', 'veille', auth.uid()) $$,
  'agent : journalise sa propre exécution');
select is(pg_temp.affected('update public.agent_runs set status = ''succeeded'', cost_usd = 0.12 where id = ''77000000-0000-4000-a000-000000000002'''), 1,
  'agent : met à jour sa propre exécution');
select is(pg_temp.affected('update public.agent_runs set cost_usd = 0 where id = ''77000000-0000-4000-a000-000000000001'''), 0,
  'agent : ne modifie pas une exécution qui n''est pas la sienne');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('evidence', 'x/agent.png') $$, '42501', null,
  'agent : ne dépose pas de preuve');
select ok(public.agent_month_cost('veille') >= 0.12, 'agent_month_cost() cumule les coûts du mois');

-- Commercial ----------------------------------------------------------------
select pg_temp.reset();
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('evidence', 'x/sales.png') $$, '42501', null,
  'commercial : ne dépose pas de preuve de test');
select throws_ok($$ select public.refresh_keyword_positions('10000000-0000-4000-a000-000000000001') $$, 'P0001', null,
  'commercial : ne met pas à jour les positions SEO');

-- Éditeur -------------------------------------------------------------------
select pg_temp.reset();
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('evidence', '30000000-0000-4000-a000-000000000001/capture.png') $$,
  'éditeur : dépose une preuve');
select ok(public.refresh_keyword_positions('10000000-0000-4000-a000-000000000001') >= 1, 'éditeur : positions mises à jour depuis Search Console');

-- Visiteur ------------------------------------------------------------------
select pg_temp.reset();
select pg_temp.as_anon();
select is((select count(*)::int from storage.objects where bucket_id = 'evidence'), 0, 'anon : aucune preuve lisible');

select * from finish();
rollback;
