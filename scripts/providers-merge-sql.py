#!/usr/bin/env python3
"""
Sociétés trouvées sur le web (annuaires de partenaires, sites des cabinets) -> SQL idempotent, sans doublon.
- SIREN déjà présent dans data/95 ou data/96 : la fiche existante est complétée (site, spécialités, description générique
  remplacée, catégorie ajoutée) ; son adresse (slug) ne change pas.
- Sinon : nouvelle fiche en brouillon (scripts/providers-to-sql.py), slug sans collision avec les fichiers précédents.
Usage : python3 -I scripts/providers-merge-sql.py out-c.json out-d.json > supabase/data/97_prestataires_web.sql
"""
import json, os, re, subprocess, sys, tempfile

SITE = "10000000-0000-4000-a000-000000000001"
PREV = ("supabase/data/95_prestataires.sql", "supabase/data/96_prestataires_registre.sql")

def q(v):
    if v is None: return "null"
    if isinstance(v, list): return ("array[" + ",".join(q(x) for x in v) + "]::text[]") if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"

known_slugs, known_sirens = set(), set()
for f in PREV:
    if os.path.exists(f):
        txt = open(f, encoding="utf-8").read()
        for slug, siren in re.findall(r"^  \('([a-z0-9-]+)', '(?:[^']|'')*', '[a-z-]+', (?:true|false), (?:'([0-9]{9})'|null)", txt, re.M):
            known_slugs.add(slug)
            if siren: known_sirens.add(siren)

rows = [r for path in sys.argv[1:] for r in json.load(open(path, encoding="utf-8"))]
dedup, seen = [], set()
for r in rows:  # même société citée deux fois : catégories et spécialités fusionnées
    sid = str(r.get("siren") or "")
    key = sid if re.fullmatch(r"[0-9]{9}", sid) else (r.get("name") or "").lower()
    if key in seen:
        prev = next(x for x in dedup if (str(x.get("siren") or "") if re.fullmatch(r"[0-9]{9}", str(x.get("siren") or "")) else (x.get("name") or "").lower()) == key)
        prev["categories"] = list(dict.fromkeys((prev.get("categories") or []) + (r.get("categories") or [])))
        prev["specialties"] = list(dict.fromkeys((prev.get("specialties") or []) + (r.get("specialties") or [])))
        continue
    seen.add(key); dedup.append(r)

existing = [r for r in dedup if str(r.get("siren") or "") in known_sirens]
new = [r for r in dedup if str(r.get("siren") or "") not in known_sirens]

out = ["-- 97 · Sociétés trouvées sur le web (annuaires de partenaires, sites des cabinets), fusionnées par SIREN.",
       f"-- Généré par scripts/providers-merge-sql.py : {len(existing)} fiches existantes complétées, {len(new)} nouvelles en brouillon.", ""]
if existing:
    vals = ",\n".join(
        f"  ({q(r['siren'])}, {q(r['website'] if str(r.get('website') or '').startswith('https://') else None)}, "
        f"{q([str(x)[:80] for x in (r.get('specialties') or [])][:12])}, {q((r.get('description') or '')[:400] or None)})" for r in existing)
    out.append("update public.providers p set\n  website = coalesce(p.website, x.website),\n"
               "  specialties = array(select distinct s from unnest(p.specialties || x.specialties) s),\n"
               "  description = case when p.description like 'Société d''activités comptables%' or p.description like 'Cabinet de recrutement%'\n"
               "                       or p.description is null then coalesce(x.description, p.description) else p.description end\n"
               f"from (values\n{vals}\n) as x(siren, website, specialties, description)\nwhere p.siren = x.siren and p.status = 'draft';\n")
    links = [(r["siren"], c) for r in existing for c in (r.get("categories") or [])]
    out.append("insert into public.provider_categories (provider_id, category_id)\nselect p.id, c.id from (values")
    out.append(",\n".join(f"  ({q(s)}, {q(c)})" for s, c in links))
    out.append(f") as x(siren, cat)\njoin public.providers p on p.siren = x.siren\njoin public.categories c on c.slug = x.cat and c.site_id = '{SITE}'\non conflict do nothing;\n")

if new:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(new, tmp, ensure_ascii=False)
    sql = subprocess.run([sys.executable, "-I", os.path.join(os.path.dirname(os.path.abspath(__file__)), "providers-to-sql.py"), tmp.name],
                         capture_output=True, text=True, check=True).stdout
    os.unlink(tmp.name)
    taken = set(known_slugs)
    def reslug(m):
        s = base = m.group(1); n = 2
        while s in taken: s = f"{base[:62]}-w{n}"; n += 1
        taken.add(s); return f"('{s}'"
    # slugs des lignes d'insertion et des rattachements, dans le même ordre
    mapping = {}
    def rs(m):
        old = m.group(1)
        if old not in mapping: mapping[old] = reslug(m)[2:-1]
        return f"('{mapping[old]}'"
    sql = re.sub(r"\('([a-z0-9-]+)'(?=, '(?:[^']|'')*', '[a-z-]+', (?:true|false))", rs, sql)
    sql = re.sub(r"\('([a-z0-9-]+)'(?=, '[a-z-]+'\))", lambda m: f"('{mapping.get(m.group(1), m.group(1))}'", sql)
    sql = re.sub(r"update public\.providers p set name = x\.name.*?;\n", "", sql, flags=re.S)  # inutile pour de nouvelles fiches
    out.append("\n".join(sql.splitlines()[3:]))
print("\n".join(out))
print(f"lignes {len(rows)} · uniques {len(dedup)} · existantes complétées {len(existing)} · nouvelles {len(new)}", file=sys.stderr)
