-- Droits sur keyword_questions (0900)
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create or replace function pg_temp.reset() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); end;
$$;

select ok((select count(*) from public.keyword_questions) > 0, 'questions Semrush chargées');

set local role anon;
select is((select count(*)::int from public.keyword_questions), 0, 'anon : aucune question lisible');
select pg_temp.reset();

select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select ok((select count(*) from public.keyword_questions) > 0, 'agent : lit les questions (contexte de rédaction)');
select pg_temp.reset();

select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$ insert into public.keyword_questions (site_id, cluster, question) values ('10000000-0000-4000-a000-000000000001', 'x', 'test commercial ?') $$,
  '42501', null, 'commercial : ne modifie pas les questions');
select pg_temp.reset();

select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select lives_ok($$ insert into public.keyword_questions (site_id, cluster, question) values ('10000000-0000-4000-a000-000000000001', 'x', 'test éditeur ?') $$,
  'éditeur : ajoute une question');

select * from finish();
rollback;
