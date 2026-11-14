-- =============================================================================
-- 2300 · Grille de lecture : les 5 axes du dirigeant (14/11/2026), références, cas clients, cas d'usage, chiffre d'affaires
-- - provider_grid_axes : axes de lecture, avec la question à poser au cabinet (texte fourni par le dirigeant pour les experts-comptables ;
--   titres seuls pour les autres métiers) ; une affirmation datée cite sa source (règle 6) ;
-- - provider_criteria.axis : chaque critère est rangé dans un axe ;
-- - provider_facts.period : exercice ou année de la donnée (chiffre d'affaires, effectif), affiché avec la valeur ;
-- - type « list » : courte liste de textes (références clientes, résumés de cas clients ≤ 200 caractères).
-- =============================================================================

create table public.provider_grid_axes (
  code        text not null check (code ~ '^[a-z0-9_]+$'),
  scope       text not null default '*',          -- '*' = tous les métiers, sinon slug de l'annuaire
  title       text not null,
  advice      text,                               -- la question à poser, rédigée par le dirigeant
  source_url  text check (source_url is null or source_url ~ '^https?://'),
  source_label text,
  accessed_on date,
  sort        int not null default 0,
  primary key (code, scope),
  check ((source_url is null) = (accessed_on is null))
);
alter table public.provider_grid_axes enable row level security;
revoke all on public.provider_grid_axes from anon, authenticated;
grant select on public.provider_grid_axes to anon, authenticated;
grant insert, update, delete on public.provider_grid_axes to authenticated;
create policy provider_grid_axes_read on public.provider_grid_axes for select using (true);
create policy provider_grid_axes_editor_write on public.provider_grid_axes for all to authenticated
  using (public.has_role('editor')) with check (public.has_role('editor'));
create trigger audit_provider_grid_axes after insert or update or delete on public.provider_grid_axes
  for each row execute function public.audit_trigger();

alter table public.provider_criteria add column if not exists axis text not null default 'cabinet'
  check (axis in ('metier', 'interlocuteur', 'conseil', 'perimetre_prix', 'outils', 'cabinet'));
alter table public.provider_criteria drop constraint if exists provider_criteria_kind_check;
alter table public.provider_criteria add constraint provider_criteria_kind_check check (kind in ('multi', 'one', 'boolean', 'number', 'text', 'list'));

alter table public.provider_facts add column if not exists period text check (period is null or period ~ '^[0-9]{4}$');
grant select (period) on public.provider_facts to anon;

-- Contrôle des valeurs : ajout du type « list »
create or replace function public.check_provider_fact()
returns trigger language plpgsql set search_path = public as $$
declare c provider_criteria; codes text[];
begin
  select * into c from provider_criteria where code = new.criterion;
  codes := array(select o->>'code' from jsonb_array_elements(c.options) o);
  if c.kind = 'multi' then
    if jsonb_typeof(new.value) <> 'array' or jsonb_array_length(new.value) = 0
       or exists (select 1 from jsonb_array_elements(new.value) v where jsonb_typeof(v) <> 'string' or not (v #>> '{}') = any (codes)) then
      raise exception 'Critère % : valeurs attendues parmi %', c.code, codes using errcode = '22023';
    end if;
  elsif c.kind = 'one' then
    if jsonb_typeof(new.value) <> 'string' or not (new.value #>> '{}') = any (codes) then
      raise exception 'Critère % : valeur attendue parmi %', c.code, codes using errcode = '22023';
    end if;
  elsif c.kind = 'boolean' and jsonb_typeof(new.value) <> 'boolean' then
    raise exception 'Critère % : oui ou non attendu', c.code using errcode = '22023';
  elsif c.kind = 'number' and (jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric < 0) then
    raise exception 'Critère % : nombre positif attendu', c.code using errcode = '22023';
  elsif c.kind = 'text' and (jsonb_typeof(new.value) <> 'string' or length(new.value #>> '{}') not between 1 and 300) then
    raise exception 'Critère % : texte de 1 à 300 caractères attendu', c.code using errcode = '22023';
  elsif c.kind = 'list' and (jsonb_typeof(new.value) <> 'array' or jsonb_array_length(new.value) not between 1 and 20
       or exists (select 1 from jsonb_array_elements(new.value) v where jsonb_typeof(v) <> 'string' or length(v #>> '{}') not between 1 and 200)) then
    raise exception 'Critère % : liste de 1 à 20 textes de 200 caractères au plus attendue', c.code using errcode = '22023';
  end if;
  if c.professions is not null and not exists (
       select 1 from providers p where p.id = new.provider_id and p.profession = any (c.professions)
       union all
       select 1 from provider_categories pc join categories k on k.id = pc.category_id
        where pc.provider_id = new.provider_id and k.slug = any (c.professions)) then
    raise exception 'Critère % : ne s''applique pas au métier de ce prestataire', c.code using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Axes (texte du dirigeant pour les experts-comptables ; titres seuls ailleurs)
-- ---------------------------------------------------------------------------
insert into public.provider_grid_axes (code, scope, title, advice, source_url, source_label, accessed_on, sort) values
('metier', 'experts-comptables', 'La connaissance de votre métier',
 'Le cabinet doit déjà suivre des clients de votre secteur et de votre taille. Demandez-lui combien.', null, null, null, 1),
('interlocuteur', 'experts-comptables', 'Un interlocuteur attitré',
 'Vous devez savoir qui traite votre dossier : l''expert-comptable ou un collaborateur junior. Exigez un nom et un délai de réponse garanti (48 h maximum).', null, null, null, 2),
('conseil', 'experts-comptables', 'Le conseil, pas seulement la saisie',
 'Un bon cabinet vous aide à décider : rémunération du dirigeant, optimisation fiscale, trésorerie, statut juridique. Testez-le dès le premier rendez-vous avec une vraie question.', null, null, null, 3),
('perimetre_prix', 'experts-comptables', 'Le périmètre et le prix',
 'Demandez une lettre de mission détaillée. Vérifiez ce qui est inclus dans le forfait (bilan, déclarations de TVA, paie, juridique annuel) et ce qui est facturé en supplément.', null, null, null, 4),
('outils', 'experts-comptables', 'Les outils',
 'Le cabinet doit proposer la récupération automatique des flux bancaires, le dépôt des pièces en ligne et un tableau de bord. Il doit aussi être prêt pour la facturation électronique, dont l''obligation se met en place progressivement depuis septembre 2026.',
 'https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique', 'impots.gouv.fr', '2026-11-14', 5),
('cabinet', 'experts-comptables', 'Le cabinet en chiffres', null, null, null, null, 6),
('metier', '*', 'La connaissance de votre métier', null, null, null, null, 1),
('interlocuteur', '*', 'Un interlocuteur attitré', null, null, null, null, 2),
('conseil', '*', 'Le conseil', null, null, null, null, 3),
('perimetre_prix', '*', 'Le périmètre et le prix', null, null, null, null, 4),
('outils', '*', 'Les outils', null, null, null, null, 5),
('cabinet', '*', 'Le cabinet en chiffres', null, null, null, null, 6)
on conflict (code, scope) do update set title = excluded.title, advice = excluded.advice, source_url = excluded.source_url,
  source_label = excluded.source_label, accessed_on = excluded.accessed_on, sort = excluded.sort;

-- ---------------------------------------------------------------------------
-- Nouveaux critères, puis rangement de tous les critères dans les axes
-- ---------------------------------------------------------------------------
insert into public.provider_criteria (code, label, question, kind, professions, options, unit, filterable, sort, source_hint, axis) values
('references', 'Références clientes', 'Quelles entreprises le cabinet cite-t-il comme clientes ?', 'list', null, '[]', null, false, 30, 'page références du site du cabinet', 'metier'),
('cas_clients', 'Cas clients', 'Qu''a-t-il fait pour des entreprises comme la mienne ?', 'list', null, '[]', null, false, 40, 'cas clients publiés par le cabinet (résumés)', 'metier'),
('cas_usage', 'Situations accompagnées', 'M''accompagne-t-il dans ma situation ?', 'multi', null,
 '[{"code":"creation","label":"Création"},{"code":"reprise","label":"Reprise d''entreprise"},{"code":"croissance","label":"Croissance"},
   {"code":"structuration-groupe","label":"Structuration en groupe ou holding"},{"code":"transmission","label":"Transmission"},
   {"code":"difficultes","label":"Entreprise en difficulté"},{"code":"international","label":"Développement international"},
   {"code":"changement-outil","label":"Changement de logiciel ou d''ERP"},{"code":"facturation-electronique","label":"Passage à la facturation électronique"},
   {"code":"externalisation-comptabilite","label":"Externalisation de la comptabilité"},{"code":"externalisation-paie","label":"Externalisation de la paie"},
   {"code":"controle-gestion","label":"Mise en place du contrôle de gestion"},{"code":"rse","label":"Démarche RSE"}]',
 null, true, 25, 'site du cabinet', 'metier'),
('nombre_clients', 'Nombre de clients', 'Combien de clients suit-il ?', 'number', null, '[]', 'clients', false, 50, 'chiffre affiché par le cabinet', 'metier'),
('interlocuteur_attitre', 'Interlocuteur attitré', 'Aurai-je un interlocuteur dédié ?', 'boolean', null, '[]', null, true, 10, 'site du cabinet', 'interlocuteur'),
('qui_traite', 'Qui suit le dossier', 'Qui traite mon dossier ?', 'one', array['experts-comptables'],
 '[{"code":"expert-comptable","label":"L''expert-comptable lui-même"},{"code":"collaborateur-supervise","label":"Un collaborateur dédié, supervisé par l''expert-comptable"}]',
 null, true, 20, 'site du cabinet', 'interlocuteur'),
('delai_reponse', 'Délai de réponse garanti', 'En combien de temps me répond-il ?', 'one', null,
 '[{"code":"24h","label":"24 h"},{"code":"48h","label":"48 h"},{"code":"72h-plus","label":"72 h ou plus"}]', null, true, 30, 'engagement affiché par le cabinet', 'interlocuteur'),
('conseil', 'Conseil au dirigeant', 'M''aide-t-il à décider ?', 'multi', null,
 '[{"code":"remuneration-dirigeant","label":"Rémunération du dirigeant"},{"code":"optimisation-fiscale","label":"Optimisation fiscale"},
   {"code":"tresorerie","label":"Trésorerie"},{"code":"statut-juridique","label":"Statut juridique"},{"code":"previsionnel","label":"Prévisionnel et budget"},
   {"code":"tableau-de-bord","label":"Tableaux de bord et pilotage"},{"code":"patrimoine-dirigeant","label":"Patrimoine du dirigeant"}]',
 null, true, 10, 'site du cabinet', 'conseil'),
('forfait_inclus', 'Inclus dans le forfait', 'Qu''est-ce qui est compris dans le prix ?', 'multi', null,
 '[{"code":"bilan","label":"Bilan"},{"code":"tva","label":"Déclarations de TVA"},{"code":"liasse-fiscale","label":"Liasse fiscale"},
   {"code":"paie","label":"Paie"},{"code":"juridique-annuel","label":"Juridique annuel"},{"code":"tableau-de-bord","label":"Tableau de bord"},
   {"code":"rendez-vous-annuel","label":"Rendez-vous annuel"}]', null, true, 20, 'page offres ou tarifs du cabinet', 'perimetre_prix'),
('tarif_min_mensuel', 'Prix d''entrée', 'À partir de combien ?', 'number', null, '[]', '€ HT par mois', false, 30, 'page tarifs du cabinet', 'perimetre_prix'),
('outils_cabinet', 'Outils proposés aux clients', 'Mes pièces et ma banque sont-elles automatisées ?', 'multi', null,
 '[{"code":"flux-bancaires","label":"Récupération automatique des flux bancaires"},{"code":"depot-pieces","label":"Dépôt des pièces en ligne"},
   {"code":"tableau-de-bord","label":"Tableau de bord en ligne"},{"code":"application-mobile","label":"Application mobile"},
   {"code":"signature-electronique","label":"Signature électronique"},{"code":"espace-client","label":"Espace client en ligne"}]',
 null, true, 10, 'site du cabinet', 'outils'),
('chiffre_affaires', 'Chiffre d''affaires du cabinet', 'Quel est son poids économique ?', 'number', null, '[]', '€', false, 5, 'comptes publiés (registre public)', 'cabinet')
on conflict (code) do update set label = excluded.label, question = excluded.question, kind = excluded.kind, professions = excluded.professions,
  options = excluded.options, unit = excluded.unit, filterable = excluded.filterable, sort = excluded.sort, source_hint = excluded.source_hint, axis = excluded.axis;

update public.provider_criteria set axis = v.axis, sort = v.sort, label = coalesce(v.label, provider_criteria.label), question = coalesce(v.question, provider_criteria.question)
  from (values
    ('secteurs', 'metier', 10, null, null), ('clients', 'metier', 20, 'Types et taille des clients', 'Suit-il des entreprises de ma taille ?'),
    ('mode_travail', 'interlocuteur', 40, null, null), ('langues', 'interlocuteur', 50, null, null),
    ('missions_comptables', 'perimetre_prix', 10, null, null), ('missions_audit', 'perimetre_prix', 10, null, null),
    ('fonctions_recrutees', 'metier', 5, null, null), ('methode_recrutement', 'perimetre_prix', 15, null, null),
    ('honoraires', 'perimetre_prix', 25, null, null), ('tarif', 'perimetre_prix', 40, 'Tarif affiché', null),
    ('logiciels', 'outils', 20, null, null), ('facturation_electronique', 'outils', 30, 'Prêt pour la facturation électronique', 'Est-il prêt pour la facturation électronique ?'),
    ('niveau_partenariat', 'outils', 25, null, null),
    ('effectif', 'cabinet', 10, null, null), ('annee_creation', 'cabinet', 20, null, null), ('reseau', 'cabinet', 30, null, null)
  ) as v(code, axis, sort, label, question)
 where provider_criteria.code = v.code;
