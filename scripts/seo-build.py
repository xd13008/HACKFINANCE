"""Construit les fichiers SEO à partir des relevés Semrush (base FR, nov. 2026).

Sorties :
  docs/seo/keywords-fr-2026-11-v2.csv   mots-clés triés (portail, cluster, type de page suggéré, priorité)
  docs/seo/questions-fr-2026-11.csv     questions des internautes (FAQ, plans de briefs)
  supabase/data/10_seo_keywords.sql     chargement idempotent en base (production comprise)
Usage : python3 -I scripts/seo-build.py
"""
import csv, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = {"daf": "10000000-0000-4000-a000-000000000001", "cession": "10000000-0000-4000-a000-000000000002"}
INTENT = {"0": "commercial", "1": "informational", "2": "navigational", "3": "transactional"}

# keyword;volume;cpc;kd;intent_code   — groupés par (portail, cluster)
RAW = {
("daf", "tresorerie"): """logiciel de gestion de trésorerie;590;12.72;18;1
logiciel de trésorerie;590;20.19;24;1
logiciel gestion de trésorerie;480;16.85;21;1
logiciel trésorerie;480;14.17;13;1
logiciel tresorerie;390;14.17;19;1
gestion de trésorerie logiciel;320;16.85;26;1
logiciel gestion trésorerie;260;9.64;14;1
logiciel trésorerie gratuit;210;2.2;14;1
sage tresorerie;170;8.9;22;1
logiciel de prévision de trésorerie;110;15.62;24;0
logiciel gestion financière;720;5.57;31;1
logiciel de gestion financière;390;5.38;22;1
logiciel financier;260;5.42;29;1
gestion de trésorerie;1000;7.12;27;1
plan de trésorerie;1000;2.27;26;1
tableau de flux de trésorerie;1000;1.3;27;1
comptabilité de trésorerie;880;0.82;18;1
convention de trésorerie;720;0.92;14;1
budget de trésorerie;590;1.41;24;1
flux de trésorerie;590;1.08;29;1
trésorerie nette;590;0.37;28;1
besoin de trésorerie;480;3.26;39;1
placement trésorerie entreprise;480;3.82;13;1
tableau de trésorerie;480;2.65;29;1
suivi de trésorerie;260;6.79;26;1
plan de trésorerie prévisionnel;390;2.59;19;1""",
("daf", "facturation-electronique"): """plateforme agréée facturation électronique;5400;2.96;11;1
plateforme agréée;2400;3.48;35;1
plateforme agréée facturation électronique gratuite;1000;2.61;46;1
plateforme agréée gratuite;590;1.67;41;1
liste des plateformes agréées;480;1.65;20;0
liste plateforme agréée facturation électronique;480;2.17;36;1
comparatif plateforme agréée;390;1.29;27;1
annuaire plateforme agréée;260;1.99;27;1
plateforme agréée facturation électronique prix;210;1.45;0;3
comment choisir sa plateforme agréée;170;2.09;18;1
plateforme agréée pdp;170;5.97;34;1
pennylane plateforme agréée;210;2.02;41;2
qonto plateforme agréée;170;2.09;38;1
shine plateforme agréée;210;2.32;16;1
indy plateforme agréée;170;0.9;34;1
facture electronique;22200;1.93;56;1
facturation électronique 2026;6600;1.26;59;1
facturation électronique obligatoire;6600;0.91;70;1
facture electronique 2026;4400;1.26;55;1
dématérialisation de factures;3600;1.76;42;1
facturation électronique gratuite;3600;2.46;52;1
plateforme facture electronique;3600;2.76;49;1
facturation electronique micro entreprise;2900;1.86;40;1
facturation électronique auto-entrepreneur;2900;1.74;45;1
logiciel facturation électronique;2400;4.03;51;1
logiciel dématérialisation factures fournisseurs;720;9.7;26;1""",
("daf", "facturation"): """logiciel de facturation;4400;4.79;49;1
logiciel facturation gratuit;3600;3.55;60;1
logiciel devis facture;1900;7.62;48;1
logiciel facture;1900;6.6;12;1
logiciel devis facture batiment;1300;11.01;29;1
logiciel facturation auto entrepreneur;1300;2.81;38;1
logiciel devis facture gratuit;1300;5.74;61;1
logiciel facturation btp;720;7.72;44;0
logiciel facturation batiment;720;9.43;25;1
logiciel de facturation en ligne;880;7.89;72;1""",
("daf", "notes-de-frais"): """note de frais;5400;9.1;23;1
notes de frais;2400;9.1;23;1
gestion des notes de frais;1300;27.57;19;1
logiciel note de frais;1300;22.6;31;1
modele note de frais;1000;1.28;18;1
note de frais kilometrique;880;0.73;14;1
logiciel notes de frais;720;21.57;34;1
application note de frais;590;11.22;29;1
note de frais exemple;590;1.33;20;1
gestion notes de frais;480;22.92;31;1
logiciel de note de frais;480;21.57;31;0
application notes de frais;390;10.86;35;1
application pour note de frais;320;10.86;28;1
comment faire une note de frais;320;1.81;14;1
comptabilisation note de frais;320;0.56;14;1
logiciel gestion note de frais;320;19.6;29;1
ndf;1900;12.52;20;0
jenji;9900;4.56;30;1
n2f note de frais;1300;20.16;23;2
notilus note de frais;1300;5.01;20;1
cleemy note de frais;1000;0.19;22;1
lucca note de frais;1000;2.02;21;0
jenji note de frais;720;7.07;26;2
expensya note de frais;590;3.72;19;2""",
("daf", "comptabilite"): """logiciel comptabilité;4400;3.97;40;0
logiciel comptable;2900;4.82;42;1
logiciel de comptabilité;2400;4.6;44;1
logiciel comptabilité gratuit;1900;1.97;30;1
logiciel comptable sage;1300;5.47;33;1
logiciel comptabilité association;1000;2.69;25;1
logiciel expert comptable;1000;4.5;20;1
logiciel comptabilité auto entrepreneur;720;2.96;27;1
logiciel comptabilité en ligne;720;5.37;39;1
logiciel comptabilité pme;590;4.09;8;1
logiciel comptabilité sci;590;3.92;19;0
logiciel comptabilité mac;590;3.93;16;1
logiciel comptabilité entreprise;590;5.38;32;1
comptable en ligne;3600;10.03;35;0
logiciel bi pme;3600;0;13;1""",
("daf", "rapprochement-bancaire"): """rapprochement bancaire;2400;0.92;26;1
etat de rapprochement bancaire;480;1.15;36;1
logiciel rapprochement bancaire;320;7.1;21;1
rapprochement bancaire exemple;260;0.32;22;1
comment faire un rapprochement bancaire;170;0.6;22;1
logiciel de rapprochement bancaire;140;9.6;13;1""",
("daf", "recouvrement"): """recouvrement de créances;2400;1.69;12;1
recouvrement amiable;1300;1.28;39;1
logiciel recouvrement;390;9.4;19;1""",
("daf", "pilotage"): """prévisionnel;2900;2.73;19;1
budget prévisionnel;1900;2.45;31;1
bilan prévisionnel;1000;2.56;25;1
prévisionnel financier;880;1.98;33;1
compte de résultat prévisionnel;720;1.64;25;1
prévisionnel comptable;720;2.8;19;1
compte d'exploitation prévisionnel;390;1.51;27;1
tableau prévisionnel à remplir gratuit;320;1.26;15;1
modèle budget prévisionnel excel gratuit;320;0.7;24;1""",
("cession", "cession"): """vendre son entreprise;720;2.78;33;1
comment vendre son entreprise;260;1.53;26;1
vendre mon entreprise;210;4.06;31;1
vendre une entreprise;210;1.59;24;1
vendre sa société;210;4.22;27;1
céder son entreprise;320;2.25;19;1
cession entreprise;1900;0.64;59;0
cession d'entreprise;1300;0.78;49;1
entreprise cession;880;0.64;13;1
accompagnement cession entreprise;140;2.55;19;1
cession entreprise individuelle;140;1.66;15;1
loi hamon cession entreprise;140;0;17;1
bpi cession entreprise;170;1.19;33;1
protocole de cession;90;0;11;1
cession pme;18100;0.25;25;2""",
("cession", "valorisation"): """valorisation entreprise;880;1.26;24;1
valoriser une entreprise;390;1.26;9;1
comment valoriser une entreprise;320;0.6;22;1
valorisation d'entreprise;260;1.54;26;1
calcul valorisation entreprise;210;0.48;13;1
valorisation d'une entreprise;210;0.56;20;1
3 méthodes de valorisation d'une entreprise;110;0.64;18;1
méthode valorisation entreprise;90;0.54;24;1
valorisation entreprise ebitda;90;0.65;7;1
exemple calcul valorisation entreprise;90;0.56;13;1
simulateur valorisation entreprise;50;0.59;6;1
estimation entreprise;110;1.31;24;1
multiple ebitda;70;1.01;12;1""",
("cession", "transmission"): """transmission d'entreprise;1000;1.41;44;1
transmission entreprise;1000;0.82;51;1
transmission entreprise familiale;590;1.01;28;1
accompagnement transmission entreprise;210;3.82;19;1
transmission entreprise père fils;110;1.1;31;1
pacte dutreil;8100;0.09;23;1""",
("cession", "fonds-de-commerce"): """fond de commerce;6600;0.28;24;1
fonds de commerce;2900;0.28;36;1
vente fond de commerce;1900;0.58;21;1
cession de fonds de commerce;1300;0.51;26;1
cession fonds de commerce;1300;0.51;26;1
vente de fond de commerce;1300;0.78;26;1
cession fond de commerce;1000;0.51;32;1
vente de fonds de commerce;1000;0.58;31;1
nantissement fonds de commerce;880;1.2;23;1
fond de commerce définition;880;0.02;33;1
amortissement fonds de commerce;720;0.07;18;1
achat fond de commerce;880;0.35;27;1""",
("cession", "titres-et-juridique"): """cession de parts sociales;880;1.93;31;1
cession de parts sociales sarl;170;1.24;25;1
droit d'enregistrement cession de parts;140;0.38;17;1
cession de parts sociales plus value;110;0.15;23;1
garantie actif passif;390;0;15;1
garantie d'actif et de passif;210;0;13;1
earn out;1000;0.07;19;1
earn-out;320;0;20;1
lettre d'intention;1600;0.45;15;1
data room;1600;18.19;16;1
due diligence;6600;6.97;38;1
audit d'acquisition;210;0;9;1
owner buy out;320;0;19;1
lbo;33100;0.8;31;2""",
("cession", "fiscalite"): """apport cession;720;1.2;19;1
apport-cession 150-0 b ter;110;0.62;19;1
150-0 d ter;70;0;19;1
plus value cession titres;70;0;18;1
fiscalité cession entreprise;50;0.07;16;1""",
("cession", "conseils-cession"): """banque d'affaires;720;2.1;23;1
avocat transmission entreprise;320;4.57;6;1
cabinet cession entreprise;140;2.59;14;1
avocat cession entreprise;110;8.06;9;0
cabinet conseil cession d'entreprise;90;2.97;13;1
conseil transmission entreprise;110;0;21;1""",
("cession", "reprise"): """reprise d'entreprise;2400;0.46;51;1
entreprise a vendre;1600;0.23;35;0
entreprise à vendre;880;0.37;44;3
entreprise à vendre 1 euro;590;0.51;13;1
entreprise btp à vendre;170;0.2;8;3
entreprise de transport a vendre;170;0.19;19;0""",
}

