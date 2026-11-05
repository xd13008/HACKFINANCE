# Réseau de portails média B2B — Architecture

_v2 · 4 nov. 2026 · @xav — remplace la v1 « Portail finance des PME »_

**Noms et domaines retenus :** Radar Finances (`radarfinances.com`) et Céder ma société (`cedermasociete.com`) — un domaine par portail, un seul dépôt et un seul back-office. Domaines achetés le 5 nov. 2026.

## 1. Synthèse

Nous construisons un **réseau de portails média B2B** sur une seule plateforme : un code, un back-office, une base. Chaque portail combine trois briques :

1. **Un média** : guides, comparatifs, tests réels, notes éditoriales indépendantes. C'est le moteur SEO.
2. **Un annuaire** : logiciels et prestataires référencés. Le référencement de base est gratuit, et des formats payants donnent plus de visibilité.
3. **Une régie** : positions sponsorisées signalées, fiches enrichies, puis leads. C'est le moteur de revenus.

Le modèle s'inspire de Hackceleration (tests d'outils, pages « avis », « meilleur », « alternatives », « combien coûte », visibilité vendue aux éditeurs). On reprend la logique, pas les textes, la marque ni la charte.

**Lancement : deux portails.**

| Portail | Public | Promesse | Monétisation principale |
|---|---|---|---|
| **Finance & DAF** | DAF, RAF, dirigeants de PME | Choisir ses outils et prestataires finance | Positions sponsorisées, affiliation, fiches enrichies (CPC élevés : note de frais 21,6 €, trésorerie 14 à 20 €, compte pro 24,5 €) |
| **Vendre ma société** | Dirigeants cédants de TPE/PME | Préparer, valoriser et réussir sa cession | Visibilité des conseils en cession, banques d'affaires et plateformes d'annonces, puis leads qualifiés (CPC faibles, entre 0,2 et 2,8 €, mais forte valeur par lead) |

Les trois principes restent inchangés :

- **Le média** produit l'information et la note éditoriale.
- **Le commercial** vend de la visibilité signalée, sans jamais pouvoir modifier une note ni un classement éditorial.
- **L'intermédiation** (crédit, paiement, assurance, mise en relation de cession) reste un module isolé, désactivé tant que son cadre juridique n'est pas validé.

| Niveau | Contenu | Condition |
|---|---|---|
| V1 | Plateforme multi-portails, 2 portails, fiches, comparatifs, duels, alternatives, prix, guides, simulateurs, ressources, annuaire (logiciels et prestataires, référencement gratuit), demandes de référencement et de publicité, moteur SEO, analytics, back-office | Méthode de notation publiée, mentions de transparence |
| V2 | Positions sponsorisées et fiches enrichies payantes, contrats, classements de professionnels, labels, agents | Revue déontologique par métier, CGV annonceurs |
| V3 | Leads vers logiciels et prestataires, abonnements formation (Stripe), forum | Consentement, contrats partenaires, revue juridique |
| Plus tard | Crédit, compte pro rémunéré au lead, assurance, mise en relation de cession rémunérée | Statut réglementaire adapté (voir §9) |

## 2. Benchmark et données de marché (Semrush, base FR, nov. 2026)

**Hackceleration.** Semrush estime son trafic organique FR à environ 2 700 visites par mois. 55 % vient d'une seule page (`/labs/avis/grok`), et l'essentiel du reste porte sur des outils d'IA et de no-code. Ses gabarits sont `/labs/avis/[outil]`, `/labs/meilleur/[categorie]`, `/labs/alternatives/[outil]`, `/labs/combien-coute-[outil]` et `/ressources/integrations/...`. **Conclusion :** le modèle de pages est bon, mais leur trafic reste faible et concentré, et ils ne couvrent pas la finance. Le terrain est libre.

**Concurrence sur nos SERP.**
- Sur « logiciel note de frais », le top 10 ne contient que des éditeurs et des blogs d'éditeurs (Jenji, Qonto, N2F, Indy, Lucca, Sage). **Aucun comparateur indépendant n'y figure.**
- Sur « vendre son entreprise », on trouve surtout des institutions (CCI, Bpifrance, service-public) et des plateformes d'annonces (CessionPME, Transentreprise). Il manque un média pratique et indépendant.

