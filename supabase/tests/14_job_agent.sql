-- Agent de vérification des offres : décisions journalisées, publication seulement si un admin l'a autorisée — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
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

insert into public.job_products (code, label, amount_cents, duration_days) values ('test-30', 'Test', 1000, 30) on conflict do nothing;
insert into public.members (id, site_id, email, status, consent_text, consent_at)
values ('16000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'recruteur2@exemple.test', 'active', 't', now());
insert into public.job_offers (id, site_id, source, external_id, slug, title, family, contract, description, status, posted_by_member) values
  ('16000000-0000-4000-a000-0000000000b1', '10000000-0000-4000-a000-000000000001', 'france_travail', 'A1', 'agent-ft-1', 'Comptable H/F', 'comptabilite', 'cdi', repeat('x', 60), 'pending_review', null),
  ('16000000-0000-4000-a000-0000000000b2', '10000000-0000-4000-a000-000000000001', 'france_travail', 'A2', 'agent-ft-2', 'Trésorier H/F', 'tresorerie', 'cdi', repeat('x', 60), 'pending_review', null),
  ('16000000-0000-4000-a000-0000000000b3', '10000000-0000-4000-a000-000000000001', 'member', null, 'agent-membre', 'DAF H/F', 'direction-financiere', 'cdi', repeat('x', 60), 'pending_review', '16000000-0000-4000-a000-000000000001'),
  ('16000000-0000-4000-a000-0000000000b4', '10000000-0000-4000-a000-000000000001', 'france_travail', 'A4', 'agent-ft-4', 'Auditeur H/F', 'audit', 'cdi', repeat('x', 60), 'published', null);
update public.job_offers set expires_at = now() + interval '3 days' where slug = 'agent-ft-4';
insert into public.job_orders (job_id, member_id, product_code, amount_cents, status, paid_at)
values ('16000000-0000-4000-a000-0000000000b3', '16000000-0000-4000-a000-000000000001', 'test-30', 1000, 'paid', now());
delete from public.job_settings where site_id = '10000000-0000-4000-a000-000000000001';

-- Agent : lit les offres à vérifier, rien d'autre, et ne modifie rien directement
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select is((select count(*)::int from public.job_offers where slug like 'agent-%'), 3, 'agent : ne lit que les offres en attente de vérification');
select is(pg_temp.affected($$ update public.job_offers set status = 'published' where slug = 'agent-ft-1' $$), 0, 'agent : aucune modification directe');
select throws_ok($$ select public.approve_imported_jobs('10000000-0000-4000-a000-000000000001') $$, '42501', null, 'agent : pas de publication en masse');
-- Publication automatique désactivée : la décision n'est qu'une recommandation
select is(public.agent_review_job('16000000-0000-4000-a000-0000000000b1', 'approve', 'comptabilite-conformite', array['Poste de comptable'], 0.95),
  'pending_review', 'agent : sans autorisation de l''admin, son approbation ne publie rien');
select throws_ok($$ insert into public.job_settings (site_id, auto_publish) values ('10000000-0000-4000-a000-000000000001', true) $$, '42501', null,
  'agent : ne peut pas s''autoriser lui-même');
reset role;

-- Commercial et éditeur : ne changent pas le réglage ; l'admin l'active
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select throws_ok($$ insert into public.job_settings (site_id, auto_publish) values ('10000000-0000-4000-a000-000000000001', true) $$, '42501', null,
  'commercial : ne peut pas activer la publication automatique');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select throws_ok($$ select public.agent_review_job('16000000-0000-4000-a000-0000000000b2', 'approve', null, '{}') $$, '42501', null,
  'éditeur : ne peut pas se faire passer pour l''agent');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select lives_ok($$ insert into public.job_settings (site_id, auto_publish) values ('10000000-0000-4000-a000-000000000001', true) $$,
  'admin : active la publication automatique');
reset role;

-- Publication automatique active
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select is(public.agent_review_job('16000000-0000-4000-a000-0000000000b2', 'approve', 'tresorerie-cash', array['Poste de trésorier'], 0.9), 'published',
  'agent autorisé : son approbation publie l''offre');
select is(public.agent_review_job('16000000-0000-4000-a000-0000000000b3', 'approve', 'equipe-expertise', array['Poste de DAF'], 0.9), 'published',
  'agent autorisé : publie une annonce payée');
select is(public.agent_review_job('16000000-0000-4000-a000-0000000000b1', 'escalate', null, array['Doute sur l''employeur'], 0.5), 'pending_review',
  'agent : un doute reste en attente humaine');
reset role;
select is((select status || '/' || coalesce(universe_slug, '-') from public.job_offers where slug = 'agent-ft-2'), 'published/tresorerie-cash',
  'L''univers proposé par l''agent est enregistré');
select is((select count(*)::int from public.job_reviews r join public.job_offers j on j.id = r.job_id where j.slug like 'agent-%'), 4,
  'Chaque décision de l''agent est journalisée');

-- Le serveur (clé de service) ne publie toujours pas seul
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select throws_ok($$ update public.job_offers set status = 'published' where slug = 'agent-ft-1' $$, '42501', null,
  'serveur : ne peut pas publier, même avec la publication automatique active');
reset role;

select * from finish();
rollback;
