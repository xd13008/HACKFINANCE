-- =============================================================================
-- Contenus de démonstration — passent par le VRAI circuit :
-- brouillon → submit_version() (checklist SEO bloquante) → approve_version() (éditeur humain)
-- Tous marqués is_fictional = true (bandeau « données de démonstration » sur le site).
-- =============================================================================

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', false);

create or replace function pg_temp.c(
  p_site text, p_type public.content_type, p_slug text, p_kw text,
  p_meta_title text, p_meta_desc text, p_h1 text, p_summary text, p_body text,
  p_faq jsonb default '[]', p_data jsonb default '{}', p_sources jsonb default '[]',
  p_sw text default null, p_sw_b text default null, p_cat text default null, p_facet text default null,
  p_cluster text default null
) returns uuid language plpgsql as $$
declare
  sid uuid; kid uuid; iid uuid; vid uuid; cid uuid; fid uuid; s jsonb;
  editor constant uuid := '00000000-0000-4000-a000-000000000002';
begin
  select id into sid from public.sites where key = p_site;
  if p_cat is not null then
    select id into cid from public.categories where site_id = sid and slug = p_cat;
  end if;
  if p_facet is not null then
    select id into fid from public.facets where category_id = cid and slug = p_facet;
  end if;
  if p_kw is not null then
    select id into kid from public.keyword_targets where site_id = sid and keyword = p_kw;
    if kid is null then
      insert into public.keyword_targets (site_id, keyword, intent, cluster, source)
      values (sid, p_kw, case when p_type in ('software_review','pricing','alternatives','duel') then 'commercial' else 'informational' end,
              p_cluster, 'manuel')
      returning id into kid;
    end if;
  end if;

  -- La page peut déjà exister en brouillon (supabase/data) : on la réutilise.
  select id into iid from public.content_items where site_id = sid and type = p_type and slug = p_slug;
  if iid is null then
    insert into public.content_items (site_id, type, slug, title, software_id, software_b_id, category_id, facet_id,
                                      cluster, primary_keyword_id, is_fictional, created_by)
    values (sid, p_type, p_slug, p_h1,
            (select id from public.software where slug = p_sw),
            (select id from public.software where slug = p_sw_b),
            cid, fid, p_cluster, kid, true, editor)
    returning id into iid;
  end if;

  if kid is not null then
    update public.keyword_targets set target_content_id = iid, status = 'published' where id = kid;
  end if;

  insert into public.content_versions (content_item_id, version_no, meta_title, meta_description, h1, summary, body, faq, data, author_id)
  values (iid, 0, p_meta_title, p_meta_desc, p_h1, p_summary, p_body, p_faq, p_data, editor)
  returning id into vid;

  for s in select * from jsonb_array_elements(p_sources) loop
    insert into public.content_sources (content_version_id, url, title, accessed_at, excerpt)
    values (vid, s ->> 'url', s ->> 'title', current_date - 3, s ->> 'excerpt');
  end loop;

  perform public.submit_version(vid);
  perform public.approve_version(vid, 'Publication initiale (jeu de démonstration)');
  return iid;
end;
$$;

-- =============================================================================
-- PORTAIL DAF RADAR
-- =============================================================================

select pg_temp.c('daf', 'home', '', null,
  'Radar Finances — logiciels finance testés pour les PME',
  'Comparatifs indépendants de logiciels de trésorerie, facturation électronique et notes de frais, testés selon une méthode publiée.',
  'Les logiciels finance des PME, testés et comparés',
  'Radar Finances teste les logiciels financiers utilisés par les PME françaises et publie des comparatifs indépendants : chaque note repose sur un test réel, daté et validé par un humain.',
  'Choisissez une catégorie pour découvrir notre classement, les prix vérifiés et nos verdicts par profil d''entreprise.');

