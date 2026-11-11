-- Périmètre du portail DAF conforme au cahier des charges (ARCHITECTURE §5) — supabase/data/30_daf_perimetre.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select set_has(
  $$ select c.slug from public.categories c join public.sites s on s.id = c.site_id where s.key = 'daf' and c.kind = 'software' $$,
  $$ values ('facturation-electronique'), ('facturation'), ('tresorerie'), ('notes-de-frais'), ('comptabilite'),
            ('rapprochement-bancaire'), ('recouvrement'), ('pilotage-financier'), ('consolidation'), ('achats') $$,
  'Les 10 catégories logicielles du cahier des charges existent'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.kind = 'software' and jsonb_array_length(c.criteria) = 0),
  0, 'Chaque catégorie logicielle a une grille de notation'
);

select ok(
  exists (select 1 from public.categories c join public.sites s on s.id = c.site_id
          where s.key = 'daf' and c.kind = 'provider' and c.slug = 'experts-comptables' and c.criteria = '[]'::jsonb),
  'Annuaire des experts-comptables présent, sans classement (profession réglementée)'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.slug ~ '(paie|sirh|credit|affacturage|compte-pro|assurance|leasing|levee)'),
  0, 'Hors périmètre DAF : paie (portail Radar RH), financement, compte pro, assurance'
);

select ok(
  exists (select 1 from public.content_items i join public.seo_briefs b on b.content_item_id = i.id
          where i.path = '/dossiers/facturation-electronique'),
  'Dossier pilier facturation électronique planifié avec son brief'
);

select is(
  (select count(*)::int from public.content_items i join public.seo_briefs b on b.content_item_id = i.id
   where b.cta is not null and i.is_fictional = false and i.published_version_id is not null
     and i.path in ('/meilleurs-logiciels/consolidation', '/meilleurs-logiciels/achats', '/dossiers/facturation-electronique')),
  0, 'Les pages planifiées ne sont pas publiées (publication humaine uniquement)'
);

select * from finish();
rollback;
