-- =============================================================================
-- 2200 · Grille de lecture des cabinets et prestataires (consigne du dirigeant, 14/11/2026)
-- Chaque information collectée sur un cabinet sert à un DAF pour filtrer et comparer.
-- - provider_criteria : référentiel des critères (question posée par le DAF, type, valeurs normalisées, métiers concernés) ;
-- - provider_facts    : une valeur typée par cabinet et par critère, avec source et date de consultation ;
--   brouillon par défaut (agent ou import), visible du public seulement une fois validée par un éditeur humain
--   (trigger guard_fact_validation) ; un critère sans fait validé s'affiche « non vérifié » et ne passe aucun filtre.
-- - providers_filtered() / provider_filter_options() : filtres des pages locales, sur les seuls faits validés.
-- =============================================================================

create table public.provider_criteria (
  code        text primary key check (code ~ '^[a-z0-9_]+$'),
  label       text not null,
  question    text not null,                       -- ce que le DAF cherche à savoir
  kind        text not null check (kind in ('multi', 'one', 'boolean', 'number', 'text')),
  professions text[],                              -- slugs des annuaires concernés ; null = tous
  options     jsonb not null default '[]'::jsonb,  -- [{ "code": "...", "label": "..." }] pour multi / one
  unit        text,
  filterable  boolean not null default false,
  sort        int not null default 0,
  source_hint text,                                -- où trouver l'information
  check (jsonb_typeof(options) = 'array'),
  check (kind not in ('multi', 'one') or jsonb_array_length(options) > 0)
);

create table public.provider_facts (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers (id) on delete cascade,
  criterion    text not null references public.provider_criteria (code) on update cascade,
  value        jsonb not null,
  source_url   text not null check (source_url ~ '^https?://'),
  source_kind  text not null check (source_kind in ('site_officiel', 'registre_public', 'annuaire_professionnel', 'declaration_cabinet')),
  accessed_on  date not null,                      -- date de consultation de la source (règle 6)
  status       public.fact_status not null default 'draft',
  author_kind  text not null default 'human' check (author_kind in ('human', 'agent', 'vendor')),
  created_by   uuid references auth.users (id),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  note         text check (note is null or length(note) <= 500),
  created_at   timestamptz not null default now()
);
-- Un seul fait « vivant » (brouillon ou validé) par cabinet et par critère ; l'historique reste en superseded / rejected.
create unique index provider_facts_live_idx on public.provider_facts (provider_id, criterion) where status in ('draft', 'validated');
create index provider_facts_filter_idx on public.provider_facts (criterion, provider_id) where status = 'validated';
create trigger audit_provider_facts after insert or update or delete on public.provider_facts
  for each row execute function public.audit_trigger();

