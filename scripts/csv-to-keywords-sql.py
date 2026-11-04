"""Convertit docs/seo/keywords-*.csv (export Semrush) en INSERT keyword_targets.

Usage : python3 -I scripts/csv-to-keywords-sql.py docs/seo/keywords-fr-2026-11.csv > supabase/bootstrap/02_keywords.sql
Colonnes : keyword;volume;cpc_eur;kd;portail;cluster  (portail = daf | cession ; les autres lignes sont ignorées)
"""
import csv
import sys

SITES = {"daf": "10000000-0000-4000-a000-000000000001", "cession": "10000000-0000-4000-a000-000000000002"}
COMMERCIAL_HINTS = ("logiciel", "plateforme", "pdp", "banque", "compte pro", "carte", "cabinet", "expert comptable en ligne")


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main(path: str) -> None:
    rows = []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=";"):
            site = SITES.get(r["portail"])
            if not site:
                continue
            kw = r["keyword"].strip()
            intent = "commercial" if kw.startswith(COMMERCIAL_HINTS) or " vs " in kw else "informational"
            rows.append(f"  ({q(site)}, {q(kw)}, {int(r['volume'])}, {float(r['cpc_eur'])}, {int(r['kd'])}, {q(intent)}, {q(r['cluster'])}, 'semrush')")
    print("-- Généré par scripts/csv-to-keywords-sql.py — données Semrush FR, novembre 2026")
    print("insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source) values")
    print(",\n".join(rows))
    print("on conflict (site_id, keyword) do nothing;")


if __name__ == "__main__":
    main(sys.argv[1])