select pg_temp.c('daf', 'category_ranking', 'tresorerie', 'logiciel de gestion de trésorerie',
  'Logiciel de gestion de trésorerie : comparatif 2026',
  'Comparatif 2026 des logiciels de gestion de trésorerie pour PME : 3 outils testés, notes par critère, prix vérifiés et verdict par profil.',
  'Meilleur logiciel de gestion de trésorerie : comparatif 2026',
  'Pour une PME multi-entités, Trésoflux est le plus complet ; pour une TPE, Cashpilot offre le meilleur rapport simplicité-prix ; pour une ETI, Prévia est le plus puissant en prévision. Données de démonstration.',
  E'## Comment nous avons testé\n\nChaque logiciel a été testé selon le même protocole : connexion de trois banques, import de six mois de flux, catégorisation, prévision à 13 semaines et export. Les notes par critère et leurs pondérations sont publiées sur la page [méthode](/methode).\n\n## Quel logiciel de gestion de trésorerie pour quel profil ?\n\n- **TPE, indépendants** : privilégiez la simplicité et une offre gratuite pour démarrer. Voir les [logiciels de trésorerie gratuits](/meilleurs-logiciels/tresorerie/gratuit).\n- **PME multi-entités** : la consolidation et les scénarios deviennent indispensables.\n- **ETI** : vérifiez les connecteurs ERP et la gestion des droits.\n\nPour aller plus loin, lisez notre guide [comment choisir un logiciel de prévision de trésorerie](/guides/choisir-logiciel-tresorerie).',
  '[{"q":"Qu''est-ce qu''un logiciel de gestion de trésorerie ?","a":"Un outil qui agrège les comptes bancaires, catégorise les flux et projette le solde de trésorerie à quelques semaines ou mois."},{"q":"Existe-t-il un logiciel de trésorerie gratuit ?","a":"Oui, certains éditeurs proposent une offre gratuite limitée à un compte bancaire ; voir notre sélection dédiée."}]',
  '{}', '[{"url":"https://example.com/tresoflux/tarifs","title":"Tarifs Trésoflux (démo)"},{"url":"https://example.com/cashpilot/tarifs","title":"Tarifs Cashpilot (démo)"},{"url":"https://example.com/previa/tarifs","title":"Tarifs Prévia (démo)"}]',
  null, null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'facet_landing', 'tresorerie/gratuit', 'logiciel trésorerie gratuit',
  'Logiciel trésorerie gratuit : notre sélection 2026',
  'Quels logiciels de trésorerie proposent une vraie offre gratuite ? Sélection testée, limites de chaque offre et alternatives payantes abordables.',
  'Logiciel trésorerie gratuit : les offres qui tiennent la route',
  'Parmi les logiciels testés, seul Cashpilot propose une offre gratuite réelle, limitée à un compte bancaire. Données de démonstration.',
  E'## Ce que couvre une offre gratuite\n\nLes offres gratuites se limitent généralement à un compte bancaire et à un historique court. Elles suffisent pour une TPE qui veut suivre son solde au quotidien.\n\n## Quand passer à une offre payante ?\n\nDès que vous gérez plusieurs banques ou plusieurs entités, ou que vous avez besoin de scénarios de prévision. Comparez les offres dans notre [classement complet](/meilleurs-logiciels/tresorerie).',
  '[]', '{}', '[{"url":"https://example.com/cashpilot/tarifs","title":"Tarifs Cashpilot (démo)"}]',
  null, null, 'tresorerie', 'gratuit', 'tresorerie');

