# Charte de rédaction des tests, alternatives et matchs

Décision du 11 novembre 2026. Référence de niveau : les fiches de test « Labs » de Hackceleration (avis Folk CRM, alternatives à Folk).
Nous visons **la même densité et la même qualité**, avec **notre propre ton, notre structure et notre style**.
On ne copie ni leurs textes, ni leur mise en page, ni leurs formules. Toute page doit être unique.

S'applique aux rédacteurs humains et à l'agent de rédaction (agent 2), contrôlé par l'agent 3 et validé par un éditeur.

---

## 1. Ce qu'on retient de la référence

| Ce qui fait la qualité | Ce que cela donne chez nous |
|---|---|
| Un vrai avis, assumé, avec un verdict clair | Verdict en une phrase en tête, puis « idéal pour / à éviter si » |
| Un ton humain, direct, parfois piquant | Ton d'un DAF expérimenté qui parle à un pair : franc, précis, jamais commercial |
| Des preuves concrètes issues du test | Chiffres mesurés : temps de mise en place, nombre de banques connectées, écart prévision / réalisé |
| Un texte par critère, avec ses points forts et ses limites | Une section par critère de la grille, avec note, constat, preuve, points forts, limites |
| Des prix décortiqués, comparés aux concurrents | Coût réel pour 1, 3 et 5 sociétés, comparé aux 2 ou 3 alternatives les plus proches |
| Les avis du web synthétisés, distincts de la note | Synthèse des avis publics cités, jamais mêlée à notre note (règle 6) |
| Une sortie vers la suite du parcours | Matchs, alternatives, intégrateurs, formation : chaque test ouvre sur des comparatifs |
| Une FAQ qui reprend les vraies questions | 6 à 10 questions issues de Semrush et de la Search Console |

---

## 2. Le ton Radar Finances

- **On vouvoie.** Le lecteur est DAF, RAF ou dirigeant de PME. Pas de « tu ».
- **On parle d'expérience.** « Nous avons connecté 12 comptes dans 4 banques : 11 sont remontés en moins d'une heure. »
- **On tranche.** Chaque section finit par une conclusion nette : pour qui, pour quoi, à quel prix.
- **On dit ce qui ne va pas.** Chaque test comporte au moins 3 limites réelles, constatées pendant le test.
- **Pas de jargon creux.** Interdits : « solution innovante », « révolutionnaire », « incontournable », « game changer ».
- **Phrases courtes.** Une idée par phrase. Des chiffres plutôt que des adjectifs.
- **Pas de copie.** Ni du site de l'éditeur, ni d'un concurrent, ni d'un avis tiers (citations ≤ 300 caractères, règle 6).

---

## 3. Le test d'un logiciel (`software_review`)

Objectif éditorial : **1 800 à 2 500 mots**. Le minimum bloquant de `seo_check()` (600 mots) ne change pas.

1. **Réponse directe** (40 à 90 mots, contrôlée par `seo_check()`) : ce que fait l'outil, pour qui, notre note, la grande limite.
2. **Verdict** en une phrase, puis 4 indicateurs : note, rang dans la catégorie, coût réel pour le profil type, temps de mise en place.
3. **Notre avis en résumé** (150 à 250 mots) : pourquoi on le recommande ou non, avec le contexte du test. Signé par le testeur.
4. **Le test critère par critère.** Pour chaque critère de la grille :
   - un intertitre sous forme de question ou d'angle (« Connexions bancaires : 11 banques sur 12 en une heure ») ;
   - 150 à 300 mots de constat vécu, avec au moins un chiffre mesuré ;
   - la note sur 10, la preuve archivée ;
   - 3 points forts et 2 à 3 limites.
