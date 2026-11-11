#!/usr/bin/env python3
"""
Registre public (API Recherche d'entreprises, liste publique des organismes de formation) -> JSON prestataires,
au format attendu par scripts/providers-to-sql.py. Personnes morales actives uniquement (filtrées à la collecte).
Usage : python3 -I scripts/opendata-to-providers.py recouvrement.json formation.json experts.json > prestataires-registre.json
"""
import json, re, sys

REGIONS = {"11": "Île-de-France", "24": "Centre-Val de Loire", "27": "Bourgogne-Franche-Comté", "28": "Normandie",
           "32": "Hauts-de-France", "44": "Grand Est", "52": "Pays de la Loire", "53": "Bretagne", "75": "Nouvelle-Aquitaine",
           "76": "Occitanie", "84": "Auvergne-Rhône-Alpes", "93": "Provence-Alpes-Côte d'Azur", "94": "Corse",
           "01": "Guadeloupe", "02": "Martinique", "03": "Guyane", "04": "La Réunion", "06": "Mayotte"}
# Hors périmètre (règle 5 et décisions de la rédaction) : assureurs-crédit, racheteurs de créances, information financière
EXCLUDE = re.compile(r"EULER HERMES|ALLIANZ TRADE|COFACE|ATRADIUS|POUEY|IQERA|CABOT|\bMCS\b|SOGEDI|CONCILIAN|LINK FINANCIAL|"
                     r"ELLISPHERE|ALTARES|CREDITSAFE|INFOLEGALE|\bEOS\b|HOIST|INTRUM", re.I)
LABEL = {"societes-recouvrement": "Société de recouvrement de créances (activité 82.91Z au registre).",
         "organismes-formation-finance": "Organisme de formation déclaré, spécialité « Comptabilité, gestion », certifié Qualiopi pour les actions de formation.",
         "experts-comptables": "Société d'activités comptables (activité 69.20Z au registre).",
         "commissaires-aux-comptes": "Société d'activités comptables dont la dénomination mentionne l'audit ou le commissariat aux comptes ; inscription sur la liste de la H2A à vérifier.",
         "cabinets-recrutement-finance": "Cabinet de recrutement ou de chasse de tête (activité 78.10Z au registre)."}
SOURCE = {"societes-recouvrement": "https://annuaire-entreprises.data.gouv.fr/",
          "organismes-formation-finance": "https://www.data.gouv.fr/datasets/liste-publique-des-organismes-de-formation-l-6351-7-1-du-code-du-travail",
          "experts-comptables": "https://annuaire-entreprises.data.gouv.fr/",
          "commissaires-aux-comptes": "https://annuaire-entreprises.data.gouv.fr/",
          "cabinets-recrutement-finance": "https://annuaire-entreprises.data.gouv.fr/"}

def nice(name):
    n = re.sub(r"\s+", " ", (name or "").strip())
    return n.title() if n.isupper() and len(n) > 4 else n

def display(name):
    """Nom affiché : sans les parenthèses du registre qui répètent le nom ou ne donnent qu'un sigle court."""
    n = nice(name)
    base = re.sub(r"\s*\(.*$", "", n).strip()
    def keep(m):
        inner = m.group(1).strip()
        return "" if (inner.lower() in base.lower() or len(inner) <= 6) else f" ({inner})"
    out = re.sub(r"\s*\(([^()]*)\)", keep, n).strip()
    return out or base or n

import glob
# Sociétés déjà référencées par la recherche documentaire (data/95) : on ne les duplique pas
known = {str(x.get("siren")) for f in glob.glob("docs/seo/prestataires/*.json") for x in json.load(open(f, encoding="utf-8")) if x.get("siren")}
out, excluded, by_siren = [], 0, {}
for path in sys.argv[1:]:
    for r in json.load(open(path, encoding="utf-8")):
        name = r.get("of_name") or r.get("name")
        if not name or EXCLUDE.search(name):
            excluded += 1; continue
        cat = r["category"]
        # Recrutement : ni associations ou fondations (nature juridique 9xxx), ni placement de services à domicile
        if cat == "cabinets-recrutement-finance" and (str(r.get("nature_juridique") or "").startswith("9")
                or re.search(r"DOMICILE|ADOMO|AIDE A |NOUNOU|BABY|SENIOR|M[EÉ]NAGE|NURSE|GARDE D", name, re.I)):
            excluded += 1; continue
        sid = str(r.get("siren") or "")
        if sid in known: excluded += 1; continue
        if sid in by_siren:  # même société trouvée plusieurs fois : une seule fiche, catégories fusionnées
            if cat not in by_siren[sid]["categories"]: by_siren[sid]["categories"].append(cat)
            continue
        desc = LABEL[cat] + (f" Ville du siège : {r['city'].title()}." if r.get("city") else "")
        item = {"name": nice(name), "display_name": display(name), "siren": r.get("siren"), "verified": True, "website": None,
                    "city": (r.get("city") or "").title() or None, "region": REGIONS.get(str(r.get("region_code") or "")),
                    "postal_code": r.get("postal_code"), "department": r.get("department"),
                    "latitude": r.get("latitude"), "longitude": r.get("longitude"), "offices": [], "coverage": None,
                    "categories": [cat], "specialties": [r["specialty"]] if r.get("specialty") else [],
                    "description": desc, "regulated": cat in ("societes-recouvrement", "experts-comptables", "commissaires-aux-comptes"),
                    "sources": [SOURCE[cat]]}
        out.append(item); by_siren[sid] = item
json.dump(out, sys.stdout, ensure_ascii=False)
print(f"sociétés {len(out)} · exclues {excluded}", file=sys.stderr)
