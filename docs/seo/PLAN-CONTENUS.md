# Plan de contenus SEO — données Semrush FR (novembre 2026)

Source : 22 relevés Semrush (base France), 7 nov. 2026. Données brutes triées :
`docs/seo/keywords-fr-2026-11-v2.csv` (196 mots-clés) et `docs/seo/questions-fr-2026-11.csv` (43 questions).
Chargées en base à chaque déploiement (`supabase/data/10_seo_keywords.sql`) : back-office → **SEO → Plan de production**,
briefs pré-remplis, contexte de l'agent de rédaction. Régénérer : `python3 -I scripts/seo-build.py`.

**Priorité** = volume × (1 + CPC/5) × (1,5 si intention commerciale) ÷ (KD + 10) — favorise le trafic accessible et monétisable.

## Lecture stratégique

1. **Plateforme agréée = la meilleure opportunité du réseau.** « plateforme agréée facturation électronique » :
   5 400 recherches/mois pour une difficulté de **11/100**. Le cluster complet dépasse 15 000 recherches,
   avec la réforme en cours (émission obligatoire des PME en septembre 2027) : la demande va encore monter.
   → Publier en premier : le comparatif, « comment choisir », « liste des plateformes agréées », la sélection « gratuite ».
2. **Notes de frais = le trafic le mieux payé.** CPC de 20 à 27 € sur « gestion des notes de frais », « logiciel note de frais »,
   pour des difficultés de 19 à 34. Les recherches de marque (Jenji 9 900, N2F, Notilus, Cleemy, Lucca, Expensya : ~15 000 au total)
   alimenteront des pages **avis** — après de vrais tests uniquement.
3. **Trésorerie = gains rapides.** Difficulté 13 à 24, CPC 12 à 20 € : comparatif + sélection « gratuit » + guides
   (plan de trésorerie, tableau de flux, budget de trésorerie : ~3 000 recherches).
4. **Guides à fort volume et faible difficulté** pour attirer les DAF : « recouvrement de créances » (2 400, KD 12),
   « prévisionnel » (2 900, KD 19), « rapprochement bancaire » (2 400, KD 26), « note de frais » (5 400, KD 23).
   Chaque guide renvoie vers le comparatif de sa catégorie (maillage automatique par cluster).
5. **Cession : le volume est dans le vocabulaire.** « pacte Dutreil » (8 100, KD 23), « fonds de commerce » (6 600, KD 24),
   « due diligence » (6 600), « lettre d'intention » (1 600, KD 15), « data room » (1 600), « earn-out » (1 300 au total, KD ~20).
   → Un lexique et des guides pratiques sur chaque terme, tous rattachés au dossier pilier « Vendre sa société ».
6. **Nouvelle catégorie monétisable repérée : logiciels de data room** (CPC 18 €, KD 16) sur le portail Cession —
   des éditeurs solvables qui ciblent exactement les cédants et leurs conseils.
7. **Garde-fous** : fonds de commerce, cession de parts, Dutreil et fiscalité = contenu d'information générale uniquement
   (loi Hoguet, conseil fiscal : ARCHITECTURE §9). Aucune mise en relation rémunérée tant que la revue juridique n'est pas faite.

## Radar Finances — valeur par cluster

| Cluster | Mots-clés | Volume cumulé | Valeur pub. mensuelle (vol. × CPC) |
|---|---|---|---|
| notes-de-frais | 24 | 34 520 | 308 303 € |
| facturation-electronique | 26 | 71 830 | 148 816 € |
| comptabilite | 15 | 25 900 | 112 854 € |
| facturation | 10 | 18 020 | 105 593 € |
| tresorerie | 26 | 13 430 | 80 149 € |
| pilotage | 9 | 9 150 | 21 287 € |
| recouvrement | 3 | 4 090 | 9 386 € |
| rapprochement-bancaire | 6 | 3 770 | 6 561 € |

## Radar Finances — 25 pages prioritaires

| # | Mot-clé | Vol./mois | CPC | KD | Page à créer | Cluster |
|---|---|---|---|---|---|---|
| 1 | plateforme agréée facturation électronique | 5 400 | 2.96 € | 11 | Comparatif | facturation-electronique |
| 2 | jenji | 9 900 | 4.56 € | 30 | Avis logiciel | notes-de-frais |
| 3 | facture electronique | 22 200 | 1.93 € | 56 | Guide | facturation-electronique |
| 4 | note de frais | 5 400 | 9.10 € | 23 | Guide | notes-de-frais |
| 5 | comptable en ligne | 3 600 | 10.03 € | 35 | Guide | comptabilite |
| 6 | ndf | 1 900 | 12.52 € | 20 | Lexique | notes-de-frais |
| 7 | logiciel facture | 1 900 | 6.60 € | 12 | Comparatif | facturation |
| 8 | gestion des notes de frais | 1 300 | 27.57 € | 19 | Guide | notes-de-frais |
| 9 | logiciel note de frais | 1 300 | 22.60 € | 31 | Comparatif | notes-de-frais |
| 10 | logiciel comptabilité | 4 400 | 3.97 € | 40 | Comparatif | comptabilite |
| 11 | logiciel bi pme | 3 600 | 0.00 € | 13 | Sélection (facette) | comptabilite |
| 12 | logiciel de facturation | 4 400 | 4.79 € | 49 | Comparatif | facturation |
| 13 | notes de frais | 2 400 | 9.10 € | 23 | Guide | notes-de-frais |
| 14 | n2f note de frais | 1 300 | 20.16 € | 23 | Avis logiciel | notes-de-frais |
| 15 | logiciel comptable | 2 900 | 4.82 € | 42 | Comparatif | comptabilite |
| 16 | logiciel devis facture batiment | 1 300 | 11.01 € | 29 | Sélection (facette) | facturation |
| 17 | prévisionnel | 2 900 | 2.73 € | 19 | Guide | pilotage |
| 18 | recouvrement de créances | 2 400 | 1.69 € | 12 | Guide | recouvrement |
| 19 | plateforme facture electronique | 3 600 | 2.76 € | 49 | Comparatif | facturation-electronique |
| 20 | plateforme agréée | 2 400 | 3.48 € | 35 | Comparatif | facturation-electronique |
| 21 | logiciel facturation gratuit | 3 600 | 3.55 € | 60 | Sélection (facette) | facturation |
| 22 | logiciel de trésorerie | 590 | 20.19 € | 24 | Comparatif | tresorerie |
| 23 | logiciel notes de frais | 720 | 21.57 € | 34 | Comparatif | notes-de-frais |
| 24 | logiciel de comptabilité | 2 400 | 4.60 € | 44 | Comparatif | comptabilite |
| 25 | logiciel devis facture | 1 900 | 7.62 € | 48 | Comparatif | facturation |

