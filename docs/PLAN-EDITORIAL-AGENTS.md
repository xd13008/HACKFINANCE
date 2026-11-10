# Plan éditorial par univers et chaîne de 4 agents

_Mémoire projet · 8 nov. 2026 · demande de @xav, analyse et recommandations de Claude. Statut : **cadrage validé dans son principe, non implémenté**._

Ce document fixe (1) la structure de sous-rubriques de chacun des 8 univers de Radar Finances (`supabase/data/50_daf_univers.sql`) et (2) la chaîne de production de contenu par agents. Il complète `ARCHITECTURE.md` (§5 gabarits, §9 garde-fous, §12 agents) et les règles non négociables de `CLAUDE.md`, qui priment en cas de conflit.

---

## 1. Les sous-rubriques de chaque univers

Chaque univers propose les mêmes 6 sous-rubriques, pour les logiciels **et** les prestataires.

| # | Sous-rubrique (demande) | Ce que voit le DAF | Gabarit | État |
|---|---|---|---|---|
| 1 | **Le test de la rédaction** | Liste des outils et prestataires de l'univers, avec filtres. Un clic mène à la **fiche d'identité** (société, offre, prix, intégrations, statut de test), puis à la **revue complète** (test, verdict, points forts et faibles, synthèse des avis publics) | page univers / `category_ranking` + fiche `software_review` (prestataire : `/prestataires/[metier]/[slug]`) | listes, fiches et revues : existants ; page « univers » à créer |
| 2 | **Le podium général** | Top 3 (puis classement complet) par catégorie, critères pondérés publiés | `category_ranking` | existant |
| 3 | **Le match entre 2 acteurs** | Duel critère par critère, verdict **par typologie de CFO** | `duel` (+ bloc « verdict par profil ») | existant, bloc profils à enrichir |
| 4 | **Résultats par typologie de CFO** | Classements selon le profil : taille de société, environnement informatique (ERP, logiciel comptable en place), création de société, forte croissance, multi-entités, international… | `facet_landing` (facettes `company_size`, `integration`, `sector`, nouvelle facette `profile`) | facettes existantes ; types « environnement IT » et « stade » (création, croissance) à ajouter |
| 5 | **Les grands blocs fonctionnels** | Pour chaque bloc (ex. trésorerie : connexions bancaires, prévision, scénarios, consolidation), la revue de chaque outil ou prestataire sur ce bloc | **nouveau gabarit** `feature_review` : `/meilleurs-logiciels/[categorie]/fonctionnalites/[bloc]` | à créer (enum `content_type`, chemin, route, `seo_check`, `linking.ts`) |
| 6 | **Les tarifs** | Comparatif des prix de tous les acteurs de la catégorie (offres, unités, engagement, coût réel par profil), sourcés et datés | **nouveau gabarit** `category_pricing` : `/meilleurs-logiciels/[categorie]/prix` (les pages `/logiciels/[slug]/prix` restent) | à créer |

### Arborescence « Vous partez de zéro » (décision du 8 nov. 2026 : option A)

```
Accueil → « Trouver une solution »
  └─ Assistant en 3 questions (/trouver) : taille / stade · outils déjà en place · besoin prioritaire
       → présélection de 3 solutions (sans sponsorisé), puis « voir toute la catégorie » ou « voir l'univers »
  └─ (lien secondaire) les 8 univers (/univers/[univers]) : besoins de l'univers avec leur podium, matchs récents, guide pilier
       └─ Catégorie (/meilleurs-logiciels/[categorie]) — 6 onglets fixes :
            Test de la rédaction (liste filtrable logiciels + prestataires) · Podium · Matchs (/comparer/[a]-vs-[b])
            · Par profil de DAF (/meilleurs-logiciels/[categorie]/[profil]) · Blocs fonctionnels (…/fonctionnalites/[bloc]) · Tarifs (…/prix)
            └─ Fiche (/logiciels/[slug] ou /prestataires/[metier]/[slug]) : identité, revue, avis publics, prix, alternatives
                 → comparer · demander une démo ou un devis (formulaire RGPD) · challenger
```

Règles : 3 clics au plus jusqu'à une fiche ; mêmes onglets dans toutes les catégories (chaque onglet est une page indexable) ; adresses existantes inchangées ; les réponses de l'assistant alimentent le profil (classements par profil, leads avec consentement). Maquette : écrans 9 (assistant) et 10 (univers).

### Accueil d'univers : tableau de bord du DAF (décision du 10 nov. 2026)

