-- =============================================================================
-- BOOTSTRAP PRODUCTION — catégories « Facturation électronique » et « Notes de frais »
-- Grilles de notation, facettes, mots-clés (Semrush FR, nov. 2026), briefs SEO et
-- BROUILLONS préparés par IA (author_kind = 'agent') : rien n'est publié ici.
-- Chaque brouillon doit être relu, sourcé et validé par un éditeur humain.
-- =============================================================================

update public.sites set gsc_property = 'sc-domain:dafradar.fr' where key = 'daf' and gsc_property is null;
update public.sites set gsc_property = 'sc-domain:cedermasociete.fr' where key = 'cession' and gsc_property is null;

-- Grilles de critères (somme des pondérations = 100). Les catégories restent en brouillon
-- jusqu'aux premiers tests réels : une page de classement vide serait un contenu pauvre.
update public.categories set
  description = 'Plateformes agréées (ex-PDP) immatriculées par la DGFiP pour émettre, recevoir et transmettre les factures électroniques et les données d''e-reporting.',
  criteria = '[{"key":"conformite","label":"Conformité et statut d''immatriculation","weight":30},
               {"key":"integrations","label":"Intégrations (ERP, comptabilité, facturation)","weight":20},
               {"key":"reception","label":"Réception et circuit de validation","weight":15},
               {"key":"ergonomie","label":"Prise en main","weight":15},
               {"key":"prix","label":"Rapport qualité-prix","weight":20}]'
where id = '12000000-0000-4000-a000-000000000002';

update public.categories set
  description = 'Capture des justificatifs, contrôle de la politique de dépenses, validation et export comptable des notes de frais.',
  criteria = '[{"key":"capture","label":"Capture et lecture des justificatifs","weight":25},
               {"key":"politique","label":"Politique de dépenses et validation","weight":20},
               {"key":"cartes","label":"Cartes de paiement et avances","weight":15},
               {"key":"integrations","label":"Export et intégrations comptables","weight":15},
               {"key":"ergonomie","label":"Prise en main (mobile)","weight":10},
               {"key":"prix","label":"Rapport qualité-prix","weight":15}]'
where id = '12000000-0000-4000-a000-000000000003';

insert into public.facets (id, category_id, facet_type, name, slug, rule, is_landing) values
  ('13000000-0000-4000-a000-000000000010', '12000000-0000-4000-a000-000000000002', 'company_size', 'Pour PME', 'pme', '{"fact_type":"target_sizes","contains":"pme"}', false),
  ('13000000-0000-4000-a000-000000000011', '12000000-0000-4000-a000-000000000002', 'price', 'Offre gratuite', 'gratuite', '{"fact_type":"free_plan","equals":true}', true),
  ('13000000-0000-4000-a000-000000000020', '12000000-0000-4000-a000-000000000003', 'price', 'Gratuit', 'gratuit', '{"fact_type":"free_plan","equals":true}', true),
  ('13000000-0000-4000-a000-000000000021', '12000000-0000-4000-a000-000000000003', 'feature', 'Avec cartes de paiement', 'cartes', '{"fact_type":"payment_cards","equals":true}', false)
on conflict (id) do nothing;

-- Questions « People also ask » relevées dans Semrush (nov. 2026)
insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source) values
  ('10000000-0000-4000-a000-000000000001', 'qui est concerné par la facturation électronique', 480, 0.30, 0, 'informational', 'facturation-electronique', 'semrush'),
  ('10000000-0000-4000-a000-000000000001', 'quelle plateforme choisir pour la facturation électronique', 90, 3.23, 0, 'commercial', 'facturation-electronique', 'semrush'),
  ('10000000-0000-4000-a000-000000000001', 'comment faire une note de frais', 320, 1.81, 0, 'informational', 'notes-de-frais', 'semrush')
on conflict (site_id, keyword) do nothing;

-- ---------------------------------------------------------------------------
-- Brouillons + briefs
-- ---------------------------------------------------------------------------
create or replace function pg_temp.draft(
  p_id uuid, p_type public.content_type, p_slug text, p_kw text, p_category uuid, p_cluster text,
  p_meta_title text, p_meta_desc text, p_h1 text, p_summary text, p_body text,
  p_faq jsonb, p_sources jsonb,
  p_secondary text[], p_questions text[], p_outline jsonb, p_target_words int, p_required_links text[]
) returns void language plpgsql as $$
declare kid uuid; vid uuid; s jsonb;
  site constant uuid := '10000000-0000-4000-a000-000000000001';