-- La valeur doit respecter le type et les codes du référentiel (pas de texte libre dans un critère filtrable).
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
  elsif c.kind = 'number' and jsonb_typeof(new.value) <> 'number' then
    raise exception 'Critère % : nombre attendu', c.code using errcode = '22023';
  elsif c.kind = 'text' and (jsonb_typeof(new.value) <> 'string' or length(new.value #>> '{}') not between 1 and 300) then
    raise exception 'Critère % : texte de 1 à 300 caractères attendu', c.code using errcode = '22023';
  end if;
  -- Métier : catégorie d'annuaire du prestataire (un cabinet peut figurer dans plusieurs annuaires, ex. experts-comptables et CAC)
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
create trigger provider_facts_check before insert or update of value, criterion, provider_id on public.provider_facts
  for each row execute function public.check_provider_fact();

-- Validation humaine : même garde que les faits logiciels (validated_by / validated_at renseignés).
create or replace function public.guard_fact_validation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status is distinct from 'validated') then
    if auth.uid() is not null and not public.user_is_human_editor(auth.uid()) then
      raise exception 'Seul un éditeur humain peut valider un fait';
    end if;
    if tg_table_name in ('software_facts', 'provider_facts') then
      new.validated_by := coalesce(new.validated_by, auth.uid());
      new.validated_at := coalesce(new.validated_at, now());
    end if;
  end if;
  return new;
end;
$$;
create trigger provider_facts_guard before insert or update on public.provider_facts
  for each row execute function public.guard_fact_validation();

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
alter table public.provider_criteria enable row level security;
alter table public.provider_facts enable row level security;
revoke all on public.provider_criteria, public.provider_facts from anon, authenticated;
grant select on public.provider_criteria to anon, authenticated;
grant insert, update, delete on public.provider_criteria to authenticated;
create policy provider_criteria_read on public.provider_criteria for select using (true);
create policy provider_criteria_editor_write on public.provider_criteria for all to authenticated
  using (public.has_role('editor')) with check (public.has_role('editor'));

-- Public : faits validés de fiches publiées ; ni l'auteur ni le valideur ne sont servis.
grant select (id, provider_id, criterion, value, source_url, source_kind, accessed_on, status, validated_at) on public.provider_facts to anon;
grant select, insert, update, delete on public.provider_facts to authenticated;
create policy provider_facts_read on public.provider_facts for select using (
  (status = 'validated' and exists (select 1 from public.providers p where p.id = provider_id and p.status = 'published'))
  or public.is_staff() or public.is_agent());
create policy provider_facts_editor_write on public.provider_facts for all to authenticated
  using (public.has_role('editor')) with check (public.has_role('editor'));
-- Un agent n'écrit que des brouillons, à son nom (règle 4).
create policy provider_facts_agent_insert on public.provider_facts for insert to authenticated
  with check (public.is_agent() and status = 'draft' and author_kind = 'agent' and created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Filtres des pages locales (faits validés seulement ; security invoker : RLS de l'appelant)
-- p_filters : { "critère": ["code", ...] } ; plusieurs codes d'un critère = OU ; plusieurs critères = ET.
-- Pour un critère oui/non, le code attendu est "oui".
-- ---------------------------------------------------------------------------
create or replace function public.providers_filtered(p_category uuid, p_city_slug text default null, p_department text default null,
  p_filters jsonb default '{}'::jsonb, p_limit int default 48, p_offset int default 0)
returns jsonb language sql stable security invoker set search_path = public as $$
  with hits as (
    select p.id, p.name
      from provider_categories pc
      join providers p on p.id = pc.provider_id and p.status = 'published'
     where pc.category_id = p_category
       and (p_city_slug is null or p.city_slug = p_city_slug)
       and (p_department is null or p.department = p_department)
       and not exists (
         select 1 from jsonb_each(coalesce(p_filters, '{}'::jsonb)) f(k, v)
          where not exists (
            select 1 from provider_facts pf
             where pf.provider_id = p.id and pf.criterion = f.k and pf.status = 'validated'
               and case jsonb_typeof(pf.value)
                     when 'array' then pf.value ?| array(select jsonb_array_elements_text(f.v))
                     when 'string' then (pf.value #>> '{}') = any (array(select jsonb_array_elements_text(f.v)))
                     when 'boolean' then pf.value = 'true'::jsonb and f.v ? 'oui'
                     else false end))
  )
  select jsonb_build_object(
    'total', (select count(*) from hits),
    'ids', coalesce((select jsonb_agg(id order by name, id) from (select id, name from hits order by name, id
                      limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) x), '[]'::jsonb));
$$;
grant execute on function public.providers_filtered(uuid, text, text, jsonb, int, int) to anon, authenticated;

-- Valeurs disponibles pour les filtres d'une page (seules celles portées par au moins une fiche publiée, faits validés).
create or replace function public.provider_filter_options(p_category uuid, p_city_slug text default null, p_department text default null)
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('criterion', criterion, 'code', code, 'n', n) order by criterion, n desc, code), '[]'::jsonb)
    from (
      select pf.criterion, v.code, count(distinct pf.provider_id) as n
        from provider_categories pc
        join providers p on p.id = pc.provider_id and p.status = 'published'
        join provider_facts pf on pf.provider_id = p.id and pf.status = 'validated'
        join provider_criteria c on c.code = pf.criterion and c.filterable
        cross join lateral (
          select x as code from jsonb_array_elements_text(case when jsonb_typeof(pf.value) = 'array' then pf.value else '[]'::jsonb end) x
          union all select pf.value #>> '{}' where jsonb_typeof(pf.value) = 'string'
          union all select 'oui' where pf.value = 'true'::jsonb) v
       where pc.category_id = p_category
         and (p_city_slug is null or p.city_slug = p_city_slug)
         and (p_department is null or p.department = p_department)
       group by pf.criterion, v.code) s;
$$;
grant execute on function public.provider_filter_options(uuid, text, text) to anon, authenticated;

-- Validation d'un lot de faits par un éditeur (une fiche, ou toutes les fiches d'une ville pour une source donnée).
create or replace function public.validate_provider_facts(p_provider uuid default null, p_city_slug text default null,
  p_source_kind text default null, p_reject boolean default false)
returns int language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.has_role('editor') then
    raise exception 'Réservé aux éditeurs' using errcode = '42501';
  end if;
  if p_provider is null and p_city_slug is null then
    raise exception 'Indiquer une fiche ou une ville' using errcode = '22023';
  end if;
  update provider_facts pf set status = case when p_reject then 'rejected'::fact_status else 'validated'::fact_status end
    from providers p
   where p.id = pf.provider_id and pf.status = 'draft'
     and (p_provider is null or p.id = p_provider)
     and (p_city_slug is null or p.city_slug = p_city_slug)
     and (p_source_kind is null or pf.source_kind = p_source_kind);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.validate_provider_facts(uuid, text, text, boolean) from public, anon;
grant execute on function public.validate_provider_facts(uuid, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Référentiel (docs/GRILLE-LECTURE-CABINETS.md). Les codes sont stables : ne jamais renommer un code utilisé.
-- ---------------------------------------------------------------------------
insert into public.provider_criteria (code, label, question, kind, professions, options, unit, filterable, sort, source_hint) values
('clients', 'Taille des clients', 'Le cabinet suit-il des entreprises de ma taille ?', 'multi', null,
 '[{"code":"independants","label":"Indépendants et professions libérales"},{"code":"creation","label":"Créateurs d''entreprise"},
   {"code":"tpe","label":"TPE (moins de 10 salariés)"},{"code":"pme","label":"PME (10 à 249 salariés)"},
   {"code":"eti","label":"ETI (250 salariés et plus)"},{"code":"groupes","label":"Groupes de sociétés"},
   {"code":"startups","label":"Start-up"},{"code":"associations","label":"Associations"}]', null, true, 10, 'site du cabinet'),
('secteurs', 'Secteurs', 'Connaît-il mon secteur ?', 'multi', null,
 '[{"code":"agriculture","label":"Agriculture"},{"code":"btp","label":"BTP"},{"code":"artisanat","label":"Artisanat"},
   {"code":"commerce","label":"Commerce"},{"code":"e-commerce","label":"E-commerce"},{"code":"restauration-hotellerie","label":"Restauration et hôtellerie"},
   {"code":"industrie","label":"Industrie"},{"code":"immobilier","label":"Immobilier"},{"code":"transport","label":"Transport et logistique"},
   {"code":"sante","label":"Santé"},{"code":"professions-liberales","label":"Professions libérales"},{"code":"tech","label":"Numérique et tech"},
   {"code":"services-financiers","label":"Services financiers"},{"code":"energie","label":"Énergie"},{"code":"culture","label":"Culture et spectacle"},
   {"code":"associations-ess","label":"Associations et ESS"},{"code":"secteur-public","label":"Secteur public"},{"code":"conseil","label":"Conseil et services aux entreprises"}]',
 null, true, 20, 'site du cabinet'),
('logiciels', 'Logiciels maîtrisés', 'Travaille-t-il avec mes outils ?', 'multi', null,
 '[{"code":"pennylane","label":"Pennylane"},{"code":"tiime","label":"Tiime"},{"code":"dext","label":"Dext"},{"code":"inqom","label":"Inqom"},
   {"code":"fulll","label":"Fulll"},{"code":"odoo","label":"Odoo"},{"code":"sage","label":"Sage"},{"code":"cegid","label":"Cegid"},
   {"code":"quickbooks","label":"QuickBooks"},{"code":"silae","label":"Silae"},{"code":"meg","label":"MEG"},{"code":"acd","label":"ACD"},
   {"code":"yeap","label":"Yeap"},{"code":"payfit","label":"PayFit"},{"code":"apy","label":"Apy"},{"code":"divalto","label":"Divalto"},
   {"code":"sap","label":"SAP"},{"code":"microsoft-dynamics","label":"Microsoft Dynamics"},{"code":"agicap","label":"Agicap"}]',
 null, true, 30, 'site du cabinet (pages partenaires, offres)'),
