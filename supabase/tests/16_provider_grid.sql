-- Grille de lecture des cabinets : faits typés, brouillon par défaut, validation humaine, filtres sur faits validés — `pnpm test:db`
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;

insert into public.categories (id, site_id, kind, name, slug, criteria, status) values
  ('12000000-0000-4000-a000-0000000000e1', '10000000-0000-4000-a000-000000000001', 'provider', 'Test grille', 'test-grille', '[]', 'published')
  on conflict (id) do nothing;
insert into public.providers (id, name, slug, profession, city, city_slug, status, verification_status) values
  ('13000000-0000-4000-a000-0000000000e1', 'G1', 'grille-1', 'experts-comptables', 'Grilleville', 'grilleville', 'published', 'unverified'),
  ('13000000-0000-4000-a000-0000000000e2', 'G2', 'grille-2', 'experts-comptables', 'Grilleville', 'grilleville', 'published', 'unverified'),
  ('13000000-0000-4000-a000-0000000000e3', 'G3', 'grille-3', 'experts-comptables', 'Grilleville', 'grilleville', 'draft', 'unverified');
insert into public.provider_categories (provider_id, category_id) values
  ('13000000-0000-4000-a000-0000000000e1', '12000000-0000-4000-a000-0000000000e1'),
  ('13000000-0000-4000-a000-0000000000e2', '12000000-0000-4000-a000-0000000000e1'),
  ('13000000-0000-4000-a000-0000000000e3', '12000000-0000-4000-a000-0000000000e1');

-- Valeurs contrôlées par le référentiel
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on)
  values ('13000000-0000-4000-a000-0000000000e1', 'clients', '["grandes-surfaces"]', 'https://exemple.test', 'site_officiel', '2026-11-14') $$,
  '22023', null, 'valeur hors référentiel refusée');
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on)
  values ('13000000-0000-4000-a000-0000000000e1', 'fonctions_recrutees', '["daf"]', 'https://exemple.test', 'site_officiel', '2026-11-14') $$,
  '22023', null, 'critère d''un autre métier refusé');
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on)
  values ('13000000-0000-4000-a000-0000000000e1', 'clients', '["pme"]', 'exemple.test', 'site_officiel', '2026-11-14') $$,
  '23514', null, 'source sans URL refusée');

-- Agent : brouillons seulement, à son nom
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select lives_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on, author_kind, created_by)
  values ('13000000-0000-4000-a000-0000000000e1', 'clients', '["pme","eti"]', 'https://g1.exemple.test', 'site_officiel', '2026-11-14', 'agent', auth.uid()),
         ('13000000-0000-4000-a000-0000000000e2', 'clients', '["tpe"]', 'https://g2.exemple.test', 'site_officiel', '2026-11-14', 'agent', auth.uid()),
         ('13000000-0000-4000-a000-0000000000e1', 'facturation_electronique', 'true', 'https://g1.exemple.test', 'site_officiel', '2026-11-14', 'agent', auth.uid()),
         ('13000000-0000-4000-a000-0000000000e3', 'clients', '["pme"]', 'https://g3.exemple.test', 'site_officiel', '2026-11-14', 'agent', auth.uid()) $$,
  'agent : écrit des brouillons');
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on, author_kind, created_by, status)
  values ('13000000-0000-4000-a000-0000000000e2', 'langues', '["en"]', 'https://g2.exemple.test', 'site_officiel', '2026-11-14', 'agent', auth.uid(), 'validated') $$,
  'P0001', null, 'agent : ne peut pas écrire un fait validé');
select is(pg_temp.affected($$ update public.provider_facts set status = 'validated' where provider_id = '13000000-0000-4000-a000-0000000000e1' $$), 0,
  'agent : ne valide rien');
reset role;

-- Public : rien tant que ce n'est pas validé
select pg_temp.as_anon();
select is((select count(*)::int from public.provider_facts where provider_id in ('13000000-0000-4000-a000-0000000000e1', '13000000-0000-4000-a000-0000000000e2')), 0,
  'anon : aucun brouillon visible');