QUESTIONS = {
("daf", "tresorerie"): """comment gérer la trésorerie d'une entreprise;20
comment calculer la trésorerie d'une entreprise;20
comment améliorer la trésorerie d'une entreprise;20
comment placer sa trésorerie d'entreprise;20
comment trouver de la trésorerie pour une entreprise;20
combien de trésorerie pour entreprise;20
comment analyser la trésorerie d'une entreprise;30""",
("daf", "facturation-electronique"): """comment choisir sa plateforme agréée;170
comment déclarer sa plateforme agréée;110
quelles sont les plateformes agréées pour la facturation électronique;110
comment changer de plateforme agréée;70
quelle plateforme agréée choisir;70
peut on avoir plusieurs plateforme agréée;50
peut on changer de plateforme agréée;50
comment s inscrire sur une plateforme agréée;30
qui est concerné par la facturation électronique;480
comment faire une facture électronique;320
qui n est pas concerné par la facturation électronique;210""",
("daf", "notes-de-frais"): """comment faire une note de frais;320
comment faire une note de frais kilométrique;70
comment comptabiliser une note de frais;70
comment gérer les notes de frais d'une pme;40
comment digitaliser les notes de frais;20
est-ce que les notes de frais sont imposables;20""",
("daf", "rapprochement-bancaire"): """comment faire un rapprochement bancaire;170""",
("cession", "cession"): """comment vendre son entreprise;260
combien vendre son entreprise;70
qui contacter pour vendre son entreprise;40
comment vendre son entreprise rapidement;40
comment estimer son entreprise pour la vendre;20
comment vendre son entreprise individuelle;20
comment vendre son entreprise sarl;20
comment vendre son entreprise sas;20
quand vendre son entreprise;20
pourquoi vendre son entreprise;20""",
("cession", "fonds-de-commerce"): """comment estimer un fond de commerce;260
comment vendre son fond de commerce;210
combien de temps pour vendre un fond de commerce;90
comment evaluer un fond de commerce;70
comment calculer la valeur d'un fond de commerce;30
qui peut estimer un fond de commerce;30
que comprend la vente d un fond de commerce;30
je n'arrive pas à vendre mon fond de commerce;30""",
}

