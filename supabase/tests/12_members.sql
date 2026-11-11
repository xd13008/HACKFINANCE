-- DAF inscrits : profils, navigation et consentements lisibles par l'admin seulement — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

insert into public.members (id, site_id, email, status, job_title, consent_text, consent_at)
values ('14000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'daf@exemple.test', 'active', 'DAF', 'test', now());
insert into public.visitors (id, site_id, member_id, consent, consent_version, consented_at)
values ('14000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '14000000-0000-4000-a000-000000000001',
        '{"personalisation": true}', 'v1', now());
insert into public.visitor_events (visitor_id, event_type, path) values ('14000000-0000-4000-a000-000000000002', 'pageview', '/trouver');
insert into public.member_tokens (token_hash, member_id, kind, expires_at)
values (repeat('a', 64), '14000000-0000-4000-a000-000000000001', 'session', now() + interval '1 day');

-- Anonyme : aucun accès
set local role anon;
select throws_ok($$ select email from public.members $$, '42501', null, 'anon : ne lit pas les inscrits');
select throws_ok($$ select * from public.visitor_events $$, '42501', null, 'anon : ne lit pas la navigation');
select throws_ok($$ insert into public.members (site_id, email, consent_text, consent_at)
  values ('10000000-0000-4000-a000-000000000001', 'x@exemple.test', 't', now()) $$, '42501', null, 'anon : ne crée pas de compte directement');
select throws_ok($$ select public.purge_member_data() $$, '42501', null, 'anon : ne lance pas la purge');
reset role;

-- Éditeur, commercial, agent : rien
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select is((select count(*)::int from public.members), 0, 'éditeur : ne voit aucun inscrit');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select is((select count(*)::int from public.members), 0, 'commercial : ne voit aucun inscrit');
select is((select count(*)::int from public.visitor_events), 0, 'commercial : ne voit aucune navigation');
select throws_ok($$ update public.members set job_title = 'x' $$, '42501', null, 'commercial : ne modifie pas un profil');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select is((select count(*)::int from public.members), 0, 'agent : ne voit aucun inscrit');
reset role;

-- Admin : lecture seule ; jetons jamais lisibles
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select is((select count(*)::int from public.members where email = 'daf@exemple.test'), 1, 'admin : lit le profil');
select is((select count(*)::int from public.visitor_events e join public.visitors v on v.id = e.visitor_id
           where v.member_id = '14000000-0000-4000-a000-000000000001'), 1, 'admin : lit la navigation rattachée');
select throws_ok($$ select * from public.member_tokens $$, '42501', null, 'admin : ne lit pas les jetons de session');
select throws_ok($$ delete from public.members $$, '42501', null, 'admin : ne supprime pas en direct (passe par le serveur)');
reset role;

-- Effacement : la suppression du compte emporte navigation et jetons
delete from public.members where id = '14000000-0000-4000-a000-000000000001';
select is((select count(*)::int from public.visitor_events where visitor_id = '14000000-0000-4000-a000-000000000002'), 0,
  'Supprimer un inscrit efface sa navigation');

select * from finish();
rollback;