**Mots-clés clés.** Le fichier complet est `docs/seo/keywords-fr-2026-11.csv`. Il sert à importer la table `keyword_targets`.

| Cluster | Exemples (volume/mois · CPC · KD) | Lecture |
|---|---|---|
| Facturation électronique | facturation électronique 33 100 · 1,9 € · 60 ; plateforme agréée 5 400 · 3,0 € · 37 ; PDP 1 300 | **Porte d'entrée n° 1.** La réforme est en cours : réception obligatoire depuis le 1er sept. 2026, émission pour les PME au 1er sept. 2027. Fort besoin de comparer les plateformes agréées. |
| Trésorerie | logiciel de gestion de trésorerie 720 · 16,9 € · 19 ; logiciel trésorerie 480 · 14,2 € · 13 | Très monétisable, KD faible : gains rapides |
| Notes de frais | logiciel note de frais 1 300 · 21,6 € · 30 | Le CPC le plus élevé du portail, sans comparateur en face |
| Comptabilité, facturation | logiciel comptabilité 4 400 · KD 41 ; logiciel facturation 2 900 · KD 52 | Volume, mais plus concurrentiel. Passer par les facettes (gratuit, TPE, BTP…) |
| Rapprochement, recouvrement, consolidation, FP&A | 390 · 8,4 € · 12 ; 390 · 9,4 € · 19 ; 110 · 11,9 € · 18 | Longue traîne DAF à faible KD |
| Banque pro | compte pro 4 400 · 24,5 € · 55 | Très rentable, mais réglementé (IOBSP, services de paiement), voir §9 |
| Cession | cession pme 18 100 (en partie la marque CessionPME) ; vendre son entreprise 720 · KD 33 ; céder son entreprise 320 · KD 19 ; valorisation entreprise 880 · KD 22 | Volume informationnel, KD modéré : contenu pratique et simulateurs |
| Fonds de commerce | fond de commerce 6 600 ; cession fond de commerce 1 300 · KD 34 | Gros volume, mais intermédiation soumise à la loi Hoguet |

## 3. Verticales à potentiel (au-delà des deux portails de lancement)

Score indicatif : volume × CPC (potentiel de revenus) ÷ difficulté. Tous les portails partagent les mêmes gabarits et le même back-office. Ouvrir une verticale revient à configurer un nouveau site.