select pg_temp.c('daf', 'software_review', 'tresoflux', 'avis tresoflux',
  'Avis Trésoflux 2026 : test complet, prix et verdict',
  'Notre avis sur Trésoflux après un test réel : connexions bancaires, prévisions, consolidation multi-entités, prix et alternatives.',
  'Avis Trésoflux : notre test complet en 2026',
  'Trésoflux est le logiciel de trésorerie le plus complet de notre test pour une PME multi-entités, au prix d''un paramétrage initial plus long. Logiciel fictif, données de démonstration.',
  E'## Prise en main\n\nComptez environ deux heures pour connecter les banques et paramétrer les catégories. Une fois en place, le tableau de bord consolidé est le plus lisible du comparatif.\n\n## Prévisions\n\nLe module de scénarios permet de comparer un budget, un scénario prudent et un scénario de croissance.\n\nVoir aussi : [prix de Trésoflux](/logiciels/tresoflux/prix) · [Cashpilot vs Trésoflux](/comparer/cashpilot-vs-tresoflux).',
  '[]', '{}', '[{"url":"https://example.com/tresoflux","title":"Site de l''éditeur (démo)"},{"url":"https://example.com/tresoflux/tarifs","title":"Tarifs (démo)"}]',
  'tresoflux', null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'software_review', 'cashpilot', 'avis cashpilot',
  'Avis Cashpilot 2026 : test, prix et limites',
  'Notre avis sur Cashpilot après un test réel : offre gratuite, prise en main, prévisions, limites pour les PME et alternatives.',
  'Avis Cashpilot : le logiciel de trésorerie simple pour TPE',
  'Cashpilot est le plus simple et le plus abordable de notre test, idéal pour une TPE, mais limité dès qu''il faut gérer plusieurs entités. Logiciel fictif, données de démonstration.',
  E'## Prise en main\n\nLe premier tableau de bord est prêt en dix minutes : c''est le point fort de l''outil.\n\n## Limites\n\nPas de consolidation multi-entités et des prévisions linéaires. Voir les [alternatives à Cashpilot](/logiciels/cashpilot/alternatives).',
  '[]', '{}', '[{"url":"https://example.com/cashpilot","title":"Site de l''éditeur (démo)"}]',
  'cashpilot', null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'software_review', 'previa', 'avis previa',
  'Avis Prévia 2026 : test du logiciel de prévision',
  'Notre avis sur Prévia après un test réel : moteur de scénarios, intégrations ERP, ergonomie, tarifs sur devis et profil idéal.',
  'Avis Prévia : le spécialiste des prévisions pour ETI',
  'Prévia offre le moteur de prévision le plus avancé du test, mais son interface et son tarif sur devis le réservent aux ETI. Logiciel fictif, données de démonstration.',
  E'## Prévisions et scénarios\n\nLe moteur de scénarios est le plus riche du comparatif, avec des hypothèses par entité et par devise.\n\n## Pour qui ?\n\nLes ETI et groupes dotés d''un contrôle de gestion. Pour une PME, comparez avec le [classement complet](/meilleurs-logiciels/tresorerie).',
  '[]', '{}', '[{"url":"https://example.com/previa","title":"Site de l''éditeur (démo)"}]',
  'previa', null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'pricing', 'tresoflux', 'prix tresoflux',
  'Prix Trésoflux 2026 : tarifs et offres détaillés',
  'Combien coûte Trésoflux ? Détail des offres Essentiel et Groupe, conditions d''engagement et coût réel pour une PME multi-entités.',
  'Prix Trésoflux : combien coûte le logiciel en 2026 ?',
  'Trésoflux coûte 89 € HT par mois et par entité (offre Essentiel) ou 249 € HT par mois jusqu''à 5 entités (offre Groupe), avec engagement annuel. Données de démonstration.',
  E'## Ce que comprend chaque offre\n\nL''offre Groupe ajoute la consolidation et les scénarios multiples.\n\n## Le bon calcul\n\nAu-delà de trois entités, l''offre Groupe devient plus avantageuse. Lire notre [avis complet sur Trésoflux](/logiciels/tresoflux).',
  '[]', '{}', '[{"url":"https://example.com/tresoflux/tarifs","title":"Grille tarifaire (démo)"}]',
  'tresoflux', null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'alternatives', 'cashpilot', 'alternative cashpilot',
  'Alternative Cashpilot : 2 logiciels à comparer',
  'Vous cherchez une alternative à Cashpilot ? Comparez Trésoflux et Prévia selon vos besoins : multi-entités, prévisions avancées, budget.',
  'Alternative Cashpilot : quels logiciels choisir quand on grandit ?',
  'Les deux meilleures alternatives à Cashpilot de notre test sont Trésoflux (PME multi-entités) et Prévia (ETI, prévisions avancées). Données de démonstration.',
  E'## Pourquoi changer de logiciel ?\n\nLe passage à plusieurs entités ou le besoin de scénarios est la raison la plus fréquente.\n\nComparer directement : [Cashpilot vs Trésoflux](/comparer/cashpilot-vs-tresoflux).',
  '[]', '{}', '[{"url":"https://example.com/cashpilot/fonctionnalites","title":"Fonctionnalités Cashpilot (démo)"}]',
  'cashpilot', null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'duel', 'cashpilot-vs-tresoflux', 'cashpilot vs tresoflux',
  'Cashpilot vs Trésoflux : comparatif 2026',
  'Cashpilot ou Trésoflux ? Comparaison critère par critère après test réel : prix, connexions bancaires, prévisions, verdict par profil.',
  'Cashpilot vs Trésoflux : lequel choisir pour votre trésorerie ?',
  'Cashpilot convient aux TPE qui veulent un outil simple et gratuit pour démarrer ; Trésoflux convient aux PME multi-entités qui ont besoin de consolidation et de scénarios. Données de démonstration.',
  E'## Verdict par profil\n\nLe tableau ci-dessus reprend nos notes par critère. Les deux outils ont été testés avec le même protocole.',
  '[]', '{"profiles":[{"profile":"TPE, indépendant","winner":"cashpilot","why":"Offre gratuite et prise en main immédiate."},{"profile":"PME multi-entités","winner":"tresoflux","why":"Consolidation et scénarios de prévision."}]}',
  '[{"url":"https://example.com/cashpilot/tarifs","title":"Tarifs Cashpilot (démo)"},{"url":"https://example.com/tresoflux/tarifs","title":"Tarifs Trésoflux (démo)"}]',
  'cashpilot', 'tresoflux', 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'guide', 'choisir-logiciel-tresorerie', 'logiciel de prévision de trésorerie',
  'Logiciel de prévision de trésorerie : comment choisir',
  'Les 6 critères pour choisir un logiciel de prévision de trésorerie en PME : connexions bancaires, scénarios, multi-entités, intégrations et coût.',
  'Logiciel de prévision de trésorerie : comment bien le choisir',
  'Un bon logiciel de prévision de trésorerie se juge sur six critères : la couverture bancaire, la qualité de la catégorisation, les scénarios, le multi-entités, les intégrations comptables et le coût total.',
  E'## 1. La couverture bancaire\n\nVérifiez que toutes vos banques, y compris les banques en ligne, sont connectées nativement.\n\n## 2. Les scénarios de prévision\n\nUn outil de prévision utile compare au moins un budget et un scénario prudent.\n\n## 3. Le multi-entités\n\nIndispensable dès que vous avez une holding ou des filiales.\n\n## Nos recommandations\n\n- Comparez les outils testés dans notre [classement des logiciels de trésorerie](/meilleurs-logiciels/tresorerie).\n- Démarrez gratuitement avec un [logiciel de trésorerie gratuit](/meilleurs-logiciels/tresorerie/gratuit).\n- Préparez vos hypothèses avec notre [modèle de prévisionnel de trésorerie](/ressources/modele-previsionnel-tresorerie).\n- Revoyez la notion de [BFR](/lexique/bfr) avant de construire vos prévisions.',
  '[{"q":"À quel horizon prévoir sa trésorerie ?","a":"13 semaines pour le pilotage opérationnel, 12 mois pour le budget et les discussions bancaires."},{"q":"Excel suffit-il ?","a":"Pour une TPE mono-banque, souvent oui ; au-delà, la connexion bancaire automatique fait gagner plusieurs heures par mois."}]',
  '{}', '[{"url":"https://example.com/etude-tresorerie-pme","title":"Étude fictive sur la trésorerie des PME (démo)"}]',
  null, null, 'tresorerie', null, 'tresorerie');

