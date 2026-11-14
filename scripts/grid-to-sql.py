#!/usr/bin/env python3
"""Grille de lecture des cabinets : docs/seo/grille/*.json -> supabase/data/99_grille_prestataires.sql

Chaque fichier contient des faits déjà normalisés (codes du référentiel provider_criteria, migration 2200),
avec leur source et leur date de consultation. Ils sont chargés en BROUILLON (règle 4) : un éditeur les valide
dans /admin/prestataires avant tout affichage public. Idempotent : un fait déjà présent (brouillon ou validé)
n'est jamais écrasé ; un critère qui ne s'applique pas au métier de la fiche est ignoré.
"""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "supabase", "data", "99_grille_prestataires.sql")

def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"

rows = []
for path in sorted(glob.glob(os.path.join(ROOT, "docs", "seo", "grille", "*.json"))):
    d = json.load(open(path, encoding="utf-8"))
    for block in ("sites", "registre"):
        for e in d.get(block, []):
            for crit, val in e["facts"].items():
                rows.append("(" + ", ".join([q(e["slug"]), q(crit), q(json.dumps(val, ensure_ascii=False)), q(e["source_url"]),
                                             q(e["source_kind"]), q(e["accessed_on"]), q(e.get("note") or None)]) + ")")

sql = f"""-- Généré par scripts/grid-to-sql.py depuis docs/seo/grille/*.json — ne pas modifier à la main.
-- Grille de lecture des cabinets : {len(rows)} faits en brouillon, sourcés et datés, à valider par un éditeur (règles 4 et 6).
insert into public.provider_facts (provider_id, criterion, value, source_url, source_kind, accessed_on, author_kind, note)
select p.id, v.criterion, v.value::jsonb, v.source_url, v.source_kind, v.accessed_on::date, 'agent', v.note
  from (values
  {(","+chr(10)+"  ").join(rows)}
  ) as v(slug, criterion, value, source_url, source_kind, accessed_on, note)
  join public.providers p on p.slug = v.slug
  join public.provider_criteria c on c.code = v.criterion
 where c.professions is null
    or p.profession = any (c.professions)
    or exists (select 1 from public.provider_categories pc join public.categories k on k.id = pc.category_id
                where pc.provider_id = p.id and k.slug = any (c.professions))
on conflict (provider_id, criterion) where status in ('draft', 'validated') do nothing;
"""
open(OUT, "w", encoding="utf-8").write(sql)
print(f"{len(rows)} faits -> {os.path.relpath(OUT, ROOT)}")
