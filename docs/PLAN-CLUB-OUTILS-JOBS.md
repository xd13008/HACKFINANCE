# Club finance, Boîte à outils, Jobs — plan (11 novembre 2026)

Trois nouveaux onglets pour Radar Finances, construits sur les comptes DAF (migration 1800).
Tous exigent un compte confirmé pour écrire ; la lecture peut rester publique.

| Onglet | Ce que fait le DAF | Ce que gagne le site | Revenus |
|---|---|---|---|
| **Club finance** | Pose des questions, répond, échange avec ses pairs | Contenu unique et frais (SEO et réponses des IA), fidélité | Indirect (audience, newsletter, sponsoring du Club) |
| **Boîte à outils** | Commande ou demande un devis pour un service : recouvrement, audit de factures… | Usage concret, données sur les besoins | Commission ou abonnement des partenaires, puis vente en ligne |
| **Jobs** | Consulte et publie des offres d'emploi finance | Trafic Google pour l'emploi, lien avec les sociétés de la base | Offres mises en avant, abonnements des cabinets de recrutement |

**Ordre recommandé : Jobs → Club finance → Boîte à outils.**
Jobs se remplit seul (import France Travail) et attire du trafic vite. Le Club demande une modération active.
La Boîte à outils demande des contrats partenaires et une revue juridique.

Prérequis communs, avant toute ouverture au public :
- clé Brevo en production (e-mails) ;
- page « Données personnelles » complétée ;
- **conditions générales d'utilisation** (obligatoires pour tout contenu publié par les membres) ;
- un **point de contact** pour les signalements (règlement européen sur les services numériques, DSA).

---

## 1. Club finance (questions-réponses entre DAF)

**Format.** Questions et réponses plutôt que forum libre : chaque fil a une question claire, des réponses votées
« utile », une « meilleure réponse » choisie par l'auteur. Rangement par univers (8) et sous-rubriques (24) existants.
Une réponse peut citer une fiche logiciel ou un test : le maillage vers le catalogue est automatique.

**Identité affichée.** Prénom, fonction, taille d'entreprise (ex. « Claire, DAF, PME 50-249 »). Jamais le nom de
l'entreprise sans accord : un DAF parle plus librement. Badges : « Éditeur de logiciel », « Cabinet », « Rédaction »,
obligatoires dès qu'un membre a un intérêt commercial (pas de publicité déguisée).

**Modération (trois niveaux).**
1. *Avant publication* :
   - les 3 premiers messages d'un nouveau membre attendent une validation ;
   - un filtre automatique retient les messages avec liens, coordonnées, démarchage, mots interdits ou données personnelles.
   - Un agent « modération » peut proposer un classement (accepter, retenir, motif), en brouillon, comme les autres agents (règle 4) : **un humain décide**.
2. *Après publication* :
   - un bouton « Signaler » sur chaque message ;
   - une file de modération dans le back-office, traitée sous 48 h ;
   - le motif de la décision est envoyé à l'auteur, avec un recours possible (DSA).
3. *Sanctions graduées* : avertissement, suspension, exclusion. Toutes sont journalisées (`audit_log`).

**Règles de la charte du Club.**
- Pas de démarchage commercial.
- Pas de conseil juridique ou fiscal personnalisé.
- Sujets réglementés (crédit, financement, assurance, placements) : discussion d'information seulement, aucune offre ni mise en relation (règle 5).
- Avis sur un logiciel : bienvenus, mais marqués « avis de membre ». Ils n'entrent jamais dans la note éditoriale (règles 2 et 6).

**Droits (base).**
- Nouveau rôle `moderator` dans le back-office.
- Un membre ne modifie que ses propres messages, dans un délai donné.
- Le commercial ne voit ni ne modifie rien du Club (règle 3).
- Tests pgTAP obligatoires (règle 10).

**SEO.** Fils indexés seulement une fois qu'ils ont une réponse validée. Fils sans réponse : `noindex`.
Données structurées `QAPage`. Données personnelles : à la suppression d'un compte, les messages sont anonymisés
(« Membre supprimé ») ou supprimés au choix du membre.

**Lancement.** Amorcer avec 30 à 50 questions réelles issues des recherches Semrush (questions SEO déjà en base,
migration 0900), posées par la rédaction et marquées « Rédaction ». Inviter les premiers inscrits.

---

## 2. Boîte à outils (services payants)

**Services visés.**
- Recouvrement amiable de créances.
- Audit de factures fournisseurs et récupération de trop-perçus.
- Audit des charges : télécoms, énergie, taxes, charges sociales.
- Vérification des IBAN fournisseurs.
- Information sur la solvabilité des clients.