('facturation_electronique', 'Facturation électronique', 'M''accompagne-t-il dans la réforme de la facturation électronique ?', 'boolean', null,
 '[]', null, true, 40, 'site du cabinet'),
('mode_travail', 'Mode de travail', 'Puis-je travailler à distance ou en rendez-vous ?', 'multi', null,
 '[{"code":"sur-place","label":"Rendez-vous au cabinet"},{"code":"a-distance","label":"À distance"}]', null, true, 50, 'site du cabinet'),
('langues', 'Langues', 'Peut-il travailler dans une autre langue ?', 'multi', null,
 '[{"code":"en","label":"Anglais"},{"code":"es","label":"Espagnol"},{"code":"de","label":"Allemand"},{"code":"it","label":"Italien"},
   {"code":"pt","label":"Portugais"},{"code":"ar","label":"Arabe"},{"code":"zh","label":"Chinois"}]', null, true, 60, 'site du cabinet'),
('tarif', 'Tarif affiché', 'Combien cela coûte-t-il ?', 'text', null, '[]', null, false, 70, 'page tarifs du site du cabinet'),
('reseau', 'Réseau ou groupe', 'Fait-il partie d''un réseau ?', 'text', null, '[]', null, false, 80, 'site du cabinet'),
('effectif', 'Taille du cabinet', 'Le cabinet a-t-il la taille pour me suivre ?', 'one', null,
 '[{"code":"0","label":"Sans salarié"},{"code":"1-2","label":"1 à 2 salariés"},{"code":"3-5","label":"3 à 5 salariés"},
   {"code":"6-9","label":"6 à 9 salariés"},{"code":"10-19","label":"10 à 19 salariés"},{"code":"20-49","label":"20 à 49 salariés"},
   {"code":"50-99","label":"50 à 99 salariés"},{"code":"100-199","label":"100 à 199 salariés"},{"code":"200+","label":"200 salariés et plus"}]',
 null, true, 90, 'registre public (Sirene, tranche d''effectif)'),