select pg_temp.c('daf', 'guide', 'facturation-electronique-pme', 'facturation électronique',
  'Facturation électronique : ce qui change pour les PME',
  'Facturation électronique obligatoire : calendrier 2026-2027, rôle des plateformes agréées, étapes pour préparer votre PME. Guide pratique.',
  'Facturation électronique : le calendrier et les étapes pour les PME',
  'Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques ; les PME et microentreprises devront les émettre à partir du 1er septembre 2027, via une plateforme agréée.',
  E'## Le calendrier\n\n- **1er septembre 2026** : obligation de réception pour toutes les entreprises ; obligation d''émission pour les grandes entreprises et les ETI.\n- **1er septembre 2027** : obligation d''émission pour les PME et microentreprises.\n\n## Les étapes pour se préparer\n\n1. Recenser vos flux de facturation.\n2. Choisir une plateforme agréée (notre comparatif est en préparation).\n3. Mettre à jour vos données clients (SIREN).\n\n## À lire aussi\n\n- [Notre méthode de test](/methode)\n- [Comment choisir un logiciel de prévision de trésorerie](/guides/choisir-logiciel-tresorerie)\n- [Les logiciels de trésorerie comparés](/meilleurs-logiciels/tresorerie)',
  '[]', '{"editor_note":"Sources officielles à vérifier avant mise en ligne réelle."}',
  '[{"url":"https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique","title":"impots.gouv.fr — facturation électronique (à vérifier)"}]',
  null, null, null, null, 'facturation-electronique');

select pg_temp.c('daf', 'resource', 'modele-previsionnel-tresorerie', 'modèle prévisionnel de trésorerie',
  'Modèle prévisionnel de trésorerie gratuit (Excel)',
  'Téléchargez notre modèle prévisionnel de trésorerie sur 12 mois : encaissements, décaissements, BFR et scénario prudent. Format Excel.',
  'Modèle prévisionnel de trésorerie : le fichier Excel gratuit',
  'Un modèle prévisionnel de trésorerie sur 12 mois, avec un onglet hypothèses, un scénario prudent et un suivi du BFR.',
  E'## Ce que contient le modèle\n\n- un onglet hypothèses ;\n- un plan de trésorerie mensuel ;\n- un scénario prudent.\n\n## Et après ?\n\n- Automatisez avec un [logiciel de gestion de trésorerie](/meilleurs-logiciels/tresorerie).\n- Lisez [comment choisir un logiciel de prévision](/guides/choisir-logiciel-tresorerie).\n- Revoyez la définition du [BFR](/lexique/bfr).',
  '[]', '{"file":"ressources/modele-previsionnel-tresorerie.xlsx"}', '[]',
  null, null, null, null, 'tresorerie');

