-- Rubriques complémentaires de Radar Finances (data/45)
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select set_has(
  $$ select v.slug from public.verticals v join public.sites s on s.id = v.site_id where s.key = 'daf' $$,
  $$ values ('documents-signature'), ('formation'), ('aides-publiques'), ('reduction-couts'), ('rse-carbone') $$,
  'Rubriques documents, formation, aides publiques, réduction des coûts, RSE présentes'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.slug in ('organismes-formation-finance', 'cabinets-cir-cii', 'cabinets-reduction-couts')
     and c.kind = 'provider' and c.criteria = '[]'::jsonb),
  3, 'Organismes de formation et cabinets : annuaires sans classement'
);

select ok(
  exists (select 1 from public.content_items i join public.sites s on s.id = i.site_id
          where s.key = 'daf' and i.slug = 'pret-d-honneur' and i.regulated_topic = 'credit' and i.category_id is null),
  'Prêt d''honneur : sujet réglementé « crédit », sans catégorie'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key = 'daf' and c.vertical_id = (select id from public.verticals where slug = 'rse-carbone' and site_id = s.id)),
  0, 'RSE sur Radar Finances : guide seulement, les comparatifs restent sur Radar RSE'
);

select * from finish();
rollback;