('annee_creation', 'Année de création', 'Depuis quand existe-t-il ?', 'number', null, '[]', null, false, 100, 'registre public (Sirene)'),
-- Experts-comptables
('missions_comptables', 'Missions', 'Fait-il ce dont j''ai besoin ?', 'multi', array['experts-comptables'],
 '[{"code":"tenue","label":"Tenue comptable"},{"code":"bilan","label":"Révision et bilan"},{"code":"fiscalite","label":"Fiscalité"},
   {"code":"paie","label":"Paie"},{"code":"social","label":"Social et RH"},{"code":"juridique","label":"Juridique"},
   {"code":"creation","label":"Création d''entreprise"},{"code":"conseil-gestion","label":"Conseil de gestion"},
   {"code":"previsionnel","label":"Prévisionnel et budget"},{"code":"consolidation","label":"Consolidation"},
   {"code":"audit","label":"Audit et commissariat aux comptes"},{"code":"transmission","label":"Transmission et cession"},
   {"code":"international","label":"International"},{"code":"en-ligne","label":"Expertise comptable en ligne"}]',
 null, true, 5, 'site du cabinet'),
-- Commissaires aux comptes
('missions_audit', 'Missions', 'Quelles missions d''audit réalise-t-il ?', 'multi', array['commissaires-aux-comptes'],
 '[{"code":"cac-legal","label":"Commissariat aux comptes"},{"code":"audit-contractuel","label":"Audit contractuel"},
   {"code":"consolidation","label":"Comptes consolidés"},{"code":"durabilite","label":"Certification des informations de durabilité (CSRD)"},
   {"code":"apports-fusion","label":"Commissariat aux apports et à la fusion"},{"code":"associations","label":"Associations et fonds publics"}]',
 null, true, 5, 'site du cabinet'),
-- Recrutement finance
('fonctions_recrutees', 'Fonctions recrutées', 'Recrute-t-il le profil que je cherche ?', 'multi', array['cabinets-recrutement-finance'],
 '[{"code":"daf","label":"DAF et direction financière"},{"code":"controle-gestion","label":"Contrôle de gestion"},
   {"code":"comptabilite","label":"Comptabilité"},{"code":"tresorerie","label":"Trésorerie"},{"code":"audit","label":"Audit et contrôle interne"},
   {"code":"consolidation","label":"Consolidation et reporting"},{"code":"paie","label":"Paie"},{"code":"fiscalite","label":"Fiscalité"}]',
 null, true, 5, 'site du cabinet'),
('methode_recrutement', 'Méthode', 'Comment trouve-t-il les candidats ?', 'multi', array['cabinets-recrutement-finance'],
 '[{"code":"approche-directe","label":"Approche directe"},{"code":"annonces","label":"Annonces"},{"code":"interim","label":"Intérim"},
   {"code":"management-transition","label":"Management de transition"}]', null, true, 6, 'site du cabinet'),
('honoraires', 'Honoraires', 'Comment est-il payé ?', 'multi', array['cabinets-recrutement-finance'],
 '[{"code":"succes","label":"Au succès"},{"code":"acompte","label":"Acompte puis solde"},{"code":"forfait","label":"Forfait"}]',
 null, true, 7, 'site du cabinet'),
-- Intégrateurs
('niveau_partenariat', 'Niveau de partenariat', 'Est-il reconnu par l''éditeur ?', 'text', array['integrateurs-comptables'],
 '[]', null, false, 5, 'annuaire des partenaires de l''éditeur')
on conflict (code) do update set label = excluded.label, question = excluded.question, kind = excluded.kind,
  professions = excluded.professions, options = excluded.options, unit = excluded.unit, filterable = excluded.filterable,
  sort = excluded.sort, source_hint = excluded.source_hint;