**Exclus (règle 5).** Affacturage, assurance-crédit, rachat de créances, financement : contenu d'information seulement.

**Modèle recommandé : mise en relation d'abord, vente en ligne ensuite.**
1. *Mise en relation* :
   - chaque service a une fiche (périmètre, prix indicatif, délais, partenaire) ;
   - le DAF remplit une demande ; elle n'est transmise au partenaire qu'avec **son accord explicite**, demande par demande. C'est la promesse faite à l'inscription : rien n'est transmis sans accord ;
   - le partenaire paie une commission au succès ou un abonnement.
2. *Vente en ligne* (plus tard, paiement Stripe déjà prévu dans ARCHITECTURE) : des offres forfaitaires (ex. « audit de 12 mois de factures télécom ») commandées et payées sur le site, réalisées par le partenaire.

**Garde-fous.**
- Les services sont marqués « Partenaire » et séparés de l'éditorial. Le classement des logiciels n'en dépend jamais (règle 3).
- Recouvrement : le partenaire justifie de son assurance de responsabilité civile, de son compte réservé aux fonds encaissés et de sa déclaration au procureur (activité encadrée). On vérifie avant de le référencer.
- Revue juridique avant ouverture : statut d'intermédiaire, conditions générales de vente (CGV) en cas de vente en ligne, facturation des commissions.

**Vivier de partenaires déjà en base.**
- 630 sociétés de recouvrement.
- 19 cabinets de réduction des coûts.
- Intégrateurs et cabinets d'audit.

---

## 3. Jobs (offres d'emploi finance)

**Sources des offres.**
1. *Import automatique* de l'API Offres d'emploi de France Travail (gratuite, inscription requise). Elle couvre les métiers de la finance : comptabilité, audit et contrôle comptable, contrôle de gestion, analyse financière, direction administrative et financière, management comptable.
2. *Dépôt par les membres* : un DAF qui recrute, une entreprise, un cabinet de recrutement (2 296 en base). Il faut un compte confirmé et une société identifiée par son SIREN. L'offre est relue avant publication.

**Lien avec la base.** Chaque offre est rattachée à la société qui recrute par son SIREN. Résultats :
- sur la fiche d'un cabinet : « 3 offres en cours » ;
- côté recruteurs : statistiques par ville et par métier ;
- pour les DAF inscrits : alertes emploi, avec leur accord.

**Règles légales vérifiées à la publication (Code du travail).**
- Offre datée et rédigée en français.
- Aucune mention discriminatoire et aucune limite d'âge.
- Aucune allégation fausse sur le poste.
- L'offre expire automatiquement (60 jours par défaut).

**Candidature.** V1 : lien ou e-mail du recruteur. **Aucun CV stocké sur le site** : on évite une charge RGPD lourde. On ajoutera le dépôt de CV seulement si la demande est forte.

**SEO.**
- Données structurées `JobPosting`, pour apparaître dans les résultats emploi de Google.
- Une offre expirée est retirée du sitemap, puis renvoie une erreur 410.
- Pages « offres de contrôleur de gestion à Lyon » générées comme les pages locales des annuaires.

**Revenus.** Dépôt gratuit au lancement. Ensuite :
- offre mise en avant (payante) ;
- abonnement des cabinets de recrutement ;
- e-mail « offre de la semaine » aux inscrits, avec leur accord.

---

## 4. Navigation

Menu principal : **Trouver** · Univers · **Club** · **Boîte à outils** · **Jobs** · Mon espace.
Chaque onglet n'apparaît qu'une fois ouvert au public (même logique que les univers sans catégorie publiée).

## 5. Décisions à prendre par la direction

1. Ordre de lancement : Jobs → Club → Boîte à outils (recommandé).
2. ~~Club : lecture publique et indexée, ou réservée aux membres.~~ **Décidé le 11/11/2026 : Club ouvert, lecture publique et indexée** (écriture réservée aux membres confirmés).
3. Boîte à outils : mise en relation d'abord (recommandé), ou vente en ligne directe.
4. ~~Jobs : dépôt gratuit au lancement, ou payant.~~ **Décidé le 11/11/2026 : annonce payante dès le lancement.** Conséquences : paiement en ligne (Stripe), facture automatique, CGV de vente d'annonces ; l'annonce n'est publiée qu'une fois payée et relue ; l'import France Travail reste gratuit et alimente la page Jobs dès l'ouverture.
5. Qui modère : une personne nommée, au moins 30 minutes par jour à l'ouverture du Club.
