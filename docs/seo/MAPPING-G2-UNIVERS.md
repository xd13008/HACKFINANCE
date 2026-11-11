# Catégories finance de G2 → univers et sous-rubriques de Radar Finances

Relevé du 11 novembre 2026. G2 bloque la lecture automatique de ses pages : les catégories ci-dessous viennent des pages
G2 indexées par les moteurs de recherche (page « Accounting & Finance Software », classements annuels, pages de catégories).
**Confirmé** = catégorie G2 vue dans ces pages. **À confirmer** = catégorie G2 probable, non vue dans le relevé :
l'éditeur la vérifie sur [g2.com/fr/categories](https://www.g2.com/fr/categories) avant de s'en servir.

Usage : vocabulaire de référence pour (1) nommer et découper nos sous-rubriques, (2) rattacher les notes G2 à la bonne
catégorie, (3) préparer le branchement de l'API de syndication G2 (correspondance produit ↔ catégorie).

## 1. Correspondance par univers

| Univers | Catégorie G2 (statut) | Notre sous-rubrique | Décision |
|---|---|---|---|
| **1. Comptabilité, clôture & conformité** | Accounting (confirmé) | `comptabilite` | Correspond |
| | Financial Close (confirmé) | `consolidation` | **Renommer** en « Clôture et consolidation » : chez G2, la consolidation est une fonction des outils de clôture |
| | Financial Reconciliation (confirmé) | `rapprochement-bancaire` | Correspond (élargir : rapprochements comptables) |
| | Invoice Management (confirmé), e-invoicing (à confirmer) | `facturation-electronique` | Correspond ; garder le critère français « plateforme agréée » |
| | Financial Audit (confirmé) | — | **Nouvelle sous-rubrique candidate** : audit et contrôle interne |
| | Tax compliance / TVA (à confirmer) | — | Candidate : fiscalité et TVA (à valider par Semrush) |
| | E-signature, Document Management (à confirmer) | `signature-electronique`, `ged` | Correspond |
| | Comptabilité spécialisée : distribution, industrie, hôtellerie (confirmé) | — | Facettes de `comptabilite`, pas de sous-rubrique |
| **2. Trésorerie & cash** | Cash Management (confirmé) | `tresorerie` | Correspond |
| | Treasury Management Systems (confirmé) | `communication-bancaire` | Correspond (TMS, groupes) |
| | Financial Fraud Prevention (confirmé) | — | **Nouvelle sous-rubrique candidate** : prévention de la fraude aux paiements (faux RIB, fraude au président) |
| | Business Payments, Cross-border Payments, Currency Exchange (confirmé) | — | **À valider juridiquement** (services de paiement, change) : contenu seul pour l'instant |
| **3. Dépenses & achats** | Expense Management, Mileage (confirmé) | `notes-de-frais` | Correspond ; indemnités kilométriques en facette |
| | Travel Management (confirmé) | — | Facette ou sous-rubrique « voyages d'affaires » (à valider par Semrush) |
| | Spend Management (confirmé) | `cartes-entreprise` | Correspond |
| | Accounts Payable Automation (confirmé) | `achats` (en partie) | **Nouvelle sous-rubrique candidate** : automatisation des factures fournisseurs, distincte des achats |
| | Procurement / Purchasing (confirmé, rubrique Procurement) | `achats` | Correspond |
| | SaaS Management (à confirmer) | `gestion-abonnements-saas` | Correspond |
| **4. Encaissement** | Billing (confirmé) | `facturation` | Correspond |
| | Accounts Receivable (confirmé) | `recouvrement` (en partie) | **Renommer** en « Relances et poste clients » pour couvrir l'automatisation des comptes clients |
| | Credit and Collections (confirmé) | `recouvrement`, `information-solvabilite` | Correspond |
| | Revenue Management (confirmé) | — | Facette « abonnements » de `facturation` |
| | Deduction Management (confirmé) | — | Écarté : propre à la grande distribution |
| **5. Pilotage & performance** | FP&A, Budgeting and Forecasting (confirmé) | `pilotage-financier` | Correspond ; « budget » et « prévisions » en facettes |
| | Financial Analysis (confirmé), Business Intelligence (à confirmer) | `reporting-bi` | Correspond |
| | Business Plan (confirmé) | — | Facette de `pilotage-financier` ; pas d'usage pour une levée de fonds (règle 5) |
| **6. Équipe finance & expertise** | Accounting Practice Management (confirmé) | — | Écarté : outil des cabinets, pas des DAF |
| **7. Financement, aides & risques** | Equity Management, Stock Plan Administration (confirmé) | — | **Hors périmètre** tant que la revue juridique n'est pas faite (proche de la levée de fonds, règle 5) |
| | Financial Services : banque, prêt, investissement (confirmé) | — | **Exclu** (règle 5 : crédit, assurance, placements = information seule) |
| **8. RSE & performance durable** | ESG Reporting, Carbon Accounting (à confirmer) | `reporting-esg` | Correspond |

## 2. Ce que le relevé change

- **Couverture** : 18 de nos 21 sous-rubriques de logiciels ont un équivalent dans les catégories finance de G2.
  Exceptions : `logiciels-cir-cii` (spécifique à la France), `automatisation-ia-finance` (transversal) et
  `plateformes-lms` (rangée par G2 hors finance, à confirmer).
- **4 nouvelles sous-rubriques candidates**, par ordre d'intérêt pour un DAF :
  1. Prévention de la fraude aux paiements (Trésorerie & cash)
  2. Automatisation des factures fournisseurs (Dépenses & achats)
  3. Audit et contrôle interne (Comptabilité)
  4. Fiscalité et TVA (Comptabilité)
- **2 renommages** : « Clôture et consolidation », « Relances et poste clients ».
- **Exclusions confirmées** : services financiers (banque, prêt, investissement), gestion de capital et plans d'actions,
  paiements et change tant que la revue juridique n'est pas faite.

## 3. Prochaines étapes

1. Mesurer les volumes de recherche français des 4 candidates (Semrush) avant de les créer.
2. Créer les sous-rubriques retenues en brouillon (`supabase/data`), avec grille de critères et brief.
3. Lors du branchement de la syndication G2 : utiliser ce tableau comme table de correspondance des catégories.

Sources : [G2 – toutes les catégories](https://www.g2.com/categories),
[G2 – Accounting & Finance](https://www.g2.com/categories/accounting-finance),
[G2 – classement Accounting and Finance 2026](https://www.g2.com/best-software-companies/top-accounting-and-finance),
[G2 – Expense Management](https://www.g2.com/categories/expense-management),
[G2 – Spend Management](https://www.g2.com/categories/spend-management),
[G2 – Financial Analysis](https://www.g2.com/categories/financial-analysis).