## Céder ma société — valeur par cluster

| Cluster | Mots-clés | Volume cumulé | Valeur pub. mensuelle (vol. × CPC) |
|---|---|---|---|
| titres-et-juridique | 14 | 46 650 | 104 355 € |
| cession | 15 | 24 790 | 13 302 € |
| fonds-de-commerce | 12 | 20 660 | 8 624 € |
| conseils-cession | 6 | 1 490 | 4 491 € |
| transmission | 6 | 11 010 | 4 478 € |
| valorisation | 13 | 2 880 | 2 883 € |
| reprise | 6 | 5 810 | 2 165 € |
| fiscalite | 5 | 1 020 | 936 € |

## Céder ma société — 25 pages prioritaires

| # | Mot-clé | Vol./mois | CPC | KD | Page à créer | Cluster |
|---|---|---|---|---|---|---|
| 1 | lbo | 33 100 | 0.80 € | 31 | Lexique | titres-et-juridique |
| 2 | cession pme | 18 100 | 0.25 € | 25 | Guide | cession |
| 3 | due diligence | 6 600 | 6.97 € | 38 | Lexique | titres-et-juridique |
| 4 | data room | 1 600 | 18.19 € | 16 | Lexique | titres-et-juridique |
| 5 | pacte dutreil | 8 100 | 0.09 € | 23 | Guide | transmission |
| 6 | fond de commerce | 6 600 | 0.28 € | 24 | Guide | fonds-de-commerce |
| 7 | lettre d'intention | 1 600 | 0.45 € | 15 | Guide | titres-et-juridique |
| 8 | vente fond de commerce | 1 900 | 0.58 € | 21 | Guide | fonds-de-commerce |
| 9 | fonds de commerce | 2 900 | 0.28 € | 36 | Guide | fonds-de-commerce |
| 10 | entreprise a vendre | 1 600 | 0.23 € | 35 | Guide | reprise |
| 11 | cession entreprise | 1 900 | 0.64 € | 59 | Guide | cession |
| 12 | entreprise cession | 880 | 0.64 € | 13 | Guide | cession |
| 13 | reprise d'entreprise | 2 400 | 0.46 € | 51 | Guide | reprise |
| 14 | vente de fond de commerce | 1 300 | 0.78 € | 26 | Guide | fonds-de-commerce |
| 15 | cession de fonds de commerce | 1 300 | 0.51 € | 26 | Guide | fonds-de-commerce |
| 16 | cession fonds de commerce | 1 300 | 0.51 € | 26 | Guide | fonds-de-commerce |
| 17 | avocat transmission entreprise | 320 | 4.57 € | 6 | Annuaire | conseils-cession |
| 18 | earn out | 1 000 | 0.07 € | 19 | Lexique | titres-et-juridique |
| 19 | nantissement fonds de commerce | 880 | 1.20 € | 23 | Guide | fonds-de-commerce |
| 20 | valorisation entreprise | 880 | 1.26 € | 24 | Guide | valorisation |
| 21 | banque d'affaires | 720 | 2.10 € | 23 | Annuaire | conseils-cession |
| 22 | apport cession | 720 | 1.20 € | 19 | Guide | fiscalite |
| 23 | cession de parts sociales | 880 | 1.93 € | 31 | Guide | titres-et-juridique |
| 24 | entreprise à vendre 1 euro | 590 | 0.51 € | 13 | Guide | reprise |
| 25 | vente de fonds de commerce | 1 000 | 0.58 € | 31 | Guide | fonds-de-commerce |

## Méthode de production

> **Une page par intention, pas par mot-clé.** Les variantes (« logiciel note de frais », « logiciel notes de frais »,
> « logiciel de note de frais »…) sont servies par la même page : le premier mot-clé devient le mot-clé principal,
> les autres vont dans les requêtes secondaires du brief. La base empêche deux pages de viser le même mot-clé principal.

1. Back-office → **SEO** : choisir un mot-clé « sans page » → **créer la page** (type suggéré dans le CSV).
2. Le **brief** est pré-rempli avec les requêtes secondaires et les questions du cluster : l'éditeur le valide.
3. **Agent de rédaction** (ou rédaction humaine) → brouillon ; **contrôle qualité** ; checklist SEO ; validation humaine.
4. Les comparatifs et avis ne sont publiés qu'après des **tests réels** saisis dans le back-office.
5. Rafraîchir les données chaque trimestre (relancer les relevés Semrush, puis `scripts/seo-build.py`).
