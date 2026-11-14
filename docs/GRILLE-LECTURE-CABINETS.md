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

## 2. Critères communs (tous les annuaires)

| Code | Question du DAF | Type | Filtre | Source habituelle |
|---|---|---|---|---|
| `clients` | Suit-il des entreprises de ma taille ? | indépendants, création, TPE, PME, ETI, groupes, start-up, associations | oui | site du cabinet |
| `secteurs` | Connaît-il mon secteur ? | 18 secteurs | oui | site du cabinet |
| `logiciels` | Travaille-t-il avec mes outils ? | 19 logiciels (Pennylane, Tiime, Sage, Cegid, Odoo…) | oui | site du cabinet, pages partenaires |
| `facturation_electronique` | M'accompagne-t-il dans la réforme ? | oui / non | oui | site du cabinet |
| `mode_travail` | À distance ou en rendez-vous ? | sur place, à distance | oui | site du cabinet |
| `langues` | Peut-il travailler dans une autre langue ? | 7 langues | oui | site du cabinet |
| `tarif` | Combien cela coûte-t-il ? | texte (prix affiché) | non | page tarifs |
| `reseau` | Fait-il partie d'un réseau ? | texte | non | site du cabinet |
| `effectif` | A-t-il la taille pour me suivre ? | tranche d'effectif | oui | registre public (Sirene) |
| `annee_creation` | Depuis quand existe-t-il ? | année | non | registre public (Sirene) |

## 3. Critères propres à un métier

| Annuaire | Critères |
|---|---|
| Experts-comptables | `missions_comptables` : 14 missions (tenue, bilan, fiscalité, paie, social, juridique, création, conseil de gestion, prévisionnel, consolidation, audit, transmission, international, en ligne) |
| Commissaires aux comptes | `missions_audit` : CAC légal, audit contractuel, comptes consolidés, durabilité (CSRD), apports et fusion, associations |
| Recrutement finance | `fonctions_recrutees` (DAF, contrôle de gestion, comptabilité, trésorerie, audit, consolidation, paie, fiscalité), `methode_recrutement`, `honoraires` |
| Intégrateurs | `niveau_partenariat` (texte, d'après l'annuaire de l'éditeur) |

Pour ajouter un critère :
1. Ajouter une ligne au référentiel dans une nouvelle migration (`on conflict do update`).
2. Ne jamais renommer un code déjà utilisé.

## 4. Où la grille apparaît

- **Fiche cabinet :** tableau « Grille de lecture ». Chaque critère y figure avec sa valeur, sa source et sa date, ou « Non vérifié ».
- **Page ville :**
  - bloc « Trouver le cabinet adapté » : les filtres ne proposent que les valeurs vérifiées présentes sur la page ;
  - 4 critères clés sur chaque carte ;
  - cases « Comparer ».
  - Les pages filtrées sont en `noindex`, avec une canonique vers la page ville.
- **Page de comparaison** (`/prestataires/[métier]/comparer?c=…`) : 2 à 4 cabinets côte à côte, `noindex`.

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