begin
  if exists (select 1 from public.content_items where id = p_id) then return; end if;
  select id into kid from public.keyword_targets where site_id = site and keyword = p_kw;
  insert into public.content_items (id, site_id, type, slug, title, category_id, cluster, primary_keyword_id)
  values (p_id, site, p_type, p_slug, p_h1, p_category, p_cluster, kid);
  update public.keyword_targets set target_content_id = p_id, status = 'in_progress' where id = kid;
  insert into public.content_versions (content_item_id, version_no, meta_title, meta_description, h1, summary, body, faq, author_kind,
                                       data)
  values (p_id, 0, p_meta_title, p_meta_desc, p_h1, p_summary, p_body, p_faq, 'agent',
          '{"editor_note":"Brouillon préparé par IA : vérifier chaque affirmation et chaque source avant soumission."}')
  returning id into vid;
  for s in select * from jsonb_array_elements(p_sources) loop
    insert into public.content_sources (content_version_id, url, title, accessed_at) values (vid, s ->> 'url', s ->> 'title', date '2026-11-04');
  end loop;
  insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, questions, outline, target_words, required_links, cta)
  values (p_id, p_kw, p_secondary, p_questions, p_outline, p_target_words,
          coalesce((select array_agg(i.id) from public.content_items i where i.site_id = site and i.path = any (p_required_links)), '{}'),
          'Comparer les solutions testées');
end;
$$;

-- 1. Comparatif des plateformes agréées
select pg_temp.draft('60000000-0000-4000-a000-000000000001', 'category_ranking', 'facturation-electronique',
  'plateforme agréée facturation électronique', '12000000-0000-4000-a000-000000000002', 'facturation-electronique',
  'Plateforme agréée facturation électronique : comparatif',
  'Quelle plateforme agréée choisir pour la facturation électronique ? Comparatif des solutions testées pour PME : conformité, intégrations, prix.',
  'Plateforme agréée facturation électronique : le comparatif pour PME',
  'Toutes les entreprises doivent pouvoir recevoir des factures électroniques via une plateforme agréée par l''administration fiscale ; les PME devront aussi les émettre par ce canal. Notre comparatif note les plateformes selon cinq critères publiés.',
  E'## Ce que fait une plateforme agréée\n\nUne plateforme agréée (anciennement « PDP ») est immatriculée par la DGFiP. Elle émet et reçoit les factures électroniques dans les formats prévus et transmet à l''administration les données de facturation et d''e-reporting.\n\n## Comment nous testons\n\nNous vérifions le statut d''immatriculation sur la liste officielle publiée par impots.gouv.fr, puis nous testons l''émission, la réception, le circuit de validation et les exports vers les logiciels comptables. Les pondérations sont publiées sur la page [méthode](/methode).\n\n## Avant de choisir\n\nLisez notre guide sur [le calendrier de la facturation électronique](/guides/facturation-electronique-pme).',
  '[{"q":"La liste des plateformes agréées est-elle publique ?","a":"Oui, la DGFiP publie et met à jour la liste des plateformes immatriculées sur impots.gouv.fr."}]',
  '[{"url":"https://www.impots.gouv.fr/actualite/facturation-electronique-publication-de-la-liste-des-plateformes-agreees","title":"impots.gouv.fr — publication de la liste des plateformes agréées"},{"url":"https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees","title":"impots.gouv.fr — facturation électronique et plateformes agréées"}]',
  '{pdp facturation électronique,plateforme de dématérialisation partenaire,liste plateformes agréées}',
  '{quelles sont les plateformes agréées pour la facturation électronique,quelle plateforme choisir pour la facturation électronique,quelle plateforme pour facture électronique}',
  '[{"level":2,"text":"Ce que fait une plateforme agréée"},{"level":2,"text":"Notre classement"},{"level":2,"text":"Comment nous testons"},{"level":2,"text":"Quelle plateforme pour quel profil"}]',
  900, '{/guides/facturation-electronique-pme,/methode}');

