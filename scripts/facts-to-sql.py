#!/usr/bin/env python3
"""
Relevés de faits et de prix (JSON, sites officiels) -> SQL idempotent, tout en BROUILLON.
Chaque fait garde sa source et la citation exacte (colonne note) ; l'éditeur vérifie puis valide (règle 6).
Usage : python3 -I scripts/facts-to-sql.py out1.json [out2.json ...] > supabase/data/90_faits_prix.sql
"""
import json, re, sys

FACT_TYPES = {"pa_status", "free_plan", "free_trial", "no_commitment", "target_sizes", "hosting", "e_invoice_formats",
              "ereporting", "api", "accounting_exports", "multi_entity", "ocr", "corporate_cards", "mileage",
              "approval_workflow", "po_matching", "supplier_payments", "e_invoice_reception", "bank_connections"}
PERIODS = {"month", "year", "one_time", "quote", "free"}
SIZES = {"tpe", "pme", "eti"}

def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

def https(u):
    return isinstance(u, str) and u.startswith("https://") and len(u) < 500

def clean_value(t, v):
    if t in {"free_plan", "free_trial", "no_commitment", "ereporting", "api", "multi_entity", "ocr", "corporate_cards", "mileage",
             "approval_workflow", "po_matching", "supplier_payments", "e_invoice_reception"}:
        return v if isinstance(v, bool) else None
    if t == "target_sizes":
        v = [s for s in (v or []) if s in SIZES] if isinstance(v, list) else None
        return v or None
    if t in {"e_invoice_formats", "accounting_exports"}:
        return [str(s)[:60] for s in v][:30] if isinstance(v, list) and v else None
    if t == "pa_status":
        return v if v in ("immatriculée", "immatriculée sous réserve") else None
    if t == "hosting":
        return str(v)[:60] if v else None
    if t == "bank_connections":
        return int(v) if isinstance(v, (int, float)) and v >= 0 else None
    return None

facts, plans, skipped, date = [], [], 0, "2026-11-11"
for path in sys.argv[1:]:
    d = json.load(open(path, encoding="utf-8"))
    date = d.get("collected_at", date)
    for s in d.get("software", []):
        slug = s.get("slug")
        if not slug or not re.fullmatch(r"[a-z0-9-]+", slug):
            continue
        for f in s.get("facts") or []:
            t = f.get("fact_type"); v = clean_value(t, f.get("value")) if t in FACT_TYPES else None
            quote = (f.get("quote") or "").strip()
            if v is None or not https(f.get("source_url")) or len(quote) < 3:
                skipped += 1; continue
            facts.append((slug, t, json.dumps(v, ensure_ascii=False), f["source_url"], quote[:200]))
        for p in s.get("plans") or []:
            per = p.get("billing_period"); price = p.get("price_eur")
            if per not in PERIODS or not https(p.get("source_url")) or not (p.get("plan_name") or "").strip():
                skipped += 1; continue
            if price is not None and (not isinstance(price, (int, float)) or price < 0 or price > 1_000_000):
                skipped += 1; continue
            if per == "quote": price = None
            if price is None and per in ("month", "year", "one_time"):  # prix non affiché en euros (ex. dollars) : écarté
                skipped += 1; continue
            plans.append((slug, p["plan_name"].strip()[:80], price, per, (p.get("per_unit") or None), (p.get("conditions") or "")[:300] or None, p["source_url"]))

# dédoublonnage : un fait par (logiciel, type), une offre par (logiciel, nom)
facts = list({(f[0], f[1]): f for f in facts}.values())
plans = list({(p[0], p[1]): p for p in plans}.values())
out = [f"-- 90 · Faits et prix relevés sur les sites officiels le {date} (généré par scripts/facts-to-sql.py).",
       f"-- {len(facts)} faits, {len(plans)} offres, en BROUILLON avec citation ; {skipped} éléments écartés (incomplets ou hors format).", ""]
if facts:
    out.append("insert into public.software_facts (software_id, fact_type, value, source_url, collected_at, status, author_kind, note)")
    out.append(f"select s.id, x.t, x.v::jsonb, x.src, timestamptz '{date} 12:00+01', 'draft', 'agent', 'Relevé assisté le {date}. Citation : « ' || x.quote || ' ». Vérifier sur la source avant validation.' from (values")
    out.append(",\n".join(f"  ({q(a)}, {q(b)}, {q(c)}, {q(e)}, {q(g)})" for a, b, c, e, g in facts))
    out.append(") as x(sw, t, v, src, quote)\njoin public.software s on s.slug = x.sw\n"
               "where not exists (select 1 from public.software_facts f where f.software_id = s.id and f.fact_type = x.t);\n")
if plans:
    out.append("insert into public.pricing_plans (software_id, plan_name, price_eur, billing_period, per_unit, conditions, source_url, source_date, status, sort)")
    out.append(f"select s.id, x.plan, x.price, x.period, x.per_unit, x.cond, x.src, date '{date}', 'draft', x.n from (values")
    out.append(",\n".join(f"  ({q(a)}, {q(b)}, {('null::numeric' if c is None else c)}, {q(d)}, {q(e)}, {q(f)}, {q(g)}, {i})" for i, (a, b, c, d, e, f, g) in enumerate(plans)))
    out.append(") as x(sw, plan, price, period, per_unit, cond, src, n)\njoin public.software s on s.slug = x.sw\n"
               "where not exists (select 1 from public.pricing_plans p where p.software_id = s.id and p.plan_name = x.plan);\n")
print("\n".join(out))
print(f"faits {len(facts)} · offres {len(plans)} · écartés {skipped}", file=sys.stderr)
