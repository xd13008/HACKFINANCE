-- 1400 · Identifiant G2 d'un logiciel (syndication des avis G2 : filter[product_id]).
-- Donnée de correspondance, non sensible ; aucun changement de droits.
alter table public.software add column if not exists g2_product_id text
  check (g2_product_id is null or g2_product_id ~ '^[A-Za-z0-9-]{1,64}$');
comment on column public.software.g2_product_id is 'Identifiant du produit chez G2, renseigné par un éditeur pour importer les avis G2 en brouillon.';