| Rang | Verticale (portail candidat) | Signaux Semrush | Monétisation | Réglementation |
|---|---|---|---|---|
| 1 | **RH & Paie** (SIRH, paie, planning, recrutement) | sirh 12 100 · KD 26 ; logiciel rh 3 600 · 13 € · KD 30 ; paie 1 300 · 11,3 € | Éditeurs nombreux et solvables, affiliation | Faible |
| 2 | **Juridique & création** (signature électronique, domiciliation, legaltech) | signature électronique 22 200 ; domiciliation 5 400 · 9 € | Affiliation forte (domiciliation, création) | Faible (pas de conseil juridique personnalisé) |
| 3 | **RSE & carbone** | logiciel rse 880 · 10,3 € · **KD 12** ; bilan carbone 1 300 · 7 € | Marché jeune poussé par la CSRD, peu de comparateurs | Faible |
| 4 | **Commercial & CRM / ERP** | crm 5 400 ; erp 6 600 ; gestion commerciale 2 400 · 7,4 € | Gros volume, concurrence (Appvizer, Capterra) | Faible |
| 5 | **Logiciels métiers** (BTP, gestion locative, transport, avocats, santé, restauration) | btp 1 900 ; gestion locative 1 000 · KD 21 ; transport 1 000 · KD 26 ; avocat 390 · KD 16 | Petites niches à faible KD, éditeurs peu exposés aux comparateurs | Faible |
| 6 | **Flotte & mobilité** | gestion flotte 880 · 10,7 € · KD 19 ; leasing entreprise 590 | Leasing et cartes carburant : fortes commissions | Moyenne (LOA/LLD peut relever de l'IOBSP) |
| 7 | **Assurance des entreprises** | rc pro 6 600 · 7,2 € ; mutuelle entreprise 6 600 · 14,6 € | Très forte valeur | **Élevée** : un comparateur rémunéré est un intermédiaire en assurance (ORIAS). Contenu seul tant que le statut n'est pas obtenu. |
| 8 | **Freelances & indépendants** | portage salarial 18 100 · KD 60 | Leads portage bien rémunérés | Moyenne |

**Recommandation.** Lancer Finance & DAF et Vendre ma société, puis ouvrir RH & Paie (forte proximité avec le public DAF), puis RSE (faible concurrence). L'assurance et la banque pro restent en contenu seul jusqu'à la revue juridique.

## 4. Plateforme multi-portails

- **Un seul projet Next.js** sert tous les portails. Le portail est déterminé par le nom de domaine (middleware), et chaque contenu porte un `site_id`.
- **Domaines :** un domaine par portail est recommandé (autorité thématique, promesse de marque distincte). L'option « un domaine et des sous-dossiers » reste possible sans changer le code (`sites.base_path`). La décision revient au fondateur.
- **Taxonomie commune :** `site → verticale → catégorie → sous-catégorie`, plus des **facettes** (taille d'entreprise, secteur, prix, fonctionnalité, intégration). Une même entité (logiciel, prestataire) peut appartenir à plusieurs catégories, voire à plusieurs portails.
- **La taxonomie est aussi la grille commerciale :** chaque catégorie et chaque facette indexable est un emplacement vendable. Le prix d'un emplacement dépend de la valeur de la catégorie (volume × CPC, données Semrush).

## 5. Site public : gabarits et URLs

Chaque gabarit répond à une intention de recherche. Les chemins sont relatifs au domaine du portail.

| Gabarit | URL | Intention ciblée | Exemple | Version |
|---|---|---|---|---|
| Accueil | `/` | Navigation | — | V1 |
| Catégorie (classement) | `/meilleurs-logiciels/[categorie]` | « meilleur logiciel X », « logiciel X » | /meilleurs-logiciels/tresorerie | V1 |
| Landing de facette | `/meilleurs-logiciels/[categorie]/[facette]` | « logiciel X gratuit », « … pour TPE », « … BTP » | /meilleurs-logiciels/facturation/gratuit | V1 |
| Fiche avis | `/logiciels/[slug]` | « avis X », « X » | /logiciels/agicap | V1 |
| Prix | `/logiciels/[slug]/prix` | « prix X », « combien coûte X » | | V1 |
| Alternatives | `/logiciels/[slug]/alternatives` | « alternative à X » | | V1 |
| Duel | `/comparer/[a]-vs-[b]` (slugs dans l'ordre alphabétique, l'ordre inverse redirige en 301) | « X vs Y » | | V1 |
| Guide | `/guides/[slug]` | Questions de DAF ou de cédant | /guides/facturation-electronique-pme-2027 | V1 |
| Dossier (page pilier) | `/dossiers/[slug]` | Requête tête de cluster | /dossiers/facturation-electronique | V1 |
| Simulateur | `/outils/[slug]` | « calcul », « simulateur », « estimation » | /outils/valorisation-entreprise, /outils/fiscalite-cession | V1 |
| Ressource | `/ressources/[slug]` | « modèle », « template » | prévisionnel, business plan, data room | V1 |
| Prestataire | `/prestataires/[metier]/[slug]` | « cabinet cession [ville] » | | V1 (fiche vérifiée, sans classement) |
| Annuaire de prestataires | `/prestataires/[metier]` et `/prestataires/[metier]/[ville]` | « expert-comptable [ville] », « banque d'affaires » | | V1 (liste, sans classement) |
| Glossaire | `/lexique/[terme]` | « qu'est-ce que … » | EBITDA, earn-out, BFR | V1 |
| Méthode et transparence | `/methode`, `/publicite`, `/a-propos`, `/mentions-legales`, `/donnees-personnelles` | Confiance (E-E-A-T) | | V1 |
| Référencement | `/referencer-mon-logiciel`, `/referencer-mon-cabinet` | Éditeurs et prestataires | | V1 |
| Publicité | `/publicite/annoncer` | Annonceurs | | V1 |
| Classements, trophées | `/classements/[metier]`, `/trophees/[annee]` | | | V2 |

**Portail Vendre ma société, contenus de départ :** un dossier « Vendre sa société, étape par étape », les simulateurs de valorisation (multiples d'EBE et de CA par secteur) et de fiscalité de la plus-value (avec avertissement : estimation générale, pas un conseil), un comparatif des plateformes d'annonces de cession, un annuaire des conseils en cession, banques d'affaires et avocats (sans classement en V1), des guides (préparer sa data room, LOI, garantie d'actif et de passif, earn-out, départ à la retraite, fonds de commerce ou titres) et un lexique.

**Portail Finance & DAF, catégories de départ :** facturation électronique (plateformes agréées), facturation, trésorerie, notes de frais, comptabilité, rapprochement bancaire, recouvrement, pilotage et FP&A, consolidation, achats, plus l'annuaire des experts-comptables (sans classement).

**Blocs obligatoires sur chaque fiche :** date du dernier test, nom du valideur, statut du test (« testé » ou « référencé, non testé »), sources datées, mention de tout lien commercial (affiliation, sponsoring, fiche enrichie).

## 6. Référencement dans l'annuaire et demandes de publicité

### 6.1 Demande de référencement (logiciels et prestataires)

```
Formulaire public ──► listing_requests (statut: nouvelle)
  /referencer-mon-logiciel      │  contrôles automatiques : SIREN (API Recherche d'entreprises),
  /referencer-mon-cabinet       │  domaine de l'e-mail = site déclaré, doublon
                                ▼
                       Back-office « Demandes » ── rejet (motif envoyé) 
                                │ acceptation
                                ▼
                 Fiche créée en brouillon « référencé, non testé »
                                │ validation éditeur
                                ▼
                 Fiche publiée (noindex tant qu'elle n'est pas assez riche)
                                │
                 Proposition commerciale (fiche enrichie, sponsoring) ─► module Commercial
```

- **Le référencement de base est gratuit et sans contrepartie.** L'annuaire reste complet, c'est une condition de sa crédibilité et de son SEO.
- **Revendication de fiche :** un éditeur ou un cabinet peut revendiquer sa fiche (vérification par e-mail sur son domaine) et proposer des corrections de faits. Chaque proposition passe par la file de validation avec sa source.
- **Le test réel est indépendant du paiement.** Un éditeur peut demander un test. S'il le paie pour l'accélérer, la fiche l'indique (« test réalisé à la demande de l'éditeur »), et la note suit la méthode publiée sans exception.
- **Prestataires de professions réglementées** (experts-comptables, avocats, CAC) : fiche factuelle seulement, aucun classement avant la revue déontologique par métier.

### 6.2 Demandes d'apparition sur les emplacements publicitaires

- **Inventaire publié** dans `/publicite` : catégorie sponsorisée (1 à 3 positions signalées au-dessus ou à côté du classement éditorial), fiche enrichie, encart dans les guides, newsletter, sponsoring de simulateur.
- **Formulaire** `/publicite/annoncer` vers `placement_requests` : annonceur, emplacements souhaités, catégories, période, budget.
- **Pipeline commercial dans le back-office :** nouvelle → qualifiée → devis envoyé → signé → actif → terminé ou perdu. Le back-office indique la disponibilité de chaque emplacement par période et calcule un prix indicatif à partir de la valeur de la catégorie.
- **Affichage :** une position sponsorisée affiche toujours la mention « Sponsorisé », dans un bloc distinct du classement éditorial. Le classement éditorial ne dépend que de la note.
- **Reporting annonceur :** impressions, clics sortants et taux de clic par emplacement, à partir des données analytics (§8).

## 7. Moteur SEO : les 7 piliers

Le SEO n'est pas une couche ajoutée à la fin : il est **intégré au modèle de données et à la file de validation**. Un contenu qui ne passe pas la checklist SEO ne peut pas être soumis.

### 7.1 Recherche de mots-clés pour piloter la production
- Table `keyword_targets` : mot-clé, volume, CPC, KD, intention, cluster, portail, page cible, statut (à couvrir, en cours, publié, positionné), position actuelle.
- Import CSV et API Semrush, puis rafraîchissement mensuel.
- **Score de priorité** = `volume × (1 + CPC / 5) × poids_intention ÷ (KD + 10)`. Le poids d'intention vaut 1,5 pour une intention commerciale ou transactionnelle, 1 pour une intention informationnelle.
- **Une seule page cible par mot-clé principal**, imposée par une contrainte d'unicité pour éviter la cannibalisation. Le back-office affiche le plan de production trié par score.

### 7.2 Brief SEO pour chaque contenu
- Table `seo_briefs` liée à `content_items` : requête principale, requêtes secondaires, questions « People also ask » (Semrush `phrase_questions`), plan Hn, entités à couvrir, concurrents du top 10, longueur indicative, liens internes obligatoires, CTA.
- Le brief sert d'entrée à l'agent Rédaction (V2). L'agent Contrôle qualité vérifie que le contenu le respecte.
- **Checklist bloquante avant soumission :** title (60 caractères max) et meta description (155 max) uniques, H1 unique contenant la requête, requête dans les 100 premiers mots, au moins 3 liens internes entrants et sortants, alt sur les images, sources datées, FAQ si le brief en prévoit une, données structurées valides.

### 7.3 Maillage interne automatique (depuis la taxonomie)
- Fil d'Ariane sur toutes les pages : site, verticale, catégorie, page.
- Catégorie ↔ fiches ↔ prix et alternatives ↔ duels générés entre les logiciels voisins d'une même catégorie ↔ guides liés (au moins une catégorie liée par guide).
- Dossier pilier ↔ guides du cluster (modèle hub and spoke).
- Blocs « Voir aussi » calculés à partir de la proximité taxonomique.
- **Rapport des pages orphelines** et des pages à moins de 3 liens entrants dans le back-office.
- Liens croisés entre portails quand c'est pertinent, par exemple un guide de cession qui renvoie vers la valorisation et le prévisionnel du portail DAF.

### 7.4 Données structurées (JSON-LD générées depuis la base)
- `SoftwareApplication` et `Review` (critique éditoriale, auteur = personne nommée) sur les fiches testées. **Pas d'`AggregateRating`** sans avis d'utilisateurs réels.
- `ItemList` sur les classements, `BreadcrumbList` partout, `Article` avec `author` et `dateModified` sur les guides, `Organization` et `WebSite` sur l'accueil, `FAQPage` quand il y a une FAQ. Google limite désormais les extraits FAQ enrichis, mais le balisage reste utile pour la compréhension sémantique et les moteurs IA.
- Validation automatique du JSON-LD dans les tests.

### 7.5 SEO technique
- Rendu serveur : génération statique avec revalidation (ISR) à chaque publication.
- Sitemaps segmentés par gabarit, `robots.txt` par portail, URLs canoniques systématiques.
- **Règles d'indexation :** une fiche « référencée, non testée » avec moins de N faits sourcés est en `noindex, follow`. Les URLs de filtres combinés sont en `noindex`, sauf les facettes déclarées comme landings, qui ont un contenu propre.
- Table `redirects` : 301 automatique quand un slug change, contrôle des chaînes de redirection.
- Budget de performance : LCP < 2,5 s, CLS < 0,1, INP < 200 ms. Images via `next/image`, polices locales, JavaScript minimal côté public.
- Ping IndexNow et mise à jour des sitemaps à la publication.
- **Optimisation pour les moteurs IA (GEO) :** réponse directe en tête de page, tableaux comparatifs en HTML, faits sourcés et datés, auteurs identifiés, `llms.txt`.

### 7.6 Fraîcheur
- Chaque contenu a une date `review_due_at` : 90 jours pour une fiche ou un classement, 180 jours pour un guide, ou immédiatement quand la Veille détecte un changement de prix ou de fonctionnalité.
- Le back-office liste les contenus à revoir. « Mis à jour le » n'est affiché que si le contenu a réellement changé.
- Les titres avec l'année (« Meilleurs logiciels de trésorerie 2026 ») sont mis à jour à chaque changement d'année, sous réserve d'une revue.

### 7.7 Suivi et boucle d'amélioration
- Import quotidien de **Google Search Console** (API) dans `gsc_metrics` (page × requête × jour : impressions, clics, CTR, position).
- Suivi des positions Semrush sur les `keyword_targets` prioritaires.
- **Tableaux de bord SEO dans le back-office :**
  - les opportunités : positions 4 à 15 avec beaucoup d'impressions ;
  - les CTR anormalement bas (title et meta à retravailler) ;
  - la cannibalisation : une requête qui fait remonter plusieurs pages ;
  - les contenus en perte de trafic ;
  - les mots-clés non couverts.
- Chaque alerte crée une `review_task`.

## 8. Analytics first-party et parcours utilisateurs

- **Collecte maison, sans cookie tiers :** un endpoint `/api/collect` en `sendBeacon`. L'identifiant de session est un hachage de l'IP, de l'user-agent et du site, avec un sel qui change chaque jour. Aucune IP n'est stockée et aucune donnée n'est partagée avec un tiers. Cette conception vise l'exemption de consentement pour la mesure d'audience prévue par la CNIL, à confirmer lors de la revue RGPD.
- **Événements :** `pageview` (portail, rubrique, gabarit, catégorie, entité, référent, UTM), `outbound_click` (logiciel, emplacement, type de lien : éditorial, affilié ou sponsorisé), `sponsored_impression`, `form_submit` (référencement, publicité, ressource), `simulator_use`, `scroll_depth`.
- **Tables :** `analytics_events` (partitionnée par mois, conservation de 25 mois), agrégats quotidiens `analytics_daily`.
- **Tableaux de bord du back-office :**
  - **Trafic :** par portail, rubrique, gabarit et catégorie ; sources (organique, direct, référent, campagne) ; top pages ; tendances.
  - **Parcours par rubrique :** flux d'entrée → catégorie → fiche → clic sortant, entonnoirs, pages de sortie, transitions entre gabarits (diagramme de Sankey).
  - **Monétisation :** clics sortants par catégorie et par emplacement, CTR des positions sponsorisées, revenus estimés par catégorie.
  - **Demandes :** volume et conversion des demandes de référencement et de publicité, par portail et par catégorie.
  - **SEO :** voir §7.7.

## 9. Garde-fous juridiques

La V1 reste un média : elle compare, informe et référence. Elle ne propose ni financement, ni conseil personnalisé, ni intermédiation rémunérée. Tout module qui s'en écarte passe d'abord par une revue juridique.

| Sujet | Règle produit | À valider avec un avocat |
|---|---|---|
| Classements et positions payantes | Mention « Sponsorisé », bloc distinct, critères de classement publiés dans `/methode` | Obligations de transparence des plateformes en ligne (art. L111-7 C. conso), pratiques commerciales trompeuses, formulation des mentions |
| Crédit, compte pro, paiement | Contenu comparatif sans rémunération au lead ni formulaire de financement avant validation | L'IOBSP couvre les opérations de banque **et les services de paiement** (art. L519-1 CMF) : une affiliation rémunérée sur des comptes pro peut-elle en relever ? |
| Assurance | Contenu seul | Un comparateur rémunéré relève de la distribution d'assurance (ORIAS) |
| Cession d'entreprise | Contenu général, simulateurs avec avertissement, annuaire sans mise en relation rémunérée en V1 | **Loi Hoguet** (fonds de commerce, parts sociales de sociétés détenant un fonds ou un immeuble) ; statut CIF pour un conseil sur des titres ; rémunération au lead de conseils en cession |
| Levée de fonds, placements | Contenu général uniquement | Statut CIF, PSI |
| Labels et trophées | Méthode publiée, critères fixes, décision indépendante du paiement | Encadrement d'un label payant |
| Professions réglementées | Fiche factuelle, pas de classement avant revue par métier | Déontologie des avocats, des CAC et des experts-comptables (publicité, sollicitation) |
| Données personnelles | Consentement tracé, contacts nominatifs internes par défaut, hébergement UE, analytics sans cookie | Base légale, durées de conservation, exemption CNIL pour la mesure d'audience |
| Agents | Mention publique de leur rôle, publication par un humain | Politique éditoriale |

**Règles éditoriales non négociables :**

- Aucun outil n'est présenté comme testé sans test réel enregistré.
- Aucun fait n'est publié sans source datée.
- Aucun contrat commercial ne modifie une note, un classement éditorial ou un verdict.
- Tout lien d'affiliation et toute position sponsorisée sont signalés.
- Tout droit de réponse ou signalement d'erreur a un circuit de traitement défini (formulaire, puis `review_tasks`, avec un délai de réponse affiché).

## 10. Back-office

Rien n'est publié sans passer par la file de validation. Le back-office se construit avant les agents.

| Module | Fonction | Version |
|---|---|---|
| Portails | Configurer les sites, domaines, verticales, catégories et facettes | V1 |
| File de validation | Comparer le brouillon et la version en ligne, voir la checklist SEO, approuver, corriger, rejeter | V1 |
| Catalogue | Logiciels, prestataires, prix, fonctionnalités, intégrations | V1 |
| Tests et notation | Tests réels, notes par critère, preuves (Storage) | V1 |
| Contenus et SEO | Plan de production (`keyword_targets`), briefs, contenus à revoir, redirections | V1 |
| Demandes de référencement | Pipeline et vérifications automatiques | V1 |
| Demandes de publicité | Pipeline commercial, disponibilité des emplacements, prix indicatifs | V1 (formulaire et pipeline) |
| Analytics | Trafic, parcours par rubrique, clics sortants, demandes | V1 |
| SEO | Search Console, positions, opportunités, cannibalisation, pages orphelines | V1 (import GSC dès que les accès sont fournis) |
| Journal d'audit | Qui a modifié quoi, avec quelle source et quel agent | V1 |
| Commercial | Contrats, emplacements actifs, liens affiliés, reporting annonceur | V2 |
| Pilotage des agents et Veille | Lancer et suspendre un agent, coûts, erreurs, changements détectés | V2 |
| Leads | Consentements, transmissions, facturation | V3 |

| Rôle | Peut faire | Ne peut pas faire |
|---|---|---|
| Administrateur | Comptes, réglages, portails, plafonds de coûts | Publier une note sans validation éditoriale |
| Éditeur | Tester, noter, rédiger, valider, publier, gérer le SEO | Gérer les contrats commerciaux |
| Commercial | Demandes de publicité, offres, emplacements signalés, reporting | Modifier une note, un classement, un verdict ou un contenu |
| Conformité | Relire et bloquer une publication sensible | Modifier les contrats |
| Agent | Créer des brouillons, des faits et des alertes | Publier ou modifier directement le site |

Au démarrage, une même personne peut cumuler Éditeur et Conformité. Le rôle Commercial reste séparé de l'édition.

## 11. Modèle de données

La base sépare quatre domaines : les **faits**, l'**éditorial**, le **commercial** et la **mesure**. La séparation entre éditorial et commercial est imposée par les droits Postgres (RLS), pas seulement par l'interface.

| Domaine | Tables | Version |
|---|---|---|
| Plateforme | `sites`, `verticals`, `categories` (arbre, critères, pondérations), `facets`, `user_roles` | V1 |
| Faits | `software`, `software_categories`, `software_facts`, `pricing_plans`, `integrations`, `providers` (prestataires), `provider_categories` | V1 |
| Éditorial | `test_runs`, `scores`, `content_items`, `content_versions`, `content_sources`, `review_tasks`, `glossary_terms` | V1 |
| SEO | `keyword_targets`, `seo_briefs`, `redirects`, `gsc_metrics` | V1 |
| Demandes | `listing_requests`, `profile_claims`, `placement_requests`, `resource_leads`, `error_reports` | V1 |
| Mesure | `analytics_events`, `analytics_daily` | V1 |
| Traçabilité | `audit_log`, `agent_runs` | V1 |
| Commercial | `placement_inventory`, `commercial_contracts`, `sponsored_placements`, `affiliate_links` | V1 (inventaire) / V2 |
| Professionnels | `public_deals`, `rankings` | V2 |
| Leads | `leads` | V3 |

Règles imposées au niveau de la base :

- Une note publiée doit référencer un test réel et un valideur humain.
- Un agent ou un formulaire public écrit uniquement en brouillon ou en demande, jamais dans les contenus publiés.
- Le rôle Commercial n'a aucun droit d'écriture sur `scores`, `test_runs`, `content_*` ni sur l'ordre éditorial des classements.
- L'ordre éditorial d'un classement est calculé à partir des `scores`. Les positions sponsorisées viennent d'une autre table et sont rendues dans un autre bloc.

La base de banques d'affaires pourra alimenter `providers` et `public_deals`. Le CA, les e-mails et les téléphones nominatifs restent internes jusqu'à une revue RGPD.

## 12. Agents (V2 — implémentés, désactivés par défaut)

| Agent | Déclencheur | Sortie | Droits | Validation humaine |
|---|---|---|---|---|
| Veille | Chaque semaine, par logiciel | Alerte de changement sourcée | Web en lecture, `software_facts` en brouillon | L'éditeur confirme |
| Rédaction | Brief SEO validé | Brouillon de fiche, duel, guide ou alternatives | Lecture de la base, `content_versions` en brouillon | L'éditeur approuve |
| Contrôle qualité | Brouillon soumis | Rapport : sources, contradictions, conseils interdits, conformité au brief SEO | Lecture seule, `review_tasks` | Le rapport accompagne la décision |
| Opportunités SEO | Chaque semaine | Propositions de nouvelles pages et de pages à retravailler | Lecture de `gsc_metrics` et `keyword_targets`, `review_tasks` | L'éditeur priorise |
| Vérification des prestataires | Nouvelle demande, revue trimestrielle | Fiche préremplie, écarts | Registres publics, brouillon | Validation avant affichage |

**Implémentation retenue :** appels Claude API (`claude-opus-5-5`) à sortie structurée, sans outil, orchestrés par le code (`src/lib/agents`) — plus simple et plus sûr que des agents autonomes pour ces tâches bornées. Le code récupère les pages autorisées ; le modèle ne fait que renvoyer des données. Managed Agents reste une option si les tâches deviennent ouvertes. Les agents « Opportunités SEO » et « Vérification des prestataires » restent à faire. Limites : plafond de coût par exécution et par mois, outils et sources autorisés, sortie structurée avec une source pour chaque fait, aucun envoi externe ni paiement. Le contenu web est une donnée, jamais une instruction.

## 13. Stack technique

| Couche | Choix | Rôle |
|---|---|---|
| Construction | Claude Code | Écrire, tester et faire évoluer le code |
| Site et back-office | Next.js (App Router), TypeScript, Tailwind | Multi-portails par domaine, rendu serveur et ISR |
| Base et comptes | Supabase : Postgres, Auth, Storage, RLS | Données, rôles, preuves, règles d'accès |
| Analytics | First-party (Postgres) | Trafic, parcours, monétisation |
| SEO | Semrush (API), Google Search Console (API), IndexNow | Mots-clés, positions, performance |
| Agents | Managed Agents ou Agent SDK (V2) | Veille, rédaction, contrôle, opportunités |
| Automatisations | n8n ou Make, en option | Planification |
| Paiements | Stripe (V3) | Abonnements formation, éventuellement facturation des annonceurs |
| Hébergement | Région UE (Supabase et front) | RGPD |
