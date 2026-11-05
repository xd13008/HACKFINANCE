-- =============================================================================
-- Régie, demandes et mesure d'audience — données FICTIVES de démonstration
-- =============================================================================

insert into public.commercial_contracts (id, site_id, client_name, reference, starts_on, ends_on, amount_eur, status, created_by) values
  ('51000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Éditeur fictif B', 'DEMO-2026-001',
   current_date - 20, current_date + 70, 3600, 'active', '00000000-0000-4000-a000-000000000003');

-- Cashpilot sponsorisé en position 1 sur la catégorie trésorerie — affiché « Sponsorisé »,
-- hors classement éditorial (où il reste à sa place calculée par les notes).
insert into public.sponsored_placements (id, inventory_id, contract_id, software_id, provider_id, headline, cta_label, cta_url, starts_on, ends_on, status) values
  ('52000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000001', '51000000-0000-4000-a000-000000000001',
   '20000000-0000-4000-a000-000000000002', null, 'Démarrez gratuitement votre suivi de trésorerie', 'Essayer Cashpilot',
   'https://example.com/cashpilot?utm_source=radarfinances', current_date - 20, current_date + 70, 'active'),
  ('52000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000010', null,
   null, '40000000-0000-4000-a000-000000000001', 'Spécialiste des cessions industrielles en Rhône-Alpes', 'Voir le cabinet',
   'https://example.com/transmission', current_date - 5, current_date + 85, 'active');

insert into public.affiliate_links (software_id, url, network, commission) values
  ('20000000-0000-4000-a000-000000000003', 'https://example.com/previa?ref=radarfinances', 'Programme direct (démo)', '15 % la 1re année');

-- Demandes entrantes
insert into public.placement_requests (site_id, advertiser_name, website, contact_name, contact_email, placement_types, category_ids,
                                       period_start, period_end, budget_range, message, consent_at, consent_text, status, created_at) values
  ('10000000-0000-4000-a000-000000000001', 'Éditeur fictif D', 'https://example.com/editeur-d', 'Contact démo', 'contact@example.com',
   '{category_sponsored}', '{12000000-0000-4000-a000-000000000002}', current_date + 30, current_date + 120, '1 000 – 3 000 € / mois',
   'Nous lançons notre plateforme agréée et souhaitons apparaître sur la catégorie facturation électronique.', now(), 'Consentement démo', 'new', now() - interval '2 days'),
  ('10000000-0000-4000-a000-000000000001', 'Éditeur fictif E', 'https://example.com/editeur-e', 'Contact démo', 'ventes@example.com',
   '{enhanced_listing,newsletter}', '{12000000-0000-4000-a000-000000000001}', current_date + 10, current_date + 100, '500 – 1 000 € / mois',
   null, now(), 'Consentement démo', 'quote_sent', now() - interval '9 days'),
  ('10000000-0000-4000-a000-000000000002', 'Cabinet fictif F', 'https://example.com/cabinet-f', 'Contact démo', 'associe@example.com',
   '{directory_featured}', '{12000000-0000-4000-a000-000000000020}', current_date + 15, current_date + 200, '< 500 € / mois',
   'Mise en avant sur l''annuaire Bretagne.', now(), 'Consentement démo', 'qualified', now() - interval '4 days');

insert into public.listing_requests (site_id, kind, company_name, product_name, siren, website, category_id, contact_name, contact_email,
                                     contact_role, message, consent_at, consent_text, checks) values
  ('10000000-0000-4000-a000-000000000001', 'software', 'Éditeur fictif G', 'Notix', '123456789', 'https://example.com/notix',
   '12000000-0000-4000-a000-000000000003', 'Contact démo', 'fondateur@example.com', 'CEO',
   'Logiciel de notes de frais avec OCR, 400 clients PME.', now(), 'Consentement démo',
   '{"siren_format":true,"email_domain_match":true,"duplicate_of":null}'),
  ('10000000-0000-4000-a000-000000000002', 'provider', 'Cabinet fictif H', null, null, 'https://example.com/cabinet-h',
   '12000000-0000-4000-a000-000000000020', 'Contact démo', 'contact@gmail.example', 'Associé',
   'Cabinet de cession spécialisé pharmacies.', now(), 'Consentement démo',
   '{"siren_format":false,"email_domain_match":false,"duplicate_of":null}');