select is((public.providers_filtered('12000000-0000-4000-a000-0000000000e1', 'grilleville', null, '{"clients":["pme"]}')->>'total')::int, 0,
  'anon : un brouillon ne passe aucun filtre');
reset role;

-- Commercial : aucune écriture, aucune validation
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select is(pg_temp.affected($$ update public.provider_facts set status = 'validated' where provider_id = '13000000-0000-4000-a000-0000000000e1' $$), 0,
  'commercial : ne valide rien');
select throws_ok($$ select public.validate_provider_facts(null, 'grilleville') $$, '42501', null, 'commercial : pas de validation par lot');
reset role;

-- Éditeur humain : valide une ville
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select is(public.validate_provider_facts(null, 'grilleville', 'site_officiel'), 4, 'éditeur : valide les faits de la ville');
select isnt((select validated_by from public.provider_facts where provider_id = '13000000-0000-4000-a000-0000000000e1' and criterion = 'clients'), null,
  'éditeur : le valideur est enregistré');
reset role;

select pg_temp.as_anon();
select is((select count(*)::int from public.provider_facts where provider_id in ('13000000-0000-4000-a000-0000000000e1', '13000000-0000-4000-a000-0000000000e2')), 3,
  'anon : faits validés des fiches publiées visibles');
select is((select count(*)::int from public.provider_facts where provider_id = '13000000-0000-4000-a000-0000000000e3'), 0,
  'anon : faits d''une fiche en brouillon invisibles, même validés');
select throws_ok($$ select created_by from public.provider_facts limit 1 $$, '42501', null, 'anon : auteur du fait jamais servi');
select is(public.providers_filtered('12000000-0000-4000-a000-0000000000e1', 'grilleville', null, '{"clients":["pme"]}')->'ids',
  '["13000000-0000-4000-a000-0000000000e1"]'::jsonb, 'anon : filtre sur une valeur');
select is((public.providers_filtered('12000000-0000-4000-a000-0000000000e1', 'grilleville', null, '{"clients":["pme","tpe"]}')->>'total')::int, 2,
  'anon : plusieurs valeurs d''un critère = OU');
select is((public.providers_filtered('12000000-0000-4000-a000-0000000000e1', 'grilleville', null, '{"clients":["pme","tpe"],"facturation_electronique":["oui"]}')->>'total')::int, 1,
  'anon : plusieurs critères = ET (oui/non compris)');
select is(public.provider_filter_options('12000000-0000-4000-a000-0000000000e1', 'grilleville'),
  '[{"n":1,"code":"eti","criterion":"clients"},{"n":1,"code":"pme","criterion":"clients"},{"n":1,"code":"tpe","criterion":"clients"},{"n":1,"code":"oui","criterion":"facturation_electronique"}]'::jsonb,
  'anon : options des filtres issues des seuls faits validés de fiches publiées');
reset role;

-- Axes du dirigeant, listes, période (migration 2300)
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on)
  values ('13000000-0000-4000-a000-0000000000e2', 'references', jsonb_build_array(repeat('x', 201)), 'https://exemple.test', 'site_officiel', '2026-11-14') $$,
  '22023', null, 'liste : texte de plus de 200 caractères refusé');
select throws_ok($$ insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on, period)
  values ('13000000-0000-4000-a000-0000000000e2', 'chiffre_affaires', '1200000', 'https://exemple.test', 'registre_public', '2026-11-14', '25') $$,
  '23514', null, 'période : une année sur 4 chiffres');
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select is(pg_temp.affected($$ update public.provider_grid_axes set advice = 'Choisissez notre partenaire' where code = 'metier' $$), 0,
  'commercial : ne modifie pas les conseils des axes');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select is(pg_temp.affected($$ update public.provider_grid_axes set advice = 'x' where code = 'metier' $$), 0, 'agent : ne modifie pas les axes');
reset role;
select pg_temp.as_anon();
select is((select count(*)::int from public.provider_grid_axes where scope = 'experts-comptables' and advice is not null), 5, 'anon : lit les 5 conseils du dirigeant');
select lives_ok($$ select period from public.provider_facts limit 1 $$, 'anon : la période d''une donnée est lisible');
reset role;

select * from finish();
rollback;
