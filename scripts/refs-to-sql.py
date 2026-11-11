#!/usr/bin/env python3
"""
Transforme les listes de référencement (JSON produits par la recherche documentaire) en SQL idempotent.
Tout est inséré en BROUILLON : logiciels (status draft), rattachements aux catégories, liens G2 / GetApp
(review_sources draft, note seulement si elle a été vue). Aucun fait ni prix : ils viennent ensuite des sites officiels.
Usage : python3 -I scripts/refs-to-sql.py fichier1.json [fichier2.json ...] > supabase/data/80_daf_referencement.sql
"""
import json, re, sys, unicodedata

SITE = "10000000-0000-4000-a000-000000000001"
CATS = {"tresorerie", "communication-bancaire", "fraude-virements", "facturation-electronique", "comptabilite",
        "rapprochement-bancaire", "consolidation", "signature-electronique", "ged", "audit-controle-interne", "facturation",
        "recouvrement", "information-solvabilite", "plateformes-lms", "automatisation-ia-finance", "logiciels-cir-cii",
        "notes-de-frais", "achats", "gestion-abonnements-saas", "cartes-entreprise", "factures-fournisseurs", "reporting-esg",
        "pilotage-financier", "reporting-bi"}

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")[:60]

def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

def https(u):
    return u if isinstance(u, str) and u.startswith("https://") and len(u) < 500 else None

def rating(v, scale=5):
    try:
        f = float(v)
        return f if 0 <= f <= scale else None
    except (TypeError, ValueError):
        return None

def count(v):
    try:
        n = int(v)
        return n if n >= 0 else None
    except (TypeError, ValueError):
        return None

items, seen, rejected = [], {}, []
for path in sys.argv[1:]:
    for r in json.load(open(path, encoding="utf-8")):
        name = (r.get("name") or "").strip()
        cats = [c for c in (r.get("categories") or []) if c in CATS]
        site = https(r.get("website"))
        if not name or not cats or not site:
            rejected.append(name or "?"); continue
        slug = slugify(name)
        if slug in seen:  # même logiciel trouvé par deux recherches : on fusionne les catégories
            seen[slug]["categories"] += [c for c in cats if c not in seen[slug]["categories"]]
            for k in ("g2_url", "getapp_url", "g2_rating", "g2_reviews", "getapp_rating", "getapp_reviews"):
                seen[slug][k] = seen[slug].get(k) or r.get(k)
            continue
        tag = (r.get("tagline") or "").strip()[:160] or None
        item = {**r, "name": name[:120], "vendor": (r.get("vendor") or name).strip()[:120], "slug": slug, "website": site,
                "categories": cats, "tagline": tag}
        seen[slug] = item; items.append(item)

out = ["-- 80 · Référencement des logiciels de chaque sous-rubrique (recherche documentaire du 11/11/2026).",
       "-- Généré par scripts/refs-to-sql.py. Tout en BROUILLON : un éditeur vérifie chaque fiche avant publication.",
       f"-- {len(items)} logiciels ; écartés faute de nom, de catégorie connue ou de site https : {len(rejected)}.", ""]
out.append("insert into public.software (vendor, name, slug, website, tagline, hq_country, status) values")
out.append(",\n".join(f"  ({q(i['vendor'])}, {q(i['name'])}, {q(i['slug'])}, {q(i['website'])}, {q(i['tagline'])}, null, 'draft')" for i in items))
out.append("on conflict (slug) do nothing;\n")
links = [(i["slug"], c, n == 0) for i in items for n, c in enumerate(i["categories"])]
out.append("insert into public.software_categories (software_id, category_id, is_primary)\nselect s.id, c.id, x.p from (values")
out.append(",\n".join(f"  ({q(s)}, {q(c)}, {'true' if p else 'false'})" for s, c, p in links))
out.append(f") as x(sw, cat, p)\njoin public.software s on s.slug = x.sw\njoin public.categories c on c.slug = x.cat and c.site_id = '{SITE}'\n"
           "where not exists (select 1 from public.software_categories sc where sc.software_id = s.id and sc.category_id = c.id)\n"
           "  and (not x.p or not exists (select 1 from public.software_categories sc where sc.software_id = s.id and sc.is_primary));\n")
reviews = []
for i in items:
    for plat in ("g2", "getapp"):
        url = https(i.get(f"{plat}_url"))
        if url:
            reviews.append((i["slug"], plat, url, rating(i.get(f"{plat}_rating")), count(i.get(f"{plat}_reviews"))))
if reviews:
    out.append("insert into public.review_sources (software_id, platform, url, rating, rating_scale, review_count, captured_at, status, author_kind)")
    out.append("select s.id, x.platform, x.url, x.rating, 5, x.n, date '2026-11-11', 'draft', 'agent' from (values")
    out.append(",\n".join(f"  ({q(s)}, {q(p)}, {q(u)}, {('null::numeric' if r is None else r)}, {('null::int' if n is None else n)})" for s, p, u, r, n in reviews))
    out.append(") as x(sw, platform, url, rating, n)\njoin public.software s on s.slug = x.sw\n"
               "where not exists (select 1 from public.review_sources r where r.software_id = s.id and r.platform = x.platform);\n")
print("\n".join(out))
print(f"-- écartés : {', '.join(rejected)}" if rejected else "", file=sys.stderr)
