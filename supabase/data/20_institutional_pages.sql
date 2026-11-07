-- Pages institutionnelles (E-E-A-T) : brouillons préparés pour chaque portail, à compléter et valider.
-- Idempotent : n'insère une page que si elle n'existe pas encore. Pages légales en noindex.
create or replace function pg_temp.page_draft(p_site text, p_slug text, p_robots text, p_meta_title text, p_meta_desc text,
                                              p_h1 text, p_summary text, p_body text)
returns void language plpgsql as $$
declare sid uuid; iid uuid;
begin
  select id into sid from public.sites where key = p_site;
  if sid is null or exists (select 1 from public.content_items where site_id = sid and type = 'page' and slug = p_slug) then return; end if;
  insert into public.content_items (site_id, type, slug, title, robots) values (sid, 'page', p_slug, p_h1, p_robots) returning id into iid;
  insert into public.content_versions (content_item_id, version_no, meta_title, meta_description, h1, summary, body, author_kind, data)
  values (iid, 0, p_meta_title, p_meta_desc, p_h1, p_summary, p_body, 'agent',
          '{"editor_note":"Brouillon préparé par IA : compléter les passages entre crochets puis valider."}');
end;
$$;

-- Radar Finances ------------------------------------------------------------
select pg_temp.page_draft('daf', 'methode', 'index',
  'Notre méthode de test et de notation — Radar Finances',
  'Comment Radar Finances teste les logiciels : protocole, critères pondérés, validation humaine, séparation stricte entre éditorial et publicité.',
  'Notre méthode de test et de notation',
  'Chaque note publiée repose sur un test réel, daté, documenté par des preuves et validé par un membre humain de la rédaction. Aucun partenaire commercial ne peut modifier une note ou un classement.',
  E'## Le protocole de test\n\nChaque catégorie a un protocole identique pour tous les logiciels testés et une grille de critères pondérés, publiée sur la page de la catégorie. Les tests sont réalisés sur des comptes réels ou d''essai, avec des données représentatives d''une PME.\n\n## Le calcul de la note\n\nLa note globale est la moyenne pondérée des notes par critère, sur 10. Elle est calculée automatiquement à partir du test validé ; personne ne peut la saisir à la main.\n\n## Les sources et la mise à jour\n\nChaque fait (prix, fonctionnalité, hébergement) est relié à une source datée. Les fiches sont revues au moins tous les 90 jours, et dès qu''un changement de prix ou de fonctionnalité est détecté.\n\n## Éditorial et publicité\n\nLes positions sponsorisées portent la mention « Sponsorisé » et s''affichent dans un bloc distinct du classement, qui ne dépend que des notes. Les liens d''affiliation sont signalés. Voir [notre politique publicitaire](/publicite).\n\n## Le rôle des agents IA\n\nDes agents IA surveillent les prix et préparent des brouillons. Ils ne publient jamais : chaque contenu est relu, sourcé et validé par un humain.\n\n## Signaler une erreur\n\nUn [formulaire de signalement et de droit de réponse](/signaler-une-erreur) est disponible sur chaque page ; nous répondons sous 10 jours ouvrés.');

select pg_temp.page_draft('daf', 'a-propos', 'index',
  'À propos de Radar Finances — qui sommes-nous ?',
  'Radar Finances est un média indépendant qui teste les logiciels finance des PME : équipe, rôle des agents IA, sources de revenus et engagements.',
  'À propos de Radar Finances',
  'Radar Finances est un média indépendant consacré aux logiciels et prestataires finance des PME françaises. Il s''adresse aux DAF, RAF et dirigeants qui doivent choisir leurs outils.',
  E'## L''équipe\n\n[À compléter : noms, parcours et expertise des membres de la rédaction — un signal de confiance important pour les lecteurs et les moteurs.]\n\n## Nos engagements\n\n- Des tests réels, datés et documentés ([notre méthode](/methode)).\n- Des faits sourcés et revus régulièrement.\n- Une séparation stricte entre la rédaction et la publicité.\n\n## Nos sources de revenus\n\nPositions sponsorisées et fiches enrichies, toujours signalées ; liens d''affiliation, toujours signalés. Aucune de ces sources n''influence les notes. Détails : [publicité et partenariats](/publicite).');

select pg_temp.page_draft('daf', 'mentions-legales', 'noindex',
  'Mentions légales — Radar Finances',
  'Mentions légales du site Radar Finances : éditeur, directeur de la publication, hébergeur et contact. Informations à compléter avant publication.',
  'Mentions légales',
  'Éditeur, directeur de la publication, hébergeur et contact du site Radar Finances.',
  E'## Éditeur\n\n[À compléter : raison sociale, forme, capital, SIREN, adresse du siège, numéro de TVA]\n\n## Directeur de la publication\n\n[À compléter]\n\n## Hébergement\n\nVercel Inc. (site) et Supabase (données, région Union européenne, Paris).\n\n## Contact\n\n[À compléter : adresse e-mail de contact]');