-- 2. Guide : choisir sa plateforme agréée
select pg_temp.draft('60000000-0000-4000-a000-000000000002', 'guide', 'choisir-plateforme-agreee',
  'pdp facturation électronique', '12000000-0000-4000-a000-000000000002', 'facturation-electronique',
  'PDP facturation électronique : comment choisir sa plateforme',
  'PDP ou plateforme agréée : comment choisir la solution de facturation électronique de votre PME ? Statut, formats, intégrations, coûts.',
  'PDP facturation électronique : comment choisir sa plateforme agréée',
  'Pour choisir une PDP (désormais « plateforme agréée »), vérifiez d''abord son immatriculation sur la liste officielle de la DGFiP, puis sa compatibilité avec votre logiciel de facturation et de comptabilité, son circuit de réception et son coût total.',
  E'## 1. Vérifier l''immatriculation\n\nSeules les plateformes immatriculées par la DGFiP peuvent émettre et recevoir des factures électroniques pour le compte des entreprises. La liste officielle distingue les plateformes immatriculées définitivement et celles immatriculées sous réserve, qui doivent encore finaliser leurs tests d''interopérabilité. Vérifiez le statut au jour de la signature.\n\n## 2. Partir de vos outils existants\n\nBeaucoup d''éditeurs de logiciels de facturation ou de comptabilité s''appuient sur une plateforme agréée partenaire. Demandez laquelle, et si l''intégration couvre l''émission, la réception et le statut des factures.\n\n## 3. Contrôler la réception\n\nLa réception concerne toutes les entreprises : vérifiez comment les factures fournisseurs arrivent, sont rapprochées des bons de commande et validées.\n\n## 4. Comparer le coût total\n\nAbonnement, coût par facture, frais de mise en place, coût des connecteurs.\n\n## À lire aussi\n\n- [Le calendrier de la facturation électronique pour les PME](/guides/facturation-electronique-pme)\n- [Notre comparatif des plateformes agréées](/meilleurs-logiciels/facturation-electronique)\n- [Notre méthode de test](/methode)',
  '[{"q":"PDP et plateforme agréée, est-ce la même chose ?","a":"Oui : « plateforme de dématérialisation partenaire » (PDP) était l''ancienne appellation des plateformes désormais dites agréées."},{"q":"Une plateforme immatriculée sous réserve peut-elle être choisie ?","a":"Son immatriculation reste conditionnée à la réussite des tests d''interopérabilité : vérifiez son statut sur la liste officielle avant de vous engager."}]',
  '[{"url":"https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees","title":"impots.gouv.fr — facturation électronique et plateformes agréées"},{"url":"https://www.impots.gouv.fr/actualite/facturation-electronique-publication-de-la-liste-des-plateformes-agreees","title":"impots.gouv.fr — liste des plateformes agréées"}]',
  '{plateforme agréée,quelle plateforme choisir pour la facturation électronique,immatriculation plateforme agréée}',
  '{quelle plateforme choisir pour la facturation électronique,quelle plateforme pour facture électronique,quelles sont les plateformes agréées pour la facturation électronique}',
  '[{"level":2,"text":"Vérifier l''immatriculation"},{"level":2,"text":"Partir de vos outils existants"},{"level":2,"text":"Contrôler la réception"},{"level":2,"text":"Comparer le coût total"}]',
  1200, '{/guides/facturation-electronique-pme,/meilleurs-logiciels/facturation-electronique}');

-- 3. Guide : qui est concerné
select pg_temp.draft('60000000-0000-4000-a000-000000000003', 'guide', 'facturation-electronique-qui-est-concerne',
  'qui est concerné par la facturation électronique', '12000000-0000-4000-a000-000000000002', 'facturation-electronique',
  'Qui est concerné par la facturation électronique ?',
  'Qui est concerné par la facturation électronique obligatoire : entreprises assujetties à la TVA, opérations visées, exceptions et calendrier.',
  'Qui est concerné par la facturation électronique ?',
  'La facturation électronique concerne les entreprises assujetties à la TVA établies en France pour leurs opérations entre entreprises (B2B) domestiques : toutes doivent pouvoir recevoir des factures électroniques, et l''obligation d''émission s''applique selon la taille de l''entreprise.',
  E'## Les entreprises concernées\n\nL''obligation vise les échanges entre assujettis à la TVA établis en France. Les opérations avec des particuliers (B2C) et certaines opérations internationales relèvent de l''e-reporting, c''est-à-dire de la transmission de données, et non de la facture électronique.\n\n## Le calendrier selon la taille\n\nLa réception est obligatoire pour toutes les entreprises ; l''émission arrive en deux temps selon la taille (grandes entreprises et ETI d''abord, PME et microentreprises ensuite). Détail dans notre guide [calendrier et étapes pour les PME](/guides/facturation-electronique-pme).\n\n## Les cas particuliers\n\nÀ vérifier sur impots.gouv.fr avant publication : opérations exonérées, entreprises non établies en France, régimes particuliers.\n\n## Et ensuite ?\n\n- [Choisir sa plateforme agréée](/guides/choisir-plateforme-agreee)\n- [Le comparatif des plateformes agréées](/meilleurs-logiciels/facturation-electronique)',
  '[{"q":"Les auto-entrepreneurs sont-ils concernés ?","a":"Oui, dès lors qu''ils réalisent des opérations entre entreprises : ils doivent pouvoir recevoir des factures électroniques et les émettre selon le calendrier applicable aux microentreprises."}]',
  '[{"url":"https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees","title":"impots.gouv.fr — facturation électronique et plateformes agréées"}]',
  '{facturation électronique obligatoire,qui n''est pas concerné par la facturation électronique,e-reporting}',
  '{qui n''est pas concerné par la facturation électronique,les auto-entrepreneurs sont-ils concernés,quelles opérations sont concernées}',
  '[{"level":2,"text":"Les entreprises concernées"},{"level":2,"text":"Le calendrier selon la taille"},{"level":2,"text":"Les cas particuliers"}]',
  1000, '{/guides/facturation-electronique-pme}');

