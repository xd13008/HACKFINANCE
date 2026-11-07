-- Sujets réglementés en « contenu seul » (ARCHITECTURE §9) : crédit, affacturage, compte pro,
-- assurance, placements. Une page marquée ne peut porter aucun emplacement publicitaire.
alter table public.content_items
  add column regulated_topic text
  check (regulated_topic in ('credit', 'affacturage', 'compte_pro', 'assurance', 'placement'));

comment on column public.content_items.regulated_topic is
  'Sujet réglementé : information générale uniquement, aucun emplacement sponsorisé ni lien commercial (ARCHITECTURE §9).';

create or replace function public.guard_regulated_inventory()
returns trigger language plpgsql as $$
begin
  if new.content_item_id is not null and exists (
    select 1 from public.content_items i where i.id = new.content_item_id and i.regulated_topic is not null
  ) then
    raise exception 'Sujet réglementé (ARCHITECTURE §9) : aucun emplacement publicitaire sur cette page';
  end if;
  return new;
end;
$$;

create trigger placement_inventory_regulated
  before insert or update of content_item_id on public.placement_inventory
  for each row execute function public.guard_regulated_inventory();

-- Une page qui porte déjà un emplacement ne peut pas être marquée réglementée sans retrait préalable.
create or replace function public.guard_regulated_item()
returns trigger language plpgsql as $$
begin
  if new.regulated_topic is not null and exists (
    select 1 from public.placement_inventory pi where pi.content_item_id = new.id
  ) then
    raise exception 'Retirer d''abord les emplacements publicitaires de cette page (sujet réglementé)';
  end if;
  return new;
end;
$$;

create trigger content_items_regulated
  before insert or update of regulated_topic on public.content_items
  for each row execute function public.guard_regulated_item();