select pg_temp.c('daf', 'glossary', 'bfr', 'bfr',
  'BFR : définition et calcul du besoin en fonds de roulement',
  'Le BFR (besoin en fonds de roulement) mesure l''argent immobilisé par le cycle d''exploitation. Définition, formule de calcul et exemple.',
  'BFR : définition et calcul',
  'Le BFR (besoin en fonds de roulement) est le montant nécessaire pour financer le décalage entre les encaissements clients et les décaissements fournisseurs. BFR = stocks + créances clients − dettes fournisseurs.',
  E'## Exemple\n\nUne PME avec 100 k€ de stocks, 200 k€ de créances clients et 150 k€ de dettes fournisseurs a un BFR de 150 k€.');

select pg_temp.c('daf', 'page', 'methode', null,
  'Notre méthode de test et de notation — Radar Finances',
  'Comment nous testons les logiciels : protocole, critères, pondérations, validation humaine et séparation stricte entre éditorial et publicité.',
  'Notre méthode de test et de notation',
  'Chaque note publiée repose sur un test réel, daté, documenté par des preuves et validé par un membre humain de la rédaction. Aucun partenaire commercial ne peut modifier une note ou un classement.',
  E'## Le protocole\n\nChaque catégorie a un protocole de test identique pour tous les logiciels et une grille de critères pondérés, publiée sur la page de la catégorie.\n\n## La note\n\nLa note globale est la moyenne pondérée des notes par critère. Elle est calculée automatiquement à partir du test validé.\n\n## Éditorial et publicité\n\nLes positions sponsorisées sont signalées par la mention « Sponsorisé » et affichées dans un bloc distinct du classement. Le classement éditorial ne dépend que des notes. Voir [notre politique publicitaire](/publicite).\n\n## Le rôle des agents IA\n\nDes agents IA nous aident à surveiller les prix et à préparer des brouillons. Ils ne publient jamais : chaque contenu est relu et validé par un humain.\n\n## Signaler une erreur\n\nUn formulaire de signalement et de droit de réponse est disponible sur chaque fiche, avec un délai de traitement de 10 jours ouvrés.');

select pg_temp.c('daf', 'page', 'a-propos', null,
  'À propos de Radar Finances — qui sommes-nous ?',
  'Radar Finances est un média indépendant qui teste les logiciels finance des PME. Équipe, rôle des agents IA, sources de revenus et engagements.',
  'À propos de Radar Finances',
  'Radar Finances est un média indépendant consacré aux outils et prestataires finance des PME. Nos revenus proviennent de positions sponsorisées signalées et de liens d''affiliation signalés.',
  E'## Nos sources de revenus\n\n- positions sponsorisées, toujours signalées ;\n- fiches enrichies ;\n- liens d''affiliation, toujours signalés.\n\nAucune de ces sources n''influence les notes. Voir [notre méthode](/methode).');

select pg_temp.c('daf', 'page', 'mentions-legales', null,
  'Mentions légales — Radar Finances',
  'Mentions légales du site Radar Finances : éditeur, directeur de la publication, hébergeur et contact. Informations à compléter avant mise en ligne.',
  'Mentions légales',
  'Éditeur, directeur de la publication et hébergeur du site. À compléter avant la mise en ligne.',
  E'## Éditeur\n\n[À compléter : raison sociale, SIREN, adresse, directeur de la publication]\n\n## Hébergement\n\n[À compléter : hébergeur, région UE]');

select pg_temp.c('daf', 'page', 'donnees-personnelles', null,
  'Données personnelles et mesure d''audience — Radar Finances',
  'Comment Radar Finances traite vos données : formulaires, consentement, durées de conservation, mesure d''audience sans cookie et vos droits RGPD.',
  'Données personnelles et mesure d''audience',
  'Nous mesurons l''audience sans cookie et sans stocker d''adresse IP. Les données des formulaires ne sont utilisées que pour la finalité indiquée lors de votre consentement.',
  E'## Mesure d''audience\n\nIdentifiant de session calculé à partir d''un hachage quotidien, non réversible. Conservation : 25 mois.\n\n## Vos droits\n\n[À compléter : contact DPO, base légale, durées de conservation par formulaire — à valider lors de la revue RGPD.]');

-- =============================================================================
-- PORTAIL CÉDER MA SOCIÉTÉ
-- =============================================================================

select pg_temp.c('cession', 'home', '', null,
  'Céder ma société — vendre son entreprise, étape par étape',
  'Guides pratiques, simulateurs de valorisation et de fiscalité, annuaire des conseils en cession : tout pour préparer la vente de votre PME.',
  'Vendre son entreprise, étape par étape',
  'Céder ma société accompagne les dirigeants de TPE et PME qui préparent la vente de leur entreprise : guides, simulateurs gratuits et annuaire de conseils vérifiés.',
  'Commencez par estimer la valeur de votre entreprise, puis suivez notre guide étape par étape.');

