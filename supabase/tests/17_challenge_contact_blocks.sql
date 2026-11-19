-- Challenger, mise en relation, blocs fonctionnels (migration 2400) : droits et garde-fous — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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
create or replace function pg_temp.affected(q text) returns int language plpgsql as $f$
declare n int;
begin
  execute format('with u as (%s returning 1) select count(*) from u', q) into n;
  return n;
end;
$f$;
grant execute on function pg_temp.affected(text) to authenticated;

insert into public.categories (id, site_id, kind, name, slug, criteria, status, vertical_id) values
  ('12000000-0000-4000-a000-0000000000c1', '10000000-0000-4000-a000-000000000001', 'software', 'Test blocs', 'test-blocs', '[]', 'published', null),
  ('12000000-0000-4000-a000-0000000000c2', '10000000-0000-4000-a000-000000000001', 'software', 'Test crédit', 'test-credit', '[]', 'draft',
   (select id from public.verticals where slug = 'financement-aides-risques' and site_id = '10000000-0000-4000-a000-000000000001'));
insert into public.contact_requests (id, site_id, category_id, need, company, company_size, contact_name, email, consent_text)
values ('17000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-0000000000c1',
        'Besoin d''un logiciel de trésorerie', 'Société test', 'pme1', 'Contact test', 'contact@exemple.test', 'accord');
insert into public.challenge_responses (site_id, target_type, satisfaction, email, consent_comparison, consent_text)
select '10000000-0000-4000-a000-000000000001', 'spreadsheet', 6, 'r' || g || '@exemple.test', true, 'accord' from generate_series(1, 2) g;

-- Règle 5 : pas de mise en relation sur un sujet réglementé
select throws_ok($$ insert into public.contact_requests (site_id, category_id, need, company, company_size, contact_name, email, consent_text)
  values ('10000000-0000-4000-a000-000000000001', '12000000-0000-4000-a000-0000000000c2', 'Besoin d''un crédit de trésorerie', 'X', 'pme1', 'Y', 'y@exemple.test', 'accord') $$,
  '42501', null, 'mise en relation refusée sur un sujet réglementé');
select throws_ok($$ insert into public.challenge_responses (site_id, target_type, satisfaction, email, consent_comparison, consent_text)
  values ('10000000-0000-4000-a000-000000000001', 'spreadsheet', 5, 'z@exemple.test', false, 'x') $$,
  '23514', null, 'le comparatif n''est envoyé qu''avec l''accord du visiteur');

-- Public : rien de lisible ni d'écrivable, sauf les blocs et le baromètre agrégé
select pg_temp.as_anon();
select throws_ok($$ select * from public.contact_requests $$, '42501', null, 'anon : demandes illisibles');
select throws_ok($$ select * from public.challenge_responses $$, '42501', null, 'anon : réponses illisibles');
select throws_ok($$ insert into public.contact_requests (site_id, need, company, company_size, contact_name, email, consent_text)
  values ('10000000-0000-4000-a000-000000000001', 'Besoin quelconque ici', 'X', 'pme1', 'Y', 'y@exemple.test', 'a') $$, '42501', null,
  'anon : aucune écriture directe (serveur seulement)');
select lives_ok($$ select * from public.category_blocks $$, 'anon : blocs fonctionnels lisibles');
select is(public.satisfaction_barometer(null, null)->'avg', null, 'anon : pas de moyenne sous 30 réponses');
reset role;

-- Équipe : le commercial traite les demandes, l'éditeur non ; seuls les admins lisent les réponses Challenger
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select is((select count(*)::int from public.contact_requests where id = '17000000-0000-4000-a000-000000000001'), 1, 'commercial : lit les demandes');
select is((select count(*)::int from public.challenge_responses), 0, 'commercial : ne lit pas les réponses Challenger');
select throws_ok($$ insert into public.category_blocks (category_id, code, label) values ('12000000-0000-4000-a000-0000000000c1', 'x', 'X') $$,
  '42501', null, 'commercial : ne modifie pas les blocs (règle 3)');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select is((select count(*)::int from public.contact_requests), 0, 'éditeur : ne lit pas les demandes');