BRANDS = ("jenji", "n2f", "notilus", "cleemy", "lucca", "expensya", "pennylane", "qonto", "shine", "indy", "sage")

def page_type(kw, cluster):
    k = kw.lower()
    if k.split()[0] in BRANDS or any(k.startswith(b + " ") for b in BRANDS) or k in BRANDS:
        return "software_review"
    if any(w in k for w in ("simulateur", "calcul ")):
        return "simulator"
    if any(w in k for w in ("modele", "modèle", "tableau prévisionnel", "excel")):
        return "resource"
    if any(w in k for w in ("cabinet", "avocat", "banque d'affaires", "conseil transmission", "accompagnement")):
        return "provider_directory"
    if any(w in k for w in ("logiciel", "application", "plateforme", "comparatif", "annuaire", "liste ")):
        return "facet_landing" if any(w in k for w in ("gratuit", "auto entrepreneur", "association", "btp", "batiment", "pme", "sci", "mac", "micro")) else "category_ranking"
    if any(w in k for w in ("définition", " def", "earn", "garantie", "lbo", "data room", "due diligence", "ndf", "owner buy")):
        return "glossary"
    return "guide"

def priority(v, cpc, kd, intent):
    w = 1.5 if intent in ("commercial", "transactional") else 1.0
    return round(v * (1 + cpc / 5.0) * w / (kd + 10.0), 2)

