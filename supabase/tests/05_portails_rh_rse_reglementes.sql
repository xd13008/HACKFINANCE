-- Sujets réglementés « contenu seul » (migration 1100) et nouveaux portails RH / RSE (data/40)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select throws_ok(
  $$ insert into public.placement_inventory (site_id, placement_type, content_item_id, slot)
     select i.site_id, 'category_sponsored', i.id, 1 from public.content_items i where i.slug = 'affacturage' and i.type = 'guide' $$,
  'P0001', null, 'Aucun emplacement publicitaire sur une page de sujet réglementé'
);

-- Une page portant déjà un emplacement ne peut pas être marquée réglementée
insert into public.placement_inventory (site_id, placement_type, content_item_id, slot)
select i.site_id, 'category_sponsored', i.id, 5 from public.content_items i
where i.type = 'guide' and i.regulated_topic is null limit 1;
select throws_ok(
  $$ update public.content_items set regulated_topic = 'credit'
     where id = (select content_item_id from public.placement_inventory where slot = 5 and content_item_id is not null limit 1) $$,
  'P0001', null, 'Marquage réglementé refusé tant qu''un emplacement existe'
);

select is(
  (select count(*)::int from public.content_items where regulated_topic is not null and (category_id is not null or published_version_id is not null)),
  0, 'Sujets réglementés : sans catégorie (donc sans classement) et non publiés'
);

select is(
  (select count(*)::int from public.content_items i join public.sites s on s.id = i.site_id
   where s.key = 'daf' and i.regulated_topic is not null),
  5, 'Cinq guides « contenu seul » : crédit, affacturage, compte pro, assurance, placement'
);

select set_eq(
  $$ select key || ':' || status from public.sites where key in ('rh', 'rse') $$,
  array['rh:draft', 'rse:draft'], 'Portails Radar RH et Radar RSE créés en brouillon'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key in ('rh', 'rse') and c.kind = 'software' and jsonb_array_length(c.criteria) = 0),
  0, 'Chaque catégorie logicielle RH / RSE a une grille de notation'
);

select is(
  (select count(*)::int from public.categories c join public.sites s on s.id = c.site_id
   where s.key in ('rh', 'rse') and c.kind = 'provider' and c.criteria <> '[]'::jsonb),
  0, 'Annuaires de prestataires RH / RSE sans classement'
);

select * from finish();
rollback;