5. **Prix décortiqués** : chaque offre, ce qu'elle inclut, le coût annuel pour 1, 3 et 5 sociétés, les frais cachés, la comparaison avec 2 ou 3 alternatives.
6. **Ce que disent les utilisateurs** : notes publiques par plateforme (datées), synthèse rédigée, citations courtes avec lien. Mention « non vérifiés par la rédaction ». Jamais dans notre note.
7. **Matchs et alternatives** : les 5 matchs les plus proches (duels), le lien vers la page « Alternatives à X ».
8. **Vous cherchez quoi exactement ?** 3 sorties : comparer les alternatives, se faire accompagner (intégrateurs, annuaire sans classement), former l'équipe.
9. **FAQ** : 6 à 10 questions réelles (Semrush, Search Console), réponses de 40 à 80 mots.
10. **Méthode et sources** : protocole, date, version testée, testeur, valideur, indépendance, sources datées.

---

## 4. La page « Alternatives à X » (`alternatives`)

Objectif : **1 200 à 1 800 mots**.

1. Réponse directe : ce que X fait très bien, la limite qui pousse à partir, le nombre d'alternatives testées.
2. **Pourquoi les équipes quittent X** : 4 à 6 raisons concrètes, chacune avec un fait (prix, absence de fonction, limite constatée).
3. **Le tableau des alternatives** : rang, solution, idéal pour, avantage principal sur X, note, prix d'entrée, offre gratuite, taille cible. Tableau filtrable (§6 de `PLAN-EDITORIAL-AGENTS.md`).
4. **Choisir selon votre besoin** : « si votre raison de partir est… → prenez… ».
5. Une section courte par alternative : pourquoi la choisir à la place de X, sa limite, le lien vers son test et vers le match X vs Y.
6. FAQ, méthode, sources.

Le sponsoring éventuel (« Alternative sponsorisée ») s'affiche dans un bloc distinct, étiqueté, hors classement (règle 3).

---

## 5. Le match « X vs Y » (`duel`)

Objectif : **900 à 1 400 mots**.

1. Réponse directe : qui gagne pour quel profil, en une phrase chacun.
2. Tableau critère par critère (notes du même protocole), prix pour 1, 3 et 5 sociétés, faits clés.
3. **Verdict par profil** : 3 à 4 profils de DAF (TPE, PME multi-sociétés, ETI, équipe sans intégrateur).
4. Les différences qui comptent vraiment, en 3 à 5 sections courtes.
5. Liens vers les deux tests et vers les alternatives.

Sans analyse rédigée validée, la page reste un comparatif des données validées, en `noindex`.

---

## 6. Unicité SEO/GEO de chaque page

- **Un mot-clé principal par page**, jamais partagé (`keyword_targets`, Semrush) ; intertitres sur les questions réelles.
- **Un angle propre** : le cas testé, les chiffres mesurés et le verdict par profil rendent chaque page unique.
- **Réponse directe en tête** et phrases autonomes, citables par les moteurs de réponse.
- **Entités nommées** : éditeur, intégrations, banques, normes (Factur-X, PDP, EBICS), avec leur date.
- **Données structurées** : `Review` avec notre note seulement, `FAQPage`, fil d'Ariane. Jamais d'`AggregateRating` issu d'avis tiers.
- **Maillage** : test → matchs → alternatives → catégorie → univers, et retour.
- **Fraîcheur** : date du test et date de mise à jour visibles ; nouveau test si une version majeure sort.

---

## 7. Contrôle avant publication (agent 3 puis éditeur)

- [ ] Verdict clair et assumé ; au moins 3 limites réelles.
- [ ] Au moins un chiffre mesuré par critère, avec preuve archivée.
- [ ] Prix sourcés et datés ; coût calculé pour plusieurs tailles.
- [ ] Avis tiers cités (≤ 300 caractères, lien, date, fonction de l'auteur), séparés de la note.
- [ ] Aucune phrase copiée (éditeur, concurrent, avis).
- [ ] Ton : vouvoiement, phrases courtes, aucun mot interdit.
- [ ] Sorties vers matchs, alternatives, accompagnement.
- [ ] `seo_check()` au vert, sans l'affaiblir.
- [ ] Sujets réglementés : aucun classement, aucun lien affilié (règle 5).