def q(s): return "'" + s.replace("'", "''") + "'"

rows = []
for (portail, cluster), block in RAW.items():
    seen = set()
    for line in block.strip().splitlines():
        kw, vol, cpc, kd, ic = line.split(";")
        kw = kw.strip().lower()
        if kw in seen: continue
        seen.add(kw)
        intent = INTENT.get(ic.strip().split(",")[0], "informational")
        if page_type(kw, cluster) in ("category_ranking", "facet_landing") and intent == "informational":
            intent = "commercial"
        rows.append(dict(keyword=kw, volume=int(vol), cpc=float(cpc), kd=int(kd), intent=intent, portail=portail,
                         cluster=cluster, page_type=page_type(kw, cluster),
                         priority=priority(int(vol), float(cpc), int(kd), intent)))
rows.sort(key=lambda r: (r["portail"], -r["priority"]))

with open(os.path.join(ROOT, "docs/seo/keywords-fr-2026-11-v2.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["keyword", "volume", "cpc_eur", "kd", "intent", "portail", "cluster", "page_type_suggere", "priorite"])
    for r in rows:
        w.writerow([r["keyword"], r["volume"], r["cpc"], r["kd"], r["intent"], r["portail"], r["cluster"], r["page_type"], r["priority"]])

qrows = []
for (portail, cluster), block in QUESTIONS.items():
    for line in block.strip().splitlines():
        text, vol = line.rsplit(";", 1)
        qrows.append((portail, cluster, text.strip(), int(vol)))
with open(os.path.join(ROOT, "docs/seo/questions-fr-2026-11.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["portail", "cluster", "question", "volume"])
    w.writerows(qrows)

sql = ["-- Généré par scripts/seo-build.py — Semrush FR, novembre 2026. Idempotent : rejoué à chaque déploiement.",
       "-- Met à jour volume / CPC / KD / intention / cluster sans toucher au statut ni à la page cible.",
       "insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values"]
sql.append(",\n".join(f"  ({q(SITES[r['portail']])}, {q(r['keyword'])}, {r['volume']}, {r['cpc']}, {r['kd']}, {q(r['intent'])}, {q(r['cluster'])}, 'semrush', '2026-11-07')" for r in rows))
sql.append("""on conflict (site_id, keyword) do update set
  volume = excluded.volume, cpc_eur = excluded.cpc_eur, kd = excluded.kd, intent = excluded.intent,
  cluster = coalesce(public.keyword_targets.cluster, excluded.cluster), refreshed_at = excluded.refreshed_at;
""")
sql.append("insert into public.keyword_questions (site_id, cluster, question, volume, source) values")
sql.append(",\n".join(f"  ({q(SITES[p])}, {q(c)}, {q(t)}, {v}, 'semrush')" for p, c, t, v in qrows))
sql.append("on conflict (site_id, question) do update set volume = excluded.volume, cluster = excluded.cluster;\n")
with open(os.path.join(ROOT, "supabase/data/10_seo_keywords.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print(f"{len(rows)} mots-clés, {len(qrows)} questions")
for p in ("daf", "cession"):
    pr = [r for r in rows if r["portail"] == p]
    print(p, len(pr), "mots-clés, volume cumulé", sum(r["volume"] for r in pr))
