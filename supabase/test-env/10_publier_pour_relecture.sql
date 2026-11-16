-- SITE DE TEST UNIQUEMENT (scripts/migrate-prod.mjs : VERCEL_ENV=preview et base différente de la production).
-- Publie ce qui attend une validation humaine, pour relire les pages telles qu'elles seront en production.
-- Ne jamais exécuter sur la base de production : les règles 1 et 4 y imposent la validation humaine.

-- Annuaires prioritaires et leurs fiches (sauf fiches rejetées)
update public.categories set status = 'published'
 where kind = 'provider' and slug in ('experts-comptables', 'commissaires-aux-comptes', 'cabinets-recrutement-finance') and status <> 'published';
update public.providers p set status = 'published'
  from public.provider_categories pc join public.categories k on k.id = pc.category_id
 where pc.provider_id = p.id and k.slug in ('experts-comptables', 'commissaires-aux-comptes', 'cabinets-recrutement-finance')
   and p.status = 'draft' and p.verification_status <> 'rejected';

-- Grille de lecture : faits en brouillon validés (en production, un éditeur les valide un à un)
update public.provider_facts set status = 'validated' where status = 'draft';