-- 4. Comparatif des logiciels de notes de frais
select pg_temp.draft('60000000-0000-4000-a000-000000000004', 'category_ranking', 'notes-de-frais',
  'logiciel note de frais', '12000000-0000-4000-a000-000000000003', 'notes-de-frais',
  'Logiciel note de frais : comparatif 2026 pour PME',
  'Comparatif 2026 des logiciels de notes de frais pour PME : capture des justificatifs, validation, cartes, export comptable, prix vérifiés.',
  'Meilleur logiciel note de frais : comparatif 2026',
  'Un logiciel de notes de frais remplace la saisie manuelle : photo du justificatif, lecture automatique, contrôle de la politique de dépenses, validation par le manager et export vers la comptabilité. Notre comparatif note les outils selon six critères publiés.',
  E'## Comment nous testons\n\nChaque outil est testé avec le même scénario : vingt justificatifs (restaurant, carburant, train, hôtel, devise étrangère), une politique de dépenses avec plafonds, un circuit de validation à deux niveaux et un export comptable. Les pondérations sont publiées sur la page [méthode](/methode).\n\n## Quel logiciel pour quel profil ?\n\n- **TPE** : une application mobile simple et un export comptable suffisent.\n- **PME avec équipes terrain** : cartes de paiement, indemnités kilométriques et validation multi-niveaux.\n\nPour aller plus loin : [comment faire une note de frais](/guides/comment-faire-une-note-de-frais).',
  '[]', '[]',
  '{logiciel de gestion des notes de frais,application note de frais,logiciel note de frais gratuit}',
  '{comment gérer les notes de frais d''une pme,comment digitaliser les notes de frais,logiciel note de frais gratuit}',
  '[{"level":2,"text":"Notre classement"},{"level":2,"text":"Comment nous testons"},{"level":2,"text":"Quel logiciel pour quel profil"}]',
  900, '{/methode}');

-- 5. Guide : comment faire une note de frais
select pg_temp.draft('60000000-0000-4000-a000-000000000005', 'guide', 'comment-faire-une-note-de-frais',
  'comment faire une note de frais', '12000000-0000-4000-a000-000000000003', 'notes-de-frais',
  'Comment faire une note de frais : mentions et étapes',
  'Comment faire une note de frais : informations obligatoires, justificatifs à joindre, frais kilométriques, validation et remboursement.',
  'Comment faire une note de frais : les étapes et les justificatifs',
  'Pour faire une note de frais, listez chaque dépense professionnelle avec sa date, son objet, son montant TTC et sa TVA, joignez les justificatifs, puis faites-la valider avant remboursement. Les frais kilométriques se calculent à partir du barème et des trajets déclarés.',
  E'## 1. Les informations à renseigner\n\nPour chaque dépense : date, nature, objet professionnel, montant TTC, TVA récupérable, mode de paiement.\n\n## 2. Les justificatifs\n\nFactures et reçus à joindre à la note. La conservation sous forme numérique est possible sous conditions de fiabilité de la copie : à vérifier avec votre expert-comptable avant de détruire les originaux.\n\n## 3. Les frais kilométriques\n\nIls se calculent selon le barème kilométrique en vigueur, à partir des trajets professionnels et de la puissance fiscale du véhicule.\n\n## 4. Validation et remboursement\n\nLe manager valide, la comptabilité contrôle et rembourse. Un [logiciel de notes de frais](/meilleurs-logiciels/notes-de-frais) automatise ces étapes.\n\n## À lire aussi\n\n- [Notre méthode de test](/methode)\n- [Gérer sa trésorerie](/meilleurs-logiciels/tresorerie)',
  '[{"q":"Faut-il garder les justificatifs papier ?","a":"La dématérialisation est possible si la copie numérique est fiable ; les conditions restent à vérifier avec votre expert-comptable avant toute destruction des originaux."}]',
  '[{"url":"https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/frais-professionnels.html","title":"Urssaf — frais professionnels (URL à vérifier)"}]',
  '{modèle note de frais,note de frais kilométrique,justificatif note de frais}',
  '{comment faire une note de frais kilométrique,comment remplir une note de frais,comment comptabiliser une note de frais,est-ce que les notes de frais sont imposables}',
  '[{"level":2,"text":"Les informations à renseigner"},{"level":2,"text":"Les justificatifs"},{"level":2,"text":"Les frais kilométriques"},{"level":2,"text":"Validation et remboursement"}]',
  1200, '{/meilleurs-logiciels/notes-de-frais}');