select lives_ok($$ insert into public.category_blocks (category_id, code, label, why) values ('12000000-0000-4000-a000-0000000000c1', 'banques', 'Connexions bancaires', 'Pourquoi') $$,
  'éditeur : écrit un bloc');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select is(pg_temp.affected($$ update public.category_blocks set label = 'x' $$), 0, 'agent : ne modifie pas les blocs');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select is((select count(*)::int from public.challenge_responses where target_type = 'spreadsheet' and email like 'r%@exemple.test'), 2, 'admin : lit les réponses Challenger');
reset role;

-- Baromètre : publié à partir de 30 réponses
insert into public.software (id, vendor, name, slug, status) values ('14000000-0000-4000-a000-0000000000b1', 'T', 'Outil baromètre', 'outil-barometre', 'published');
insert into public.challenge_responses (site_id, target_type, software_id, satisfaction, email, consent_comparison, consent_text)
select '10000000-0000-4000-a000-000000000001', 'software', '14000000-0000-4000-a000-0000000000b1', 7, 'b' || g || '@exemple.test', true, 'a' from generate_series(1, 29) g;
select is(public.satisfaction_barometer('14000000-0000-4000-a000-0000000000b1')->'avg', null, '29 réponses : pas de moyenne publiée');
insert into public.challenge_responses (site_id, target_type, software_id, satisfaction, email, consent_comparison, consent_text)
values ('10000000-0000-4000-a000-000000000001', 'software', '14000000-0000-4000-a000-0000000000b1', 7, 'b30@exemple.test', true, 'a');
select is(public.satisfaction_barometer('14000000-0000-4000-a000-0000000000b1'), '{"n": 30, "avg": 7.0}'::jsonb, '30 réponses : moyenne publiée, sans donnée nominative');

-- Revue de sécurité (migration 2500) : le commercial traite la demande, sans toucher aux destinataires ni à la preuve
insert into public.contact_request_targets (request_id, software_id) values ('17000000-0000-4000-a000-000000000001', '14000000-0000-4000-a000-0000000000b1');
insert into public.software (id, vendor, name, slug, status) values ('14000000-0000-4000-a000-0000000000b2', 'U', 'Autre éditeur', 'autre-editeur', 'published');
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$ update public.contact_request_targets set software_id = '14000000-0000-4000-a000-0000000000b2' where request_id = '17000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'commercial : ne change pas le destinataire coché par le visiteur');
select throws_ok($$ update public.contact_requests set consent_text = 'autre accord' where id = '17000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'commercial : ne réécrit pas la preuve de consentement');
select throws_ok($$ update public.contact_requests set email = 'autre@exemple.test' where id = '17000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'commercial : ne modifie pas les coordonnées du visiteur');
select is(pg_temp.affected($$ update public.contact_request_targets set transmitted_at = now() where request_id = '17000000-0000-4000-a000-000000000001' $$), 1,
  'commercial : horodate la transmission');
select is(pg_temp.affected($$ update public.contact_requests set status = 'transmitted', handled_at = now() where id = '17000000-0000-4000-a000-000000000001' $$), 1,
  'commercial : change le statut');
reset role;
select ok((select count(*) from public.audit_log where table_name in ('contact_requests', 'contact_request_targets') and row_id is not distinct from '17000000-0000-4000-a000-000000000001' or (table_name = 'contact_request_targets' and after ->> 'request_id' = '17000000-0000-4000-a000-000000000001')) >= 2,
  'chaque modification est journalisée');
update public.contact_request_targets set transmitted_at = null;
update public.contact_requests set status = 'spam' where id = '17000000-0000-4000-a000-000000000001';
select throws_ok($$ update public.contact_request_targets set transmitted_at = now() where request_id = '17000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'demande indésirable : aucune transmission');

select * from finish();
rollback;
