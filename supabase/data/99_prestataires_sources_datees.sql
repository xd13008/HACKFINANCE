-- 99 · Sources datées des fiches prestataires (règle 6 : aucun fait publié sans source datée).
-- Les fiches des registres publics (data/96) et des recherches web (data/95, data/97) ont été collectées le 11/11/2026 ;
-- la date est ajoutée aux références qui n'en ont pas encore. Idempotent ; les fiches fictives ne sont pas concernées.
update public.providers p
   set public_references = (
     select jsonb_agg(case when r ? 'accessed_at' then r else r || '{"accessed_at":"2026-11-11"}'::jsonb end order by ord)
     from jsonb_array_elements(p.public_references) with ordinality as e(r, ord))
 where not p.is_fictional
   and jsonb_array_length(p.public_references) > 0
   and exists (select 1 from jsonb_array_elements(p.public_references) r where not r ? 'accessed_at');