select pg_temp.c('cession', 'pillar', 'vendre-sa-societe', 'vendre sa société',
  'Vendre sa société : le guide complet étape par étape',
  'Vendre sa société en 7 étapes : préparation, valorisation, recherche d''acquéreurs, lettre d''intention, audit, négociation et signature.',
  'Vendre sa société : le guide complet, étape par étape',
  'Vendre sa société prend en général 9 à 18 mois et suit sept étapes : préparation, valorisation, recherche d''acquéreurs, lettre d''intention, audit, négociation de la garantie, puis signature et transition.',
  E'## 1. Se préparer (6 à 24 mois avant)\n\nAssainir les comptes, réduire la dépendance au dirigeant, documenter les contrats clés.\n\n## 2. Valoriser l''entreprise\n\nUtilisez notre [simulateur de valorisation](/outils/valorisation-entreprise) puis lisez [comment valoriser une entreprise](/guides/valoriser-son-entreprise).\n\n## 3. Trouver des acquéreurs\n\nRepreneurs individuels, concurrents, fonds : un [conseil en cession](/prestataires/conseils-cession) peut organiser un processus confidentiel.\n\n## 4. La lettre d''intention\n\nElle fixe le prix indicatif, le périmètre et le calendrier.\n\n## 5. L''audit d''acquisition\n\nL''acquéreur vérifie les comptes, le juridique, le social et le fiscal.\n\n## 6. La négociation\n\nPrix, [earn-out](/lexique/earn-out), [garantie d''actif et de passif](/lexique/garantie-actif-passif).\n\n## 7. La signature et la transition\n\nAnticipez la [fiscalité de la cession](/outils/fiscalite-cession).',
  '[{"q":"Combien de temps faut-il pour vendre sa société ?","a":"Comptez en général 9 à 18 mois entre la préparation et la signature."},{"q":"Faut-il passer par un intermédiaire ?","a":"Ce n''est pas obligatoire, mais un conseil en cession élargit le nombre d''acquéreurs et sécurise la négociation."}]',
  '{}', '[{"url":"https://bpifrance-creation.fr/moments-de-vie/quand-faut-il-envisager-vendre-son-entreprise","title":"Bpifrance Création — vendre son entreprise"},{"url":"https://www.cci.fr/ressources/ceder-votre-entreprise/mettez-votre-entreprise-en-vente","title":"CCI France — mettre son entreprise en vente"}]',
  null, null, null, null, 'cession');

select pg_temp.c('cession', 'guide', 'valoriser-son-entreprise', 'comment valoriser une entreprise',
  'Comment valoriser une entreprise : les 3 méthodes',
  'Comment valoriser une entreprise de façon réaliste : multiples d''EBE, méthode patrimoniale et flux de trésorerie actualisés, avec exemples.',
  'Comment valoriser une entreprise : 3 méthodes utilisées en PME',
  'Pour valoriser une PME, on croise en général trois méthodes : les multiples d''EBE (la plus utilisée), la méthode patrimoniale (actif net réévalué) et les flux de trésorerie actualisés.',
  E'## 1. Les multiples d''EBE\n\nValeur d''entreprise = EBE retraité × multiple sectoriel, puis on retire la dette nette. Testez avec notre [simulateur de valorisation](/outils/valorisation-entreprise).\n\n## 2. La méthode patrimoniale\n\nAdaptée aux entreprises à forts actifs.\n\n## 3. Les flux actualisés (DCF)\n\nPlus théorique, utilisée pour les entreprises en croissance.\n\n## Et ensuite ?\n\nReprenez le [guide complet pour vendre sa société](/dossiers/vendre-sa-societe) ou contactez un [conseil en cession](/prestataires/conseils-cession).',
  '[]', '{}', '[{"url":"https://bpifrance-creation.fr/moments-de-vie/quand-faut-il-envisager-vendre-son-entreprise","title":"Bpifrance Création"}]',
  null, null, null, null, 'cession');

