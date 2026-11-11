-- 94 · Nouveaux métiers de prestataires (décision du 11/11/2026), avant le chargement des registres (data/96).
-- Univers « Équipe finance & expertise ». Annuaires factuels, sans classement ; tout en brouillon.
insert into public.categories (id, site_id, vertical_id, kind, name, slug, short_name, description, criteria, value_score, status, sort) values
  ('12000000-0000-4000-a000-000000000093', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'provider', 'Commissaires aux comptes', 'commissaires-aux-comptes', 'commissaire aux comptes',
   'Sociétés de commissariat aux comptes : audit légal et missions d''audit. Profession réglementée : fiches factuelles ; inscription sur la liste de la H2A à vérifier fiche par fiche.',
   '[]', 0, 'draft', 49),
  ('12000000-0000-4000-a000-000000000094', '10000000-0000-4000-a000-000000000001', '11000000-0000-4000-a000-000000000005',
   'provider', 'Cabinets de recrutement et chasse de tête', 'cabinets-recrutement-finance', 'cabinet de recrutement',
   'Recrutement et chasse de tête de profils finance (DAF, RAF, contrôleurs de gestion, comptables, trésoriers), au succès ou en mission.',
   '[]', 0, 'draft', 50)
on conflict (site_id, slug) do nothing;

create or replace function pg_temp.plan_dir(p_slug text, p_title text, p_kw text, p_outline text[])
returns void language plpgsql as $$
declare site constant uuid := '10000000-0000-4000-a000-000000000001'; iid uuid;
begin
  if exists (select 1 from public.content_items where site_id = site and type = 'provider_directory' and slug = p_slug) then return; end if;
  insert into public.content_items (site_id, type, slug, title, category_id, cluster)
  values (site, 'provider_directory', p_slug, p_title, (select id from public.categories where site_id = site and slug = p_slug), 'equipe-finance')
  returning id into iid;
  insert into public.seo_briefs (content_item_id, primary_keyword, outline, entities, target_words, cta)
  values (iid, p_kw, (select jsonb_agg(jsonb_build_object('level', 2, 'text', t)) from unnest(p_outline) t),
          array['volume de recherche à mesurer (Semrush) avant rédaction'], 700, 'Référencer mon cabinet');
end;
$$;
select pg_temp.plan_dir('commissaires-aux-comptes', 'Commissaires aux comptes : l''annuaire par ville', 'commissaire aux comptes',
  array['Quand une société doit nommer un commissaire aux comptes', 'Vérifier l''inscription sur la liste officielle', 'L''annuaire par ville']);
select pg_temp.plan_dir('cabinets-recrutement-finance', 'Cabinets de recrutement finance et chasseurs de têtes', 'cabinet de recrutement finance',
  array['Recruter un DAF ou un contrôleur de gestion', 'Chasse de tête ou annonce : que choisir', 'L''annuaire par ville']);
