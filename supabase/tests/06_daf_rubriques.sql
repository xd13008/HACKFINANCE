-- Radar Finances organisé en 8 univers opérationnels (data/45 et data/50)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select set_eq(
  $$ select v.slug from public.verticals v join public.sites s on s.id = v.site_id where s.key = 'daf' $$,
  $$ values ('comptabilite-conformite'), ('tresorerie-cash'), ('depenses-achats'), ('encaissement'),
            ('pilotage-performance'), ('equipe-expertise'), ('financement-aides-risques'), ('rse-performance-durable') $$,
  'Huit univers, et seulement eux'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.vertical_id is null),
  0, 'Chaque catégorie est rattachée à un univers'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.slug in ('organismes-formation-finance', 'cabinets-cir-cii', 'cabinets-reduction-couts', 'management-transition', 'experts-comptables')
     and c.kind = 'provider' and c.criteria = '[]'::jsonb),
  5, 'Organismes, cabinets et professions réglementées : annuaires sans classement'
);

select ok(
  exists (select 1 from public.content_items i join public.sites s on s.id = i.site_id
          where s.key = 'daf' and i.slug = 'pret-d-honneur' and i.regulated_topic = 'credit' and i.category_id is null),
  'Prêt d''honneur : sujet réglementé « crédit », sans catégorie'
);

select set_eq(
  $$ select c.slug from public.categories c join public.verticals v on v.id = c.vertical_id
     join public.sites s on s.id = c.site_id where s.key = 'daf' and v.slug = 'rse-performance-durable' $$,
  $$ values ('reporting-esg') $$,
  'RSE sur Radar Finances : une catégorie angle DAF, le détail reste sur Radar RSE'
);

select is(
  (select count(*)::int from public.categories c join public.verticals v on v.id = c.vertical_id
   join public.sites s on s.id = c.site_id where s.key = 'daf' and v.slug = 'financement-aides-risques'
     and c.slug ~ '(credit|affacturage|financement|assurance|pret|levee|crowdlending)'),
  0, 'Financement & risques : aucune catégorie comparative de financement ou d''assurance'
);

select * from finish();
rollback;
