-- 1500 · Localisation des prestataires (adresse de la SOCIÉTÉ, issue du registre public Recherche d'entreprises).
-- Ouvert à anon : c'est une information publique sur une personne morale. siren et internal_contact restent fermés (règle 9).
alter table public.providers
  add column if not exists postal_code text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  add column if not exists department  text check (department is null or department ~ '^([0-9]{2,3}|2A|2B)$'),
  add column if not exists latitude    numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude   numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  add column if not exists offices     text[] not null default '{}',
  add column if not exists coverage    text check (coverage is null or coverage in ('national', 'régional', 'local'));

comment on column public.providers.offices is 'Villes des autres bureaux en France, telles qu''affichées sur le site du cabinet.';
comment on column public.providers.coverage is 'Zone d''intervention déclarée par le cabinet : national, régional ou local.';

grant select (postal_code, department, latitude, longitude, offices, coverage) on public.providers to anon;

create or replace view public.providers_public with (security_invoker = true) as
  select id, name, slug, profession, regulated_profession, website, city, city_slug, region,
         specialties, deal_size_range, description, public_references, verification_status,
         verified_at, is_fictional, updated_at,
         postal_code, department, latitude, longitude, offices, coverage
  from public.providers
  where status = 'published';