insert into public.error_reports (site_id, page_path, kind, reporter_name, reporter_email, message, consent_at) values
  ('10000000-0000-4000-a000-000000000001', '/logiciels/previa', 'right_of_reply', 'Éditeur fictif C', 'presse@example.com',
   'Notre offre ETI est désormais disponible à partir de 2 entités et non 3. Merci de mettre à jour la fiche.', now());


create or replace function pg_temp.ev(
  p_site uuid, p_sess text, p_day int, p_step int, p_type text, p_path text, p_page_type text, p_rubrique text,
  p_ref text, p_dev text, p_placement uuid default null, p_link text default null
) returns void language sql as $$
  insert into public.analytics_events (site_id, occurred_at, session_hash, event_type, path, page_type, rubrique,
                                       placement_id, link_kind, referrer_host, device, props)
  values (p_site, date_trunc('day', now()) - make_interval(days => p_day) + make_interval(mins => (abs(hashtext(p_sess)) % 1300) + p_step * 2),
          p_sess, p_type, p_path, p_page_type, p_rubrique, p_placement, p_link, p_ref, p_dev, '{"fictif":true}');
$$;

-- ---------------------------------------------------------------------------
-- Mesure d'audience synthétique (30 jours) pour alimenter les tableaux de bord
-- ---------------------------------------------------------------------------
do $$
declare
  daf constant uuid := '10000000-0000-4000-a000-000000000001';
  ces constant uuid := '10000000-0000-4000-a000-000000000002';
  d int; s int; sess text; nb int; r float; src text; dev text;
