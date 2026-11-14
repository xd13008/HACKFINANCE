# Grille de lecture des cabinets et prestataires (14 novembre 2026)

**Consigne permanente du dirigeant :** toute collecte d'information sur un cabinet garde en tête une question :
*qu'est-ce qui aide un DAF à comprendre quel cabinet lui convient ?* Chaque information devient un critère de filtre ou de comparaison,
typé et normalisé, avec sa source et sa date. Une information qui n'aide ni à filtrer ni à comparer n'est pas collectée.

## 1. Principes

- **Une question de DAF par critère.** Exemples : « Le cabinet suit-il des entreprises de ma taille ? », « Travaille-t-il avec mes outils ? ».
- **Valeurs normalisées.** Les valeurs sont des codes du référentiel (`provider_criteria`), jamais du texte libre, sauf pour le tarif, le réseau et le niveau de partenariat. La base refuse une valeur inconnue.
- **Sourcée et datée.** Chaque fait porte l'URL de sa source, son type et sa date de consultation (règle 6) :
  - site du cabinet ;
  - registre public ;
  - annuaire professionnel ;
  - déclaration du cabinet.
- **Brouillon, puis validation humaine.**
  - Un agent ou un import n'écrit que des brouillons (règle 4).
  - Un éditeur valide dans `/admin/prestataires`, bloc « Grille de lecture » : fiche par fiche pour les sites, par ville pour le registre.
  - Seuls les faits validés de fiches publiées sont servis au public.
- **« Non vérifié » n'est pas « non ».** Un critère sans fait validé s'affiche « Non vérifié » et ne passe aucun filtre.
- **Pas un classement.**
  - Les filtres réduisent la liste, sans la classer : l'ordre reste alphabétique.
  - La comparaison met les faits côte à côte, sans note.
  - Le sponsoring n'entre jamais dans la grille (règle 3).
- **Aucune donnée personnelle.** Pas de nom d'associé, de photo, d'e-mail ni de téléphone, et le SIREN n'est jamais servi (règle 9).
  La source du registre est citée par son adresse générale, pas par une URL contenant le SIREN.

## 2. Les 5 axes de lecture (texte du dirigeant, 14/11/2026)

La grille est rangée selon les 5 questions qu'un DAF doit se poser, puis « le cabinet en chiffres ». Pour les experts-comptables,
chaque axe affiche la question à poser au cabinet (table `provider_grid_axes`, texte du dirigeant). Les autres métiers n'ont que les titres,
tant que le dirigeant n'a pas fourni leur texte.

| Axe | Question à poser (experts-comptables) | Critères |
|---|---|---|
| 1. La connaissance de votre métier | Le cabinet doit déjà suivre des clients de votre secteur et de votre taille. Demandez-lui combien. | `secteurs`, `clients` (types et taille), `cas_usage` (situations accompagnées), `references` (sociétés clientes citées), `cas_clients` (résumés ≤ 200 caractères), `nombre_clients` |
| 2. Un interlocuteur attitré | Savoir qui traite le dossier ; exiger un nom et un délai de réponse garanti (48 h maximum). | `interlocuteur_attitre`, `qui_traite`, `delai_reponse`, `mode_travail`, `langues` |
| 3. Le conseil, pas seulement la saisie | Rémunération du dirigeant, optimisation fiscale, trésorerie, statut juridique ; tester le cabinet avec une vraie question. | `conseil` |
| 4. Le périmètre et le prix | Lettre de mission détaillée ; ce qui est inclus dans le forfait et ce qui est en supplément. | `missions_*`, `forfait_inclus`, `tarif_min_mensuel` (€ HT), `tarif` (texte) |
| 5. Les outils | Flux bancaires automatiques, dépôt des pièces en ligne, tableau de bord ; prêt pour la facturation électronique (obligation progressive depuis septembre 2026, source impots.gouv.fr consultée le 14/11/2026). | `outils_cabinet`, `logiciels`, `facturation_electronique` |
| Le cabinet en chiffres | — | `chiffre_affaires` (comptes publiés, avec l'exercice), `effectif` (tranche, avec l'année), `annee_creation`, `reseau` |

Règles propres à ces critères :
- **Références et cas clients.**
  - On ne retient que les sociétés citées publiquement par le cabinet, jamais une personne (« Dr Martin » est exclu).
  - Les cas clients sont résumés avec nos mots, sans copie.
  - Les clients d'un groupe ou d'un réseau ne sont pas attribués au bureau local.
