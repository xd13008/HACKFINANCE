# Protocole de test : logiciels de gestion de trésorerie

Version 1 · 11 novembre 2026 · catégorie `tresorerie` (Radar Finances).
Les notes publiées viennent **uniquement** de ce test, réalisé par un humain, avec preuves archivées, puis validé par un éditeur
(`validate_test_run()`). Les avis tiers n'entrent jamais dans la note.

## 1. Logiciels à tester (préparés en brouillon dans `supabase/data/70_tresorerie_catalogue.sql`)

| Logiciel | Catégorie principale | Offre à tester | Point d'attention |
|---|---|---|---|
| Agicap | Trésorerie | Gestion et prévisions de trésorerie (sur devis) | Demander un accès de test multi-entités |
| Okimia (ex-Fygr) | Trésorerie | Pro (104 € HT/mois), puis Entreprise pour le multi-sociétés | Essai de 7 jours : planifier le test en une semaine |
| Pennylane | Comptabilité (secondaire : trésorerie) | Essentiel (24 € HT/mois) : seule offre avec prévisionnel | Le tester sous l'angle trésorerie uniquement |
| Cegid Exabanque | Communication bancaire (secondaire : trésorerie) | Pack Trésorerie (sur devis) | Tester l'EBICS si un accès bancaire de test est fourni |
| Kyriba | Communication bancaire | Sur devis | Cible ETI et groupes : test dans la catégorie communication bancaire |

Écarté faute de source officielle vérifiable au 11/11/2026 : Turbopilot (site de l'éditeur introuvable). À réexaminer.

## 2. Le cas de test (identique pour tous)

- **Entreprise fictive** : PME de services, 3 sociétés (une holding, deux filiales), 4 banques, 12 comptes, 6 mois d'historique.
- **Données** : fournies par l'éditeur en environnement de démonstration, ou jeu d'import CSV identique pour tous
  (à conserver dans les preuves). Aucune donnée réelle d'entreprise.
- **Version** : noter la version ou la date de mise à jour du logiciel le jour du test.
- **Durée** : une journée de test par logiciel, plus le suivi du paramétrage.

## 3. Critères, mesures et barème

Les poids sont ceux de la grille publiée de la catégorie. Chaque note est sur 10, au demi-point.

| Critère (poids) | Ce que l'on mesure | 9-10 | 6-7 | 3-4 |
|---|---|---|---|---|
| Fonctionnalités (30 %) | Catégorisation, consolidation des 3 sociétés, élimination des flux intragroupe, rapprochement factures, exports | Tout fonctionne sur le cas, sans contournement | Consolidation partielle ou manuelle | Pas de consolidation |
| Connexions bancaires (20 %) | Comptes connectés sur 12, temps de connexion, fraîcheur des données (J ou J-1) | 12/12 en moins d'1 h, mise à jour quotidienne | 9 à 11/12, imports manuels ponctuels | Moins de 8/12 |
| Prévision et scénarios (20 %) | Prévision 13 semaines et 12 mois, nombre de scénarios, comparaison prévu/réalisé sur un mois | 3 scénarios et plus comparés, écart prévu/réalisé mesuré | 1 scénario, comparaison sommaire | Pas de scénario |
| Prise en main (15 %) | Temps jusqu'au premier tableau de bord exploitable, nombre d'étapes, aide disponible | Moins de 2 h, sans accompagnement | Une journée, avec l'éditeur | Plus de 3 jours |
| Rapport qualité-prix (15 %) | Coût annuel pour 1, 3 et 5 sociétés (prix publics validés ou devis daté), comparé à la médiane de la catégorie | Sous la médiane à périmètre égal | Dans la médiane | Nettement au-dessus |

## 4. Preuves à archiver (obligatoires)

Dans le back-office, page du test, bouton « Ajouter la preuve » (stockage privé) :
1. Capture des comptes connectés (avec date et heure).
2. Capture de la vue consolidée des 3 sociétés.
3. Export de la prévision et de la comparaison prévu/réalisé.
4. Chronométrage de la prise en main (note horodatée).
5. Grille tarifaire ou devis daté utilisé pour le rapport qualité-prix.

Une note sans preuve ne peut pas être validée (règle 2 de `CLAUDE.md`).

## 5. Ce que le testeur rédige

- Verdict en une phrase, « idéal pour », « à éviter si ».
- Au moins 3 points forts et 3 limites constatées.
- Pour chaque critère : un constat de 2 à 4 phrases avec au moins un chiffre mesuré (charte `docs/CHARTE-REDACTION-TESTS.md`).

---

# Mise en ligne de la catégorie : marche à suivre de l'éditeur

Tout se fait dans le back-office (`/admin`, compte éditeur). Rien ne se publie sans validation humaine.

1. **Catalogue → chaque logiciel** : ouvrir la source de chaque fait et de chaque prix en brouillon, vérifier la citation,
   puis « Valider » ou « Rejeter ». Compléter les faits manquants (hébergement des données, intégrations nommées).
   Bloc **Avis publics** : ouvrir chaque page G2 ou GetApp (5 notes relevées le 11/11/2026 via les moteurs de recherche,
   ces sites bloquant la lecture automatique), corriger la note et le nombre d'avis, puis « Vérifié : valider ».
   Pennylane et Cegid Exabanque : notes à relever à la main.
2. **Catalogue → « Publier comme « référencé, non testé » »** pour chaque logiciel vérifié : la fiche apparaît en « référencé, non testé », non indexée.
3. **Catalogue → logiciel → « Démarrer un test »** dans la catégorie trésorerie, selon ce protocole. Saisir les notes par critère,
   les justifications, joindre les preuves, puis **« Valider le test et publier les notes »** (rôle éditeur ; la base refuse un test sans preuve).
   Bonne pratique : la validation est faite par une autre personne que le testeur.
4. **Catalogue → Catégories → « Publier »** la catégorie trésorerie. Le bouton refuse tant qu'aucun test n'est validé.
5. **Contenus** : les pages sont planifiées avec leur brief (classement, 3 tests, prix et alternatives d'Agicap, 2 matchs).
   Lancer l'agent de rédaction (clé Claude requise) ou rédiger, puis soumettre. La checklist SEO bloque tant qu'elle n'est pas au vert.
6. **Validation** : relire le rapport du contrôle qualité (charte, sources, conseils interdits), approuver et publier.
7. Publier aussi les pages **Méthode** et **À propos** (déjà en brouillon) : la page de méthode est citée par chaque test.

Résultat : l'assistant, la page univers Trésorerie & cash, le classement, les fiches et les matchs deviennent visibles
et indexables (`ALLOW_INDEXING=true` à activer le moment venu).