begin
  perform setseed(0.42);
  for d in 0..29 loop
    -- Portail DAF : croissance progressive
    nb := 40 + (29 - d) * 3 + (random() * 20)::int;
    for s in 1..nb loop
      sess := md5('daf' || d || '-' || s);
      r := random();
      src := case when r < 0.62 then 'www.google.com' when r < 0.70 then 'chatgpt.com' when r < 0.78 then 'www.linkedin.com' else null end;
      dev := case when random() < 0.35 then 'mobile' else 'desktop' end;
      -- Entrée : guide, catégorie ou fiche
      r := random();
      if r < 0.35 then
        perform pg_temp.ev(daf, sess, d, 0, 'pageview', '/guides/facturation-electronique-pme', 'guide', 'facturation-electronique', src, dev);
        if random() < 0.25 then
          perform pg_temp.ev(daf, sess, d, 1, 'pageview', '/meilleurs-logiciels/tresorerie', 'category_ranking', 'tresorerie', null, dev);
        end if;
      elsif r < 0.70 then
        perform pg_temp.ev(daf, sess, d, 0, 'pageview', '/meilleurs-logiciels/tresorerie', 'category_ranking', 'tresorerie', src, dev);
        perform pg_temp.ev(daf, sess, d, 0, 'sponsored_impression', '/meilleurs-logiciels/tresorerie', 'category_ranking', 'tresorerie', null, dev,
                           '52000000-0000-4000-a000-000000000001');
        if random() < 0.08 then
          perform pg_temp.ev(daf, sess, d, 1, 'outbound_click', '/meilleurs-logiciels/tresorerie', 'category_ranking', 'tresorerie', null, dev,
                             '52000000-0000-4000-a000-000000000001', 'sponsored');
        end if;
        if random() < 0.55 then
          perform pg_temp.ev(daf, sess, d, 2, 'pageview', '/logiciels/tresoflux', 'software_review', 'tresorerie', null, dev);
          if random() < 0.30 then
            perform pg_temp.ev(daf, sess, d, 3, 'pageview', '/comparer/cashpilot-vs-tresoflux', 'duel', 'tresorerie', null, dev);
          end if;
          if random() < 0.18 then
            perform pg_temp.ev(daf, sess, d, 4, 'outbound_click', '/logiciels/tresoflux', 'software_review', 'tresorerie', null, dev, null, 'editorial');
          end if;
        end if;
      else
        perform pg_temp.ev(daf, sess, d, 0, 'pageview', '/logiciels/previa', 'software_review', 'tresorerie', src, dev);
        if random() < 0.15 then
          perform pg_temp.ev(daf, sess, d, 1, 'outbound_click', '/logiciels/previa', 'software_review', 'tresorerie', null, dev, null, 'affiliate');
        end if;
        if random() < 0.10 then
          perform pg_temp.ev(daf, sess, d, 2, 'pageview', '/ressources/modele-previsionnel-tresorerie', 'resource', 'tresorerie', null, dev);
          perform pg_temp.ev(daf, sess, d, 3, 'form_submit', '/ressources/modele-previsionnel-tresorerie', 'resource', 'tresorerie', null, dev);
        end if;
      end if;
    end loop;

    -- Portail Cession
    nb := 25 + (29 - d) * 2 + (random() * 15)::int;
    for s in 1..nb loop
      sess := md5('ces' || d || '-' || s);
      src := case when random() < 0.7 then 'www.google.com' else null end;
      dev := case when random() < 0.45 then 'mobile' else 'desktop' end;
      perform pg_temp.ev(ces, sess, d, 0, 'pageview', '/dossiers/vendre-sa-societe', 'pillar', 'cession', src, dev);
      if random() < 0.45 then
        perform pg_temp.ev(ces, sess, d, 1, 'pageview', '/outils/valorisation-entreprise', 'simulator', 'cession', null, dev);
        perform pg_temp.ev(ces, sess, d, 2, 'simulator_use', '/outils/valorisation-entreprise', 'simulator', 'cession', null, dev);
        if random() < 0.30 then
          perform pg_temp.ev(ces, sess, d, 3, 'pageview', '/prestataires/conseils-cession', 'provider_directory', 'conseils-cession', null, dev);
          perform pg_temp.ev(ces, sess, d, 3, 'sponsored_impression', '/prestataires/conseils-cession', 'provider_directory', 'conseils-cession', null, dev,
                             '52000000-0000-4000-a000-000000000002');
          if random() < 0.12 then
            perform pg_temp.ev(ces, sess, d, 4, 'outbound_click', '/prestataires/conseils-cession', 'provider_directory', 'conseils-cession', null, dev,
                               '52000000-0000-4000-a000-000000000002', 'sponsored');
          end if;
        end if;
      end if;
    end loop;
  end loop;
end;
$$ ;

-- Search Console synthétique (pour les tableaux d'opportunités SEO)
insert into public.gsc_metrics (site_id, date, page, query, clicks, impressions, ctr, position)
select '10000000-0000-4000-a000-000000000001', current_date - g, x.page, x.query,
       (x.clicks * (0.8 + random() * 0.4))::int, (x.impr * (0.8 + random() * 0.4))::int,
       round(x.clicks::numeric / nullif(x.impr, 0), 4), round((x.pos + (random() - 0.5))::numeric, 1)
from generate_series(1, 28) g,
(values
  ('/guides/facturation-electronique-pme', 'facturation électronique', 9, 1100, 11.5),
  ('/guides/facturation-electronique-pme', 'facturation électronique pme', 6, 180, 6.2),
  ('/meilleurs-logiciels/tresorerie', 'logiciel de gestion de trésorerie', 4, 95, 7.8),
  ('/meilleurs-logiciels/tresorerie', 'logiciel trésorerie', 2, 70, 9.4),
  ('/meilleurs-logiciels/tresorerie/gratuit', 'logiciel trésorerie gratuit', 1, 22, 5.1),
  ('/logiciels/previa', 'prévia avis', 3, 12, 2.1),
  ('/guides/choisir-logiciel-tresorerie', 'logiciel de trésorerie', 1, 60, 14.0),
  ('/meilleurs-logiciels/tresorerie', 'logiciel de trésorerie', 0, 40, 18.5)
) as x(page, query, clicks, impr, pos);