select pg_temp.page_draft('daf', 'donnees-personnelles', 'noindex',
  'Données personnelles et mesure d''audience — Radar Finances',
  'Comment Radar Finances traite vos données : formulaires, consentement, durées de conservation, mesure d''audience sans cookie et droits RGPD.',
  'Données personnelles et mesure d''audience',
  'Nous mesurons l''audience sans cookie et sans conserver d''adresse IP. Les données des formulaires ne servent qu''à la finalité indiquée lors de votre consentement.',
  E'## Mesure d''audience\n\nUn identifiant de session est calculé chaque jour à partir d''un hachage non réversible ; aucune adresse IP n''est conservée et aucun cookie n''est déposé. Les statistiques sont conservées 25 mois.\n\n## Formulaires\n\n[À compléter lors de la revue RGPD : finalités, base légale, durées de conservation, destinataires.]\n\n## Vos droits\n\n[À compléter : contact pour exercer vos droits d''accès, de rectification et d''effacement ; réclamation auprès de la CNIL.]');

-- Céder ma société ----------------------------------------------------------
select pg_temp.page_draft('cession', 'methode', 'index',
  'Notre méthode éditoriale — Céder ma société',
  'Comment Céder ma société rédige ses guides, construit ses simulateurs et vérifie les fiches de l''annuaire des conseils en cession.',
  'Notre méthode éditoriale',
  'Nos guides sont rédigés à partir de sources officielles datées et relus par un humain. L''annuaire n''est pas un classement : l''ordre d''affichage est alphabétique, hors mises en avant signalées.',
  E'## Les guides\n\nChaque guide s''appuie sur des sources officielles datées et est revu au moins tous les 180 jours. Il s''agit d''information générale, jamais d''un conseil juridique ou fiscal personnalisé.\n\n## Les simulateurs\n\nLes simulateurs donnent des estimations indicatives ; leurs paramètres et leur date de mise à jour sont affichés.\n\n## L''annuaire\n\nLes fiches sont vérifiées (SIREN, site, références publiques). Les professions réglementées n''y font l''objet d''aucun classement. Les mises en avant payantes sont signalées.\n\n## Signaler une erreur\n\n[Formulaire de signalement et de droit de réponse](/signaler-une-erreur), réponse sous 10 jours ouvrés. Voir aussi [notre politique publicitaire](/publicite).');

select pg_temp.page_draft('cession', 'a-propos', 'index',
  'À propos de Céder ma société — qui sommes-nous ?',
  'Céder ma société est un média indépendant qui aide les dirigeants de TPE et PME à préparer la vente de leur entreprise : équipe et engagements.',
  'À propos de Céder ma société',
  'Céder ma société est un média indépendant consacré à la cession et à la transmission des TPE et PME : guides pratiques, simulateurs et annuaire des conseils.',
  E'## L''équipe\n\n[À compléter : noms, parcours et expertise des membres de la rédaction.]\n\n## Nos engagements\n\nDes informations sourcées et datées ([notre méthode](/methode)), aucun conseil personnalisé, et une séparation stricte entre la rédaction et les mises en avant payantes ([publicité](/publicite)).');

select pg_temp.page_draft('cession', 'mentions-legales', 'noindex',
  'Mentions légales — Céder ma société',
  'Mentions légales du site Céder ma société : éditeur, directeur de la publication, hébergeur et contact. Informations à compléter avant publication.',
  'Mentions légales',
  'Éditeur, directeur de la publication, hébergeur et contact du site Céder ma société.',
  E'## Éditeur\n\n[À compléter]\n\n## Directeur de la publication\n\n[À compléter]\n\n## Hébergement\n\nVercel Inc. (site) et Supabase (données, région Union européenne, Paris).');

select pg_temp.page_draft('cession', 'donnees-personnelles', 'noindex',
  'Données personnelles — Céder ma société',
  'Comment Céder ma société traite vos données : formulaires, consentement, conservation, mesure d''audience sans cookie et droits RGPD.',
  'Données personnelles et mesure d''audience',
  'Nous mesurons l''audience sans cookie et sans conserver d''adresse IP. Les données des formulaires ne servent qu''à la finalité indiquée.',
  E'## Mesure d''audience\n\nIdentifiant de session quotidien, haché et non réversible ; aucune adresse IP conservée ; statistiques conservées 25 mois.\n\n## Formulaires et droits\n\n[À compléter lors de la revue RGPD.]');