- **Chiffres déclarés.**
  - On écarte un chiffre cumulé (« 600 entreprises depuis 2005 »), un chiffre de groupe ou des chiffres contradictoires.
  - Un prix n'est retenu comme « € HT par mois » que si le site le dit HT. Sinon, il est gardé en texte avec la mention.
  - Un délai de réponse n'est retenu que s'il est présenté comme un engagement.
- **Chiffre d'affaires.** Il est retenu à partir de l'exercice 2022, s'il est supérieur à 0. Il est toujours affiché avec son exercice.

## 3. Critères propres à un métier

| Annuaire | Critères |
|---|---|
| Experts-comptables | `missions_comptables` (14 missions), `qui_traite` |
| Commissaires aux comptes | `missions_audit` : CAC légal, audit contractuel, comptes consolidés, durabilité (CSRD), apports et fusion, associations |
| Recrutement finance | `fonctions_recrutees`, `methode_recrutement`, `honoraires` |
| Intégrateurs | `niveau_partenariat` (texte, d'après l'annuaire de l'éditeur) |

Pour ajouter un critère :
1. Ajouter une ligne au référentiel dans une nouvelle migration (`on conflict do update`), avec son axe.
2. Ne jamais renommer un code déjà utilisé.

## 4. Où la grille apparaît

- **Fiche cabinet :** « Grille de lecture » rangée par axe, avec la question à poser. Chaque critère y figure avec sa valeur, sa source, sa date et sa période, ou « Non vérifié ».
- **Page ville :**
  - bloc « Trouver le cabinet adapté » : les filtres ne proposent que les valeurs vérifiées présentes sur la page ;
  - 4 critères clés sur chaque carte ;
  - cases « Comparer ».
  - Les pages filtrées sont en `noindex`, avec une canonique vers la page ville.
- **Page de comparaison** (`/prestataires/[métier]/comparer?c=…`) : 2 à 4 cabinets côte à côte, rangés par axe, `noindex`.

## 5. Collecte

1. **Registre public** (recherche-entreprises.api.gouv.fr) : taille du cabinet et année de création. Ces données couvrent toutes les fiches.
2. **Site officiel du cabinet** :
   - identification par le SIREN dans les mentions légales, sinon par le nom et l'adresse dans la ville ;
   - lecture de l'accueil et de la page des services ;
   - aucun blocage contourné, aucun texte copié ;
   - doute sur l'identité (site d'une autre société du groupe, adresse différente) : la fiche est écartée.
3. **Normalisation** vers les codes du référentiel, puis `scripts/grid-to-sql.py`, qui produit `supabase/data/99_grille_prestataires.sql`
   à partir de `docs/seo/grille/*.json`. L'import est idempotent et n'écrase jamais un fait existant.

### Pilote de Nantes (experts-comptables, 14/11/2026)

- **Fiches :** 141.
- **Registre :** année de création pour les 141 fiches, taille du cabinet pour 74 (l'effectif n'est pas diffusé pour les autres).
- **Sites officiels :** 22 sites identifiés. 18 fiches retenues, 4 écartées :
  - deux sites appartiennent à une autre société du groupe ;
  - KPMG : informations nationales, pas propres à l'entité de Nantes ;
  - Cagec : pas d'activité d'expertise comptable. Sa place dans l'annuaire est à revoir.
- **Enseignement :** la plupart des petits cabinets n'ont pas de site. Leur grille repose sur le registre, puis sur la déclaration du cabinet
  (formulaire « Référencer mon cabinet », à brancher sur la grille).

### Deuxième passage (14/11/2026) : références, cas clients, axes 2 à 5

Sur les 18 sites retenus :
- **Ce qu'on a trouvé :**
  - références : 4 cabinets ;
  - cas clients : 2 ;
  - situations accompagnées : 17 ;
  - outils proposés : 15 ;
  - interlocuteur attitré : 5 ;
  - délai garanti : 1 (KER, 48 h).
- **Chiffre d'affaires publié :** 22 cabinets sur 141.
- **7 données écartées**, détaillées dans `ecartees_v2` du fichier JSON :
  - clients d'un groupe ;
  - délai sans engagement ;
  - prix sans mention HT ;
  - chiffres cumulés ou de groupe.
