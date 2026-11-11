-- Publication en masse des fiches d'un annuaire, par ville ou par département (back-office).
-- Réservée aux éditeurs : la fonction refuse tout autre rôle, et la RLS providers_editor_write s'applique en plus
-- (security invoker). Les fiches gardent leur statut de vérification : « non vérifiées » tant qu'un éditeur
-- n'a pas contrôlé SIREN, site et références.
create or replace function public.publish_providers(
  p_category uuid, p_city_slug text default null, p_department text default null, p_publish boolean default true)
returns int language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.has_role('editor') then
    raise exception 'Seul un éditeur peut publier des fiches en masse' using errcode = '42501';
  end if;
  if p_city_slug is null and p_department is null then
    raise exception 'Choisir une ville ou un département' using errcode = '22023';
  end if;
  update public.providers p
     set status = case when p_publish then 'published' else 'draft' end
   where p.status = case when p_publish then 'draft' else 'published' end
     and p.verification_status <> case when p_publish then 'rejected' else 'verified' end  -- jamais une fiche rejetée ; le retrait épargne les vérifiées
     and (p_city_slug is null or p.city_slug = p_city_slug)
     and (p_department is null or p.department = p_department)
     and exists (select 1 from public.provider_categories pc where pc.provider_id = p.id and pc.category_id = p_category);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.publish_providers(uuid, text, text, boolean) from public, anon;
grant execute on function public.publish_providers(uuid, text, text, boolean) to authenticated;