Approche propre à Radar Finances, distincte des répertoires « par angle » des concurrents : la page suit les **4 étapes de décision du DAF** (A Comprendre · B Comparer · C Choisir pour mon profil · D Changer) et présente des **données**, pas des listes de liens (chiffres clés, classement en tableau filtrable, podium, prix comparés, matrice « qui fait quoi », profils, duels, parcours de migration). Maquette : écran 10.

**Unicité SEO (règles obligatoires)**
1. **Un mot-clé tête par univers**, distinct de ceux des catégories (ex. univers « gestion de trésorerie d'entreprise » ; catégorie « logiciel de trésorerie »). Le H1 et le title le portent. Pas deux pages sur la même intention (cannibalisation contrôlée dans `seo_check()` via `keyword_targets`).
2. **Contenu généré depuis nos propres données**, donc introuvable ailleurs : phrase de chiffres clés datée et citable (nombre de solutions testées, prix médian, fourchette, meilleure note), matrice des fonctions vérifiées, podium, prix comparés. Recalculés à chaque publication.
3. **Pas de duplication avec les pages catégories** : l'univers résume (top 5, podium, extraits) et renvoie ; le classement complet, les facettes et les tarifs détaillés vivent sur la catégorie (canonical propre à chaque page).
4. **Textes d'introduction et réponses « Comprendre » rédigés pour chaque univers** (jamais un gabarit avec le nom changé) ; contrôlés par l'agent qualité.
5. **Données structurées** : `CollectionPage` + `ItemList` (classement) + `FAQPage` (étape A) ; pas d'`AggregateRating` issu d'avis tiers.
6. **Aucune reprise de textes, de structure de titres ni de libellés d'un concurrent.**

### Exceptions, imposées par les garde-fous

- **Professions réglementées** (experts-comptables, commissaires aux comptes, avocats) : pas de podium, de match ni de classement par profil. Uniquement une fiche factuelle, une liste triée par distance et des tarifs **déclarés**, en attendant la revue déontologique (§9).
- **Univers 7 « Financement, aides & risques »** : les sujets réglementés (affacturage, crédit, prêt d'honneur, compte pro, assurance, placements) n'ont **que des guides** (`regulated_topic`) : ni podium, ni match, ni tarifs comparés, ni lead. Seuls les cabinets CIR/CII et les aides publiques suivent le schéma normal (sans classement des cabinets en V1).
- **Prestataires non réglementés** (management de transition, intégrateurs, cabinets de réduction des coûts…) : la rédaction ne « teste » pas un cabinet. Le podium repose sur des **avis clients vérifiés** et des faits déclarés et contrôlés, ce qui est affiché comme tel.
- **Univers 8 RSE** : une catégorie à l'angle DAF ; le détail reste sur Radar RSE (pas de cannibalisation entre portails).

---

## 2. La chaîne de 4 agents

Principe directeur, inchangé : **les agents préparent, un humain valide**. Un agent n'écrit qu'en brouillon (règle 4) ; seul un contenu approuvé par un humain est publié (règle 1) ; une note publiée exige un test réel validé (règle 2).

### Agent 1 · Veille et collecte (en continu)

**Demande :** un agent OpenClaw piloté par Claude qui scrape le web en continu.

**Recommandation : oui à la collecte continue, mais pas sous la forme d'un agent autonome avec navigateur et accès aux systèmes.**
- Un agent autonome qui lit des pages web arbitraires est la cible n° 1 de l'injection de consignes : une page piégée peut lui faire exécuter des actions. Notre architecture l'interdit déjà : le code récupère les pages, le modèle ne renvoie que des données (`asDocument()`, aucun outil, `keepKnownSources()`).
- Architecture retenue :
  - des **collecteurs déterministes** (code) sur une liste de domaines autorisés : sites des éditeurs, pages tarifs, changelogs, documentation, registres officiels (DGFiP pour les plateformes agréées, INSEE/Sirene, BODACC), presse spécialisée ;
  - respect de `robots.txt` et des CGU, débit limité, user-agent identifié ;
  - Claude (agent `veille` existant) extrait les faits structurés, chacun avec **source + date**, dans `software_facts` en **brouillon** ;
  - détection des changements (prix, offres, fonctionnalités), qui crée une `review_task` pour l'éditeur.
- **Décision du 8 nov. 2026 (@xav) : piloter OpenClaw pour la collecte**, avec l'argument qu'il coûterait moins cher et que les agents 2 et 3 filtrent les erreurs. Réserve de Claude, consignée : les agents 2 et 3 contrôlent le *résultat*, pas les *actions* de l'agent de collecte pendant sa navigation (injection de consignes, exfiltration), ni le risque juridique né à l'extraction. En 2026, OpenClaw fait l'objet de nombreuses alertes de sécurité (taxonomie universitaire de 190 avis, failles d'évasion du bac à sable, détournement par contenu piégé : [arXiv 2603.27517](https://arxiv.org/pdf/2603.27517), [Vulert](https://vulert.com/blog/?p=4974), [DEV / The Hacker News](https://dev.to/etairos/openclaw-ai-agent-exploited-through-hidden-contact-prompts-and-social-engineering-21di) ; numéros de CVE à vérifier sur les avis officiels).
- **Conditions du pilote OpenClaw** (non négociables) :
  1. conteneur isolé (gVisor ou équivalent) sur une infrastructure séparée ; aucun accès à Supabase ni aux clés du projet ; une clé Claude dédiée avec plafond de dépense ;
  2. accès réseau limité aux domaines autorisés, lecture seule ; aucun module ou « skill » tiers ; version à jour des correctifs de sécurité ;
  3. sortie uniquement vers une **file de quarantaine** au format fixe (fait, URL source, date, extrait court). Le code vérifie que la source est autorisée et re-télécharge la page pour confirmer la présence du fait, puis l'enregistre en brouillon dans `software_facts` via l'agent `veille` (`asDocument()`) ;
  4. pas de copie d'avis des plateformes : tendances synthétisées, lien et date uniquement.
- **Banc d'essai** : 20 pages tarifs d'éditeurs, OpenClaw comparé aux collecteurs déterministes. Indicateurs : coût par page (tokens), exactitude des faits, taux d'échec, incidents de sécurité. Décision au moindre coût à qualité égale ; l'hybride est possible (collecteurs pour les pages simples, OpenClaw pour les sites dynamiques).

**Avis publiés sur le web (G2, Capterra, Trustpilot, Google…) : citation sourcée, jamais copie** — implémenté le 8 nov. 2026 (migration 1200, `PublicReviews` sur la fiche logiciel) : relevé de note par plateforme (lien, date, nombre d'avis) et courtes citations (≤ 300 caractères, lien vers l'avis original, fonction de l'auteur sans nom, sélection équilibrée positifs / négatifs), validation par un éditeur humain.
- Recopier ou agréger les avis d'une plateforme expose à son droit sur sa base de données (droit *sui generis*, art. L342-1 CPI), au droit d'auteur des textes, à ses CGU et au RGPD (noms des auteurs).
- Afficher une note « agrégée » d'avis non contrôlés serait trompeur (art. L111-7-2 C. conso : obligation d'indiquer si les avis sont vérifiés).
- Retenu : un bloc **« Ce que disent les avis publics »** : tendances synthétisées par la rédaction (points forts et faibles récurrents), avec lien et date de consultation par source, sans citation longue, sans note chiffrée importée, sans nom d'auteur. Il est distinct de nos **avis vérifiés**, collectés sur le site (maquette, écran 3). Partenariats ou API officielles à privilégier quand ils existent.

### Agent 2 · Rédaction (2 fois par semaine)

**Demande :** créer le contenu des pages deux fois par semaine en interrogeant l'agent de collecte, avec la densité et la profondeur des comparatifs Hackceleration (ex. `/fr/labs/comparatif/printify-vs-sellfy`).

**Recommandation : oui, avec trois réserves.**
- **La cadence est limitée par la validation humaine**, pas par l'agent. Il faut planifier selon la capacité réelle des éditeurs (par exemple 4 à 6 pages relues par semaine au démarrage), sinon la file de validation déborde. L'agent `redaction` existe ; il faut une **tâche planifiée bihebdomadaire** qui choisit les pages par priorité (mots-clés, fraîcheur, faits nouveaux).
- **L'agent ne peut pas « tester »** : il rédige structure, faits sourcés, synthèses et comparaisons. Les notes, le verdict et la mention « testé par la rédaction » viennent du test réel saisi et validé par un humain (`validate_test_run()`).
- **Profondeur : gabarits imposés par type de page**. Une revue complète ou un match vise 2 500 à 4 000 mots utiles. Elle comporte : réponse courte en tête, tableau de synthèse, sections par bloc fonctionnel, tarifs détaillés et coût réel par profil, verdict par typologie de CFO, limites, alternatives, FAQ issues des questions Semrush, sources datées.
- La page Hackceleration citée **n'a pas pu être consultée** (le site bloque les accès automatisés, HTTP 403) : la comparaison de densité reste à faire à la main. On reprend la logique de profondeur, jamais leurs textes.

### Agent 3 · Contrôle qualité

**Demande :** vérifier que les pages sont professionnelles, rigoureuses, véridiques, authentiques, concrètes, utiles à la décision du DAF, sans verbiage, assez longues et riches des termes recherchés (Semrush).

**Recommandation : oui.** L'agent `controle_qualite` existe ; on transforme les attentes en **grille notée et bloquante** :

| Critère | Contrôle |
|---|---|
| Véridique | chaque fait chiffré ou daté renvoie à une source reçue (`keepKnownSources`) ; aucune affirmation de test sans test validé |
| Concret, aide à la décision | présence obligatoire : tableau comparatif, prix, verdict par profil, limites ; chaque section se termine par une conséquence pour le DAF |
| Pas de verbiage | détection du remplissage (formules creuses, superlatifs non étayés, redites) ; ratio faits / mots |
| Professionnel | ton B2B, vocabulaire métier exact (BFR, DSO, rapprochement, e-reporting…), aucune promesse commerciale |
| Référencement | longueur minimale par gabarit (`seo_check`), mot-clé principal et secondaires, questions des internautes couvertes |
| Conformité | aucun conseil personnalisé (crédit, fiscalité, droit, assurance), sujets réglementés en contenu seul, liens commerciaux signalés |

Sortie : un rapport par critère et des corrections proposées ; une page sous le seuil retourne à la rédaction. **`seo_check()` reste bloquant et ne doit pas être affaibli** (règle 8).

### Agent 4 · Publication

**Demande :** un agent qui publie les pages sur le site.

**Recommandation : non à une publication autonome, oui à un agent de mise en ligne après validation.** Publier sans validation humaine viole la règle 1, imposée par la base. Elle protège la crédibilité du média et sa responsabilité éditoriale : faits erronés sur un éditeur, dénigrement, publicité déguisée. Proposé :
- L'humain garde **un seul geste** : « Approuver » (ou approbation par lot dans le back-office, page par page).
- L'agent fait tout le reste après approbation :
  - planification de l'heure de publication ;
  - maillage interne et pages liées ;
  - revalidation du cache, sitemap, notification aux moteurs (IndexNow, Search Console) ;
  - génération des images de partage ;
  - vérification de la page en ligne : 200, canonical, données structurées ;
  - rapport.
- Il ne peut ni modifier un contenu approuvé, ni approuver.

---

## 3. Mots-clés Semrush

- Relevés existants : `docs/seo/keywords-fr-2026-11-v2.csv` (196 mots-clés), `docs/seo/questions-fr-2026-11.csv` (43 questions), et les volumes ajoutés dans `supabase/data/30`, `35`, `40`, `45`.
- Relevé du 8 nov. 2026 (le crédit Semrush s'est épuisé après cette requête) :

| Mot-clé | Volume | CPC | KD | Remarque |
|---|---|---|---|---|
| logiciel tms | 1 600 | 4,86 € | 25 | **ambigu** : surtout « transport management system » (logistique) ; ne pas l'utiliser comme mot-clé principal de la trésorerie |
| carte entreprise | 880 | 2,27 € | 19 | univers 3 |
| management de transition finance | 590 | 3,14 € | **11** | univers 6, très accessible |
| ia finance | 390 | 2,48 € | 21 | univers 6 |

- **À télécharger dès que le crédit est rechargé** : pour chaque catégorie, les déclinaisons « comparatif », « meilleur », « avis », « prix / tarif », « vs », « pour PME / startup / ETI », « gratuit », les noms des principaux éditeurs (« [éditeur] avis / prix / vs »), et les questions (`phrase_questions`). Sortie : `docs/seo/keywords-sous-rubriques-AAAA-MM.csv`, puis `supabase/data/` (idempotent).

---

## 4. Prochaines étapes proposées (dans l'ordre)

1. Recharger Semrush et télécharger le relevé des sous-rubriques (§3).
2. Créer les gabarits `feature_review` et `category_pricing`, la page « univers », et les facettes « environnement IT » et « stade de l'entreprise ».
3. Collecteurs déterministes et extraction de faits (agent 1), avec la liste des domaines autorisés.
4. Tâche planifiée de rédaction bihebdomadaire avec gabarits de profondeur (agent 2), et grille de contrôle qualité bloquante (agent 3).
5. Agent de mise en ligne post-approbation et approbation par lot (agent 4).
6. Bloc « Ce que disent les avis publics » (synthèse sourcée) et collecte d'avis vérifiés sur le site, **après avis juridique** (L111-7-2, droit des bases de données).
