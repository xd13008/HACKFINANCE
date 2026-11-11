# Pages locales des annuaires : priorités (Semrush FR, 11 novembre 2026)

Source : `docs/seo/keywords-local-2026-11.csv` (80 requêtes « métier + ville »), chargées dans `keyword_targets` par `supabase/data/98`.

| Métier | Recherches/mois (villes mesurées) | Requête nationale |
|---|---|---|
| Experts-comptables | 27 360 | « expert comptable » 27 100 · « cabinet comptable » 9 900 |
| Recrutement et chasse de tête | 12 470 | « cabinet de recrutement » 4 400 · « chasseur de tête » 1 000 |
| Commissaires aux comptes | 2 710 | « commissaire aux comptes » 6 600 |

Hors local : « management de transition » 4 400, « société de recouvrement » 1 000, « intégrateur erp » 880, « daf à temps partagé » 480.

## Les 20 premières pages à publier

| Requête | Recherches/mois | Page | Cabinets en base |
|---|---|---|---|
| expert comptable paris | 3 600 | `/prestataires/experts-comptables/paris` | 4 087 |
| expert comptable nantes | 1 900 | `/prestataires/experts-comptables/nantes` | 141 |
| expert comptable bordeaux | 1 600 | `/prestataires/experts-comptables/bordeaux` | 239 |
| expert comptable lyon | 1 600 | `/prestataires/experts-comptables/lyon` | 540 |
| expert comptable marseille | 1 600 | `/prestataires/experts-comptables/marseille` | 626 |
| cabinet de recrutement paris | 1 600 | `/prestataires/cabinets-recrutement-finance/paris` | 621 |
| expert comptable montpellier | 1 300 | `/prestataires/experts-comptables/montpellier` | 219 |
| expert comptable rouen | 1 300 | `/prestataires/experts-comptables/rouen` | 56 |
| expert comptable toulouse | 1 300 | `/prestataires/experts-comptables/toulouse` | 359 |
| expert comptable lille | 1 000 | `/prestataires/experts-comptables/lille` | 118 |
| expert comptable limoges | 880 | `/prestataires/experts-comptables/limoges` | 76 |
| expert comptable nice | 880 | `/prestataires/experts-comptables/nice` | 347 |
| expert comptable rennes | 880 | `/prestataires/experts-comptables/rennes` | 121 |
| expert comptable strasbourg | 880 | `/prestataires/experts-comptables/strasbourg` | 170 |
| cabinet de recrutement lyon | 880 | `/prestataires/cabinets-recrutement-finance/lyon` | 66 |
| cabinet de recrutement nantes | 880 | `/prestataires/cabinets-recrutement-finance/nantes` | 30 |
| cabinet de recrutement bordeaux | 880 | `/prestataires/cabinets-recrutement-finance/bordeaux` | 26 |
| expert comptable aix en provence | 720 | `/prestataires/experts-comptables/aix-en-provence` | 186 |
| expert comptable tours | 720 | `/prestataires/experts-comptables/tours` | 64 |
| expert comptable metz | 720 | `/prestataires/experts-comptables/metz` | 71 |

## Pour qu'une page locale apparaisse

1. Publier la catégorie du métier (back-office → Catalogue → Catégories) et sa page d'annuaire (contenu validé).
2. Publier les fiches de la ville : chaque fiche du registre est factuelle (« fiche non vérifiée ») ; une fiche vérifiée par la rédaction l'indique.
3. La page devient indexable à partir de 3 fiches publiées (`MIN_INDEXABLE`), et `ALLOW_INDEXING=true` en production.

Villes sans cabinet de recrutement en base : Brest, Angers, Caen, Le Mans (à compléter).
