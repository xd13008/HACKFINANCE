-- =============================================================================
-- Radar Finances : sujets réglementés en « contenu seul » (ARCHITECTURE §9)
-- Crédit, affacturage, compte pro, assurance, placements : guides d'information générale,
-- sans catégorie, sans classement, sans emplacement publicitaire (trigger guard_regulated_inventory),
-- sans lien affilié ni formulaire de mise en relation. Rien n'est publié ici.
-- Volumes : Semrush FR, 07/11/2026.
-- =============================================================================

insert into public.keyword_targets (site_id, keyword, volume, cpc_eur, kd, intent, cluster, source, refreshed_at) values
  ('10000000-0000-4000-a000-000000000001', 'affacturage', 6600, 6.24, 51, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'compte professionnel', 2900, 25.38, 17, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'compte pro', 4400, 25.38, 47, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'crédit de trésorerie', 320, 2.63, 13, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'assurance entreprise', 2900, 8.52, 61, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'rc pro', 9900, 8.41, 49, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07'),
  ('10000000-0000-4000-a000-000000000001', 'placement de trésorerie', 90, 4.27, 15, 'informational', 'sujets-reglementes', 'semrush', '2026-11-07')
on conflict (site_id, keyword) do nothing;

create or replace function pg_temp.regulated_guide(
  p_slug text, p_title text, p_topic text, p_kw text, p_secondary text[], p_questions text[], p_outline text[], p_words int
) returns void language plpgsql as $$
declare
  site constant uuid := '10000000-0000-4000-a000-000000000001';
  iid uuid; kid uuid;
begin
  select id into iid from public.content_items where site_id = site and type = 'guide' and slug = p_slug;
  if iid is not null then
    update public.content_items set regulated_topic = p_topic where id = iid and regulated_topic is null;
    return;
  end if;
  select k.id into kid from public.keyword_targets k
  where k.site_id = site and k.keyword = p_kw and k.target_content_id is null
    and not exists (select 1 from public.content_items i where i.primary_keyword_id = k.id);
  insert into public.content_items (site_id, type, slug, title, cluster, primary_keyword_id, regulated_topic)
  values (site, 'guide', p_slug, p_title, 'sujets-reglementes', kid, p_topic)
  returning id into iid;
  if kid is not null then
    update public.keyword_targets set target_content_id = iid, status = 'in_progress' where id = kid and status = 'todo';
  end if;
  insert into public.seo_briefs (content_item_id, primary_keyword, secondary_keywords, questions, outline, entities, target_words, cta)
  values (iid, p_kw, p_secondary, p_questions,
          (select jsonb_agg(jsonb_build_object('level', 2, 'text', t))
             from unnest(p_outline || array['Avertissement : information générale, ni conseil personnalisé ni mise en relation']) t),
          array['contenu seul : aucun lien commercial, aucune recommandation d''un établissement (ARCHITECTURE §9)'],
          p_words, null);
end;
$$;

select pg_temp.regulated_guide('affacturage', 'Affacturage : fonctionnement, coût et alternatives', 'affacturage',
  'affacturage', array['factoring', 'affacturage définition', 'coût affacturage'],
  array['comment fonctionne l''affacturage', 'combien coûte l''affacturage', 'quelle différence entre affacturage et escompte'],
  array['Définition et acteurs', 'Fonctionnement pas à pas', 'Coût : commission et frais de financement', 'Avantages et limites', 'Alternatives : relances, réduction du DSO'], 1200);
select pg_temp.regulated_guide('compte-professionnel', 'Compte professionnel : obligations et critères de choix', 'compte_pro',
  'compte professionnel', array['compte pro', 'compte bancaire professionnel obligatoire'],
  array['un compte professionnel est-il obligatoire', 'quelle différence entre banque en ligne et banque traditionnelle'],
  array['Quand le compte professionnel est obligatoire', 'Services attendus par une PME', 'Critères de choix (frais, moyens de paiement, connexions logicielles)', 'Changer de banque'], 1000);
select pg_temp.regulated_guide('credit-de-tresorerie', 'Crédit de trésorerie : les solutions de financement court terme', 'credit',
  'crédit de trésorerie', array['facilité de caisse', 'découvert autorisé entreprise', 'financement court terme'],
  array['quels sont les crédits de trésorerie', 'quelle différence entre facilité de caisse et découvert'],
  array['Définition', 'Les principales formes (facilité de caisse, découvert, escompte, Dailly)', 'Coût et garanties', 'Piloter son besoin de trésorerie en amont'], 1000);
select pg_temp.regulated_guide('assurances-entreprise', 'Assurances de l''entreprise : obligatoires et recommandées', 'assurance',
  'assurance entreprise', array['rc pro', 'assurance responsabilité civile professionnelle', 'multirisque professionnelle'],
  array['quelles assurances sont obligatoires pour une entreprise', 'la rc pro est-elle obligatoire'],
  array['Assurances obligatoires selon l''activité', 'Responsabilité civile professionnelle', 'Multirisque et perte d''exploitation', 'Rôle du DAF dans la revue des contrats'], 1000);
select pg_temp.regulated_guide('placement-de-tresorerie', 'Placement de trésorerie d''entreprise : les supports existants', 'placement',
  'placement de trésorerie', array['placer la trésorerie de son entreprise', 'compte à terme entreprise'],
  array['où placer la trésorerie d''une entreprise'],
  array['Trésorerie disponible et trésorerie excédentaire', 'Les grandes familles de supports', 'Liquidité, risque et fiscalité : principes généraux', 'Rôle du plan de trésorerie'], 900);
