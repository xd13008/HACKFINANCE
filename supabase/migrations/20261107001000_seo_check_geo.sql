-- =============================================================================
-- 1000 · Checklist SEO/GEO enrichie : longueur minimale par gabarit, réponse directe, intertitres
-- (contrôles non bloquants : ils guident la rédaction sans empêcher la soumission)
-- =============================================================================

create or replace function public.seo_check(p_version uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v public.content_versions;
  it public.content_items;
  kw text;
  br public.seo_briefs;
  checks jsonb := '[]'::jsonb;
  first_words text;
  internal_links int;
  src_count int;
  dup int;
  needs_links boolean;
  needs_sources boolean;
  missing_required int;
  min_words int;

begin
  select * into v from public.content_versions where id = p_version;
  if v.id is null then raise exception 'Version introuvable'; end if;
  select * into it from public.content_items where id = v.content_item_id;
  select keyword into kw from public.keyword_targets where id = it.primary_keyword_id;
  select * into br from public.seo_briefs where content_item_id = it.id;

  needs_links   := it.type in ('guide', 'pillar', 'resource', 'simulator');
  needs_sources := it.type in ('guide', 'pillar', 'software_review', 'pricing', 'alternatives', 'duel', 'category_ranking', 'facet_landing');

  checks := checks || jsonb_build_object('code', 'meta_title_length', 'blocking', true,
    'ok', char_length(v.meta_title) between 15 and 60,
    'message', format('Title entre 15 et 60 caractères (%s)', char_length(v.meta_title)));

  checks := checks || jsonb_build_object('code', 'meta_description_length', 'blocking', true,
    'ok', char_length(v.meta_description) between 70 and 155,
    'message', format('Meta description entre 70 et 155 caractères (%s)', char_length(v.meta_description)));

  checks := checks || jsonb_build_object('code', 'h1_present', 'blocking', true,
    'ok', char_length(trim(v.h1)) > 0, 'message', 'H1 renseigné');

  checks := checks || jsonb_build_object('code', 'no_h1_in_body', 'blocking', true,
    'ok', v.body !~ '(^|\n)# ', 'message', 'Pas de second H1 dans le corps (utiliser ##)');

  checks := checks || jsonb_build_object('code', 'summary_present', 'blocking', false,
    'ok', char_length(trim(v.summary)) >= 80,
    'message', 'Réponse directe en tête de page (80 caractères min.)');

  if it.type not in ('home', 'page') then
    checks := checks || jsonb_build_object('code', 'primary_keyword_set', 'blocking', true,
      'ok', kw is not null, 'message', 'Mot-clé principal associé (plan de production)');
  end if;

  if kw is not null then
    checks := checks || jsonb_build_object('code', 'keyword_in_h1', 'blocking', true,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(v.h1))) > 0,
      'message', format('Le H1 contient « %s »', kw));
    checks := checks || jsonb_build_object('code', 'keyword_in_title', 'blocking', false,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(v.meta_title))) > 0,
      'message', format('Le title contient « %s »', kw));
    first_words := array_to_string((regexp_split_to_array(trim(v.summary || ' ' || v.body), '\s+'))[1:100], ' ');
    checks := checks || jsonb_build_object('code', 'keyword_early', 'blocking', false,
      'ok', position(lower(extensions.unaccent(kw)) in lower(extensions.unaccent(first_words))) > 0,
      'message', 'Mot-clé dans les 100 premiers mots');
  end if;

  select count(*) into dup
  from public.content_items i2 join public.content_versions v2 on v2.id = i2.published_version_id
  where i2.site_id = it.site_id and i2.id <> it.id and i2.status = 'published'
    and lower(v2.meta_title) = lower(v.meta_title);
  checks := checks || jsonb_build_object('code', 'meta_title_unique', 'blocking', true,
    'ok', dup = 0, 'message', 'Title unique sur le portail');

  if needs_links then
    select count(*) into internal_links from regexp_matches(v.body, '\]\(/[^)]*\)', 'g');
    checks := checks || jsonb_build_object('code', 'internal_links', 'blocking', true,
      'ok', internal_links >= 3, 'message', format('Au moins 3 liens internes dans le corps (%s)', internal_links));
  end if;

  if br.id is not null and array_length(br.required_links, 1) > 0 then
    select count(*) into missing_required
    from public.content_items ri
    where ri.id = any (br.required_links) and position('](' || ri.path || ')' in v.body) = 0;
    checks := checks || jsonb_build_object('code', 'required_links', 'blocking', true,
      'ok', missing_required = 0, 'message', format('Liens imposés par le brief présents (%s manquant(s))', missing_required));
  end if;

  if needs_sources then
    select count(*) into src_count from public.content_sources where content_version_id = v.id;
    checks := checks || jsonb_build_object('code', 'sources', 'blocking', true,
      'ok', src_count >= 1, 'message', format('Au moins une source datée (%s)', src_count));
  end if;

  if br.id is not null and array_length(br.questions, 1) > 0 then
    checks := checks || jsonb_build_object('code', 'faq', 'blocking', false,
      'ok', jsonb_array_length(v.faq) >= 2, 'message', 'FAQ prévue par le brief (2 questions min.)');
  end if;

  if br.id is not null and br.target_words is not null then
    checks := checks || jsonb_build_object('code', 'length', 'blocking', false,
      'ok', array_length(regexp_split_to_array(trim(v.body), '\s+'), 1) >= br.target_words * 0.8,
      'message', format('Longueur proche de la cible (%s mots)', br.target_words));
  end if;

  -- Longueur minimale par gabarit (non bloquant) : un contenu trop court se classe mal et est peu cité par les moteurs IA.
  min_words := case it.type
    when 'pillar' then 1500 when 'guide' then 800 when 'software_review' then 600 when 'category_ranking' then 500
    when 'duel' then 500 when 'alternatives' then 400 when 'pricing' then 300 when 'facet_landing' then 300
    when 'simulator' then 300 when 'glossary' then 250 else 0 end;
  if min_words > 0 then
    checks := checks || jsonb_build_object('code', 'min_words', 'blocking', false,
      'ok', array_length(regexp_split_to_array(trim(v.summary || ' ' || v.body), '\s+'), 1) >= min_words,
      'message', format('Au moins %s mots pour ce type de page (%s)', min_words,
                        array_length(regexp_split_to_array(trim(v.summary || ' ' || v.body), '\s+'), 1)));
  end if;

  -- Réponse directe exploitable par les moteurs de réponse (GEO) : 2 à 3 phrases, 40 à 90 mots.
  checks := checks || jsonb_build_object('code', 'summary_answer', 'blocking', false,
    'ok', coalesce(array_length(regexp_split_to_array(trim(v.summary), '\s+'), 1), 0) between 25 and 90,
    'message', 'Réponse directe de 25 à 90 mots en tête de page (citée par les assistants IA)');

  -- Au moins un intertitre ## pour structurer les contenus longs
  if it.type in ('guide', 'pillar', 'software_review', 'category_ranking') then
    checks := checks || jsonb_build_object('code', 'subheadings', 'blocking', false,
      'ok', (select count(*) from regexp_matches(v.body, '(^|\n)## ', 'g')) >= 2,
      'message', 'Au moins 2 intertitres ## (structure lisible par les moteurs)');
  end if;

  checks := checks || jsonb_build_object('code', 'images_alt', 'blocking', true,
    'ok', v.body !~ '!\[\]\(', 'message', 'Toutes les images ont un texte alternatif');

  return jsonb_build_object(
    'passed', not exists (
      select 1 from jsonb_array_elements(checks) c where (c ->> 'blocking')::boolean and not (c ->> 'ok')::boolean
    ),
    'checks', checks
  );
end;
$$;
grant execute on function public.seo_check(uuid) to authenticated;