select pg_temp.c('cession', 'simulator', 'valorisation-entreprise', 'valorisation entreprise',
  'Valorisation entreprise : simulateur gratuit',
  'Estimez la valeur de votre entreprise en 2 minutes avec notre simulateur par multiples d''EBE et de chiffre d''affaires. Gratuit, sans inscription.',
  'Valorisation entreprise : simulateur gratuit par multiples',
  'Ce simulateur donne une fourchette indicative de valorisation à partir de votre EBE, de votre secteur et de votre dette nette. Il ne remplace pas une évaluation par un professionnel.',
  E'## Comment lire le résultat\n\nLa fourchette reflète des multiples indicatifs de démonstration. Pour une estimation fiable, faites appel à un [conseil en cession](/prestataires/conseils-cession).\n\n## Aller plus loin\n\n- [Comment valoriser une entreprise](/guides/valoriser-son-entreprise)\n- [Le guide complet pour vendre sa société](/dossiers/vendre-sa-societe)\n- [Simuler la fiscalité de la cession](/outils/fiscalite-cession)',
  '[]', '{"kind":"valuation","disclaimer":"Multiples indicatifs de démonstration, à remplacer par des données sourcées avant mise en ligne.","sectors":[{"key":"industrie","label":"Industrie","ebitda_low":4,"ebitda_high":6},{"key":"services-b2b","label":"Services B2B","ebitda_low":5,"ebitda_high":7},{"key":"commerce","label":"Commerce","ebitda_low":3,"ebitda_high":5},{"key":"btp","label":"BTP","ebitda_low":3,"ebitda_high":4.5},{"key":"tech","label":"Logiciel & tech","ebitda_low":7,"ebitda_high":12}]}',
  '[]', null, null, null, null, 'cession');

select pg_temp.c('cession', 'simulator', 'fiscalite-cession', 'fiscalité cession entreprise',
  'Fiscalité cession entreprise : simulateur de plus-value',
  'Estimez l''impôt sur la plus-value de cession de vos titres : prélèvement forfaitaire, abattement départ à la retraite. Simulation indicative.',
  'Fiscalité cession entreprise : simulez l''impôt sur votre plus-value',
  'Ce simulateur estime l''imposition de la plus-value de cession de titres au prélèvement forfaitaire unique, avec l''option d''abattement fixe pour départ à la retraite. Estimation générale, pas un conseil fiscal.',
  E'## Les paramètres utilisés\n\nLes taux sont affichés sous le simulateur et doivent être vérifiés à chaque loi de finances.\n\n## À lire aussi\n\n- [Céder son entreprise avant la retraite](/dossiers/vendre-sa-societe)\n- [Estimer la valeur de son entreprise](/outils/valorisation-entreprise)\n- [Trouver un conseil en cession](/prestataires/conseils-cession)',
  '[]', '{"kind":"capital_gains","disclaimer":"Estimation indicative. Taux à vérifier par la rédaction à chaque loi de finances (dernière vérification : à faire).","ir_rate":12.8,"ps_rate":17.2,"retirement_allowance":500000}',
  '[]', null, null, null, null, 'cession');

select pg_temp.c('cession', 'provider_directory', 'conseils-cession', 'cabinet cession entreprise',
  'Cabinet cession entreprise : l''annuaire des conseils',
  'Annuaire des cabinets de conseil en cession d''entreprise : spécialités, tailles d''opérations, zones. Fiches vérifiées, référencement gratuit.',
  'Cabinet cession entreprise : trouvez votre conseil',
  'Notre annuaire recense les cabinets de conseil en cession d''entreprise, avec leurs spécialités et la taille des opérations qu''ils accompagnent. L''ordre d''affichage n''est pas un classement.',
  E'## Comment choisir son conseil\n\nVérifiez la taille des opérations accompagnées, les secteurs, et le mode de rémunération (forfait, honoraires de succès).\n\nVous êtes un cabinet ? [Référencez-vous gratuitement](/referencer-mon-cabinet).',
  '[]', '{}', '[]', null, null, 'conseils-cession', null, 'conseils-cession');

select pg_temp.c('cession', 'provider_directory', 'banques-affaires', 'banque d''affaires',
  'Banque d''affaires PME : l''annuaire 2026',
  'Annuaire des banques d''affaires et boutiques M&A actives sur les PME : secteurs, tailles d''opérations, références publiques vérifiées.',
  'Banque d''affaires PME : l''annuaire des boutiques M&A',
  'Les banques d''affaires accompagnent les cessions de PME de plus de quelques millions d''euros. Notre annuaire présente des fiches factuelles, sans classement.',
  E'## Banque d''affaires ou conseil en cession ?\n\nLes banques d''affaires interviennent plutôt au-delà de 5 M€ de valeur d''entreprise.\n\nVous êtes une banque d''affaires ? [Référencez-vous gratuitement](/referencer-mon-cabinet).',
  '[]', '{}', '[]', null, null, 'banques-affaires', null, 'conseils-cession');

