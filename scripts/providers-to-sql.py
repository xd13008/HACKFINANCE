#!/usr/bin/env python3
"""
Cabinets et prestataires (JSON de recherche, SIREN vérifié au registre public Recherche d'entreprises) -> SQL idempotent.
Tout en BROUILLON (status draft, verification_status unverified) : un éditeur vérifie avant publication.
Personnes morales uniquement ; aucune donnée personnelle. Le SIREN reste interne (jamais servi à anon, règle 9).
Usage : python3 -I scripts/providers-to-sql.py out-a.json [out-b.json ...] > supabase/data/95_prestataires.sql
"""
import json, re, sys, unicodedata

SITE = "10000000-0000-4000-a000-000000000001"
CATS = {"integrateurs-comptables", "conseil-tresorerie", "cabinets-reduction-couts", "societes-recouvrement", "controle-gestion-bi",
        "conseil-csrd-carbone", "cabinets-cir-cii", "organismes-formation-finance", "management-transition", "experts-comptables",
        "commissaires-aux-comptes", "cabinets-recrutement-finance"}
REGULATED = {"societes-recouvrement", "experts-comptables", "commissaires-aux-comptes"}

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")[:70]

def q(v):
    if v is None: return "null"
    if isinstance(v, list): return "array[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"

def num(v, lo, hi):
    try:
        f = float(v); return round(f, 6) if lo <= f <= hi else None
    except (TypeError, ValueError):
        return None

rows, seen, rejected, sirens = [], set(), [], {}
for path in sys.argv[1:]:
    for r in json.load(open(path, encoding="utf-8")):
        name = (r.get("name") or "").strip(); site = r.get("website") or ""
        cats = [c for c in (r.get("categories") or []) if c in CATS]
        # Site obligatoire, sauf pour une société identifiée au registre public (SIREN vérifié)
        has_siren = bool(re.fullmatch(r"[0-9]{9}", str(r.get("siren") or "")))
        if not name or not cats or not (site.startswith("https://") or has_siren):
            rejected.append(name or "?"); continue
        city = (r.get("city") or "").strip() or None
        slug = slugify(name)
        if slug in seen: slug = slugify(f"{name}-{city or 'bis'}")
        base, n = slug, 2
        while slug in seen:  # homonymes (réseaux, filiales) : suffixe numérique, jamais le SIREN (règle 9)
            slug = f"{base[:64]}-{n}"; n += 1
        seen.add(slug)
        siren = r.get("siren") if re.fullmatch(r"[0-9]{9}", str(r.get("siren") or "")) else None
        if siren and siren in sirens:  # même société trouvée deux fois : catégories fusionnées, une seule fiche
            for c in cats:
                if c not in sirens[siren]["cats"]: sirens[siren]["cats"].append(c)
            seen.discard(slug); continue
        cp = r.get("postal_code") if re.fullmatch(r"[0-9]{5}", str(r.get("postal_code") or "")) else None
        dep = str(r.get("department")) if re.fullmatch(r"([0-9]{2,3}|2A|2B)", str(r.get("department") or "")) else None
        cov = r.get("coverage") if r.get("coverage") in ("national", "régional", "local") else None
        refs = [{"label": "Source", "source_url": u} for u in (r.get("sources") or []) if isinstance(u, str) and u.startswith("https://")][:5]
        rows.append({"slug": slug, "name": ((r.get("display_name") or name).strip())[:150], "profession": cats[0], "regulated": cats[0] in REGULATED or bool(r.get("regulated")),
                     "siren": siren, "website": site if site.startswith("https://") else None, "city": city, "city_slug": slugify(city) if city else None,
                     "region": (r.get("region") or None), "specialties": [str(x)[:80] for x in (r.get("specialties") or [])][:12],
                     "description": (r.get("description") or "")[:400] or None, "refs": json.dumps(refs, ensure_ascii=False),
                     "postal_code": cp, "department": dep, "lat": num(r.get("latitude"), -90, 90), "lon": num(r.get("longitude"), -180, 180),
                     "offices": [str(x)[:80] for x in (r.get("offices") or [])][:30], "coverage": cov, "cats": cats})
        if siren: sirens[siren] = rows[-1]

out = [f"-- 95 · Cabinets et prestataires (recherche documentaire + registre Recherche d'entreprises, 11/11/2026).",
       f"-- Généré par scripts/providers-to-sql.py : {len(rows)} sociétés en BROUILLON ; écartées : {len(rejected)}.", ""]
if rows:
    cols = "slug, name, profession, regulated_profession, siren, website, city, city_slug, region, specialties, description, public_references, postal_code, department, latitude, longitude, offices, coverage"
    out.append(f"insert into public.providers ({cols}, status, verification_status) values")
    out.append(",\n".join(
        f"  ({q(r['slug'])}, {q(r['name'])}, {q(r['profession'])}, {str(r['regulated']).lower()}, {q(r['siren'])}, {q(r['website'])}, "
        f"{q(r['city'])}, {q(r['city_slug'])}, {q(r['region'])}, {q(r['specialties'])}, {q(r['description'])}, {q(r['refs'])}::jsonb, "
        f"{q(r['postal_code'])}, {q(r['department'])}, {('null' if r['lat'] is None else r['lat'])}, {('null' if r['lon'] is None else r['lon'])}, "
        f"{q(r['offices'])}, {q(r['coverage'])}, 'draft', 'unverified')" for r in rows))
    out.append("on conflict (slug) do nothing;\n")
    # Fiches déjà chargées (brouillons) : nom affiché mis à jour, adresse (slug) inchangée
    fix = [(r["slug"], r["name"]) for r in rows]
    out.append("update public.providers p set name = x.name from (values")
    out.append(",\n".join(f"  ({q(a)}, {q(b)})" for a, b in fix))
    out.append(") as x(slug, name) where p.slug = x.slug and p.status = 'draft' and p.name is distinct from x.name;\n")
    links = [(r["slug"], c) for r in rows for c in r["cats"]]
    out.append("insert into public.provider_categories (provider_id, category_id)\nselect p.id, c.id from (values")
    out.append(",\n".join(f"  ({q(s)}, {q(c)})" for s, c in links))
    out.append(f") as x(pr, cat)\njoin public.providers p on p.slug = x.pr\njoin public.categories c on c.slug = x.cat and c.site_id = '{SITE}'\non conflict do nothing;")
print("\n".join(out))
print(f"sociétés {len(rows)} · écartées {len(rejected)} : {', '.join(rejected[:20])}", file=sys.stderr)