select pg_temp.c('cession', 'glossary', 'earn-out', 'earn-out',
  'Earn-out : définition et fonctionnement en cession',
  'L''earn-out (complément de prix) fait dépendre une partie du prix de cession des résultats futurs de l''entreprise. Définition et précautions.',
  'Earn-out : définition',
  'L''earn-out, ou complément de prix, est une partie du prix de cession versée plus tard si l''entreprise atteint des objectifs définis (chiffre d''affaires, EBE).',
  E'## Points de vigilance\n\nDéfinir précisément l''indicateur, la période et les règles de gestion pendant la période d''earn-out.');

select pg_temp.c('cession', 'glossary', 'garantie-actif-passif', 'garantie d''actif et de passif',
  'Garantie d''actif et de passif (GAP) : définition',
  'La garantie d''actif et de passif protège l''acquéreur contre les dettes antérieures à la cession. Définition, durée, plafond et franchise.',
  'Garantie d''actif et de passif : définition',
  'La garantie d''actif et de passif (GAP) engage le vendeur à indemniser l''acquéreur si un passif né avant la cession apparaît après, dans la limite d''un plafond et d''une durée négociés.',
  E'## Les paramètres négociés\n\nDurée, plafond, franchise, et garantie bancaire éventuelle.');

select pg_temp.c('cession', 'page', 'methode', null,
  'Notre méthode éditoriale — Céder ma société',
  'Comment nous rédigeons nos guides, construisons nos simulateurs et vérifions les fiches de l''annuaire. Indépendance et transparence.',
  'Notre méthode éditoriale',
  'Nos guides sont rédigés à partir de sources officielles datées et relus par un humain. L''annuaire n''est pas un classement : l''ordre d''affichage est alphabétique, hors positions sponsorisées signalées.',
  E'## Annuaire\n\nFiches vérifiées (SIREN, site, références publiques). Les professions réglementées n''y font l''objet d''aucun classement.\n\n## Simulateurs\n\nEstimations générales, jamais un conseil personnalisé.\n\n## Publicité\n\nVoir [notre politique publicitaire](/publicite).');

select pg_temp.c('cession', 'page', 'a-propos', null,
  'À propos de Céder ma société — qui sommes-nous ?',
  'Céder ma société est un média indépendant qui aide les dirigeants à préparer la vente de leur entreprise. Équipe, revenus et engagements.',
  'À propos de Céder ma société',
  'Céder ma société est un média indépendant. Nos revenus proviennent de mises en avant signalées dans l''annuaire ; elles n''influencent pas nos contenus.',
  'Voir [notre méthode](/methode).');

select pg_temp.c('cession', 'page', 'mentions-legales', null,
  'Mentions légales — Céder ma société',
  'Mentions légales du site Céder ma société : éditeur, directeur de la publication, hébergeur et contact. Informations à compléter.',
  'Mentions légales',
  'Éditeur, directeur de la publication et hébergeur du site. À compléter avant la mise en ligne.',
  E'## Éditeur\n\n[À compléter]\n\n## Hébergement\n\n[À compléter : région UE]');

select pg_temp.c('cession', 'page', 'donnees-personnelles', null,
  'Données personnelles — Céder ma société',
  'Comment Céder ma société traite vos données : formulaires, consentement, conservation, mesure d''audience sans cookie et droits RGPD.',
  'Données personnelles et mesure d''audience',
  'Nous mesurons l''audience sans cookie et sans stocker d''adresse IP. Les données des formulaires ne servent qu''à la finalité indiquée.',
  E'[À compléter lors de la revue RGPD.]');

-- Hub & spoke : guides et simulateurs rattachés au dossier pilier
update public.content_items set pillar_id = (select id from public.content_items where slug = 'vendre-sa-societe' and type = 'pillar')
  where site_id = '10000000-0000-4000-a000-000000000002' and type in ('guide', 'simulator', 'glossary');

-- Un brouillon en attente dans la file de validation (soumis, non approuvé)
do $$
declare iid uuid; vid uuid;
begin
  select id into iid from public.content_items where slug = 'cashpilot' and type = 'software_review';
  insert into public.content_versions (content_item_id, version_no, meta_title, meta_description, h1, summary, body, author_id)
  select content_item_id, 0, meta_title, meta_description, h1,
         summary || ' Mise à jour : nouveau prix de l''offre Pro détecté par la veille.',
         body || E'\n\n## Mise à jour tarifaire\n\nL''offre Pro passerait à 19 € HT/mois (à confirmer).',
         '00000000-0000-4000-a000-000000000002'
  from public.content_versions where id = (select published_version_id from public.content_items where id = iid)
  returning id into vid;
  insert into public.content_sources (content_version_id, url, title, accessed_at)
  values (vid, 'https://example.com/cashpilot/tarifs', 'Tarifs Cashpilot (démo)', current_date);
  perform public.submit_version(vid);
end;
$$;

select set_config('request.jwt.claims', '', false);
