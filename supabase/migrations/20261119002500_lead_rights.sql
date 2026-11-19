-- =============================================================================
-- 2500 · Mises en relation : droits du commercial limités au traitement (revue de sécurité du 19/11/2026)
-- - le commercial et l'admin ne modifient que le statut et l'horodatage de transmission : ni les destinataires
--   cochés par le visiteur, ni ses coordonnées, ni la preuve de consentement ;
-- - chaque modification est journalisée (audit_log), purgée avec la demande au bout de 3 ans.
-- =============================================================================

revoke update on public.contact_requests, public.contact_request_targets from authenticated;
grant update (status, handled_by, handled_at) on public.contact_requests to authenticated;
grant update (transmitted_at) on public.contact_request_targets to authenticated;

-- Journal des modifications (pas des insertions : les coordonnées ne sont pas recopiées à la création).
create trigger audit_contact_requests after update on public.contact_requests
  for each row execute function public.audit_trigger();
create trigger audit_contact_request_targets after update on public.contact_request_targets
  for each row execute function public.audit_trigger();

-- Une demande transmise ou close ne revient pas en arrière sans trace ; une demande indésirable n'est jamais transmise.
create or replace function public.guard_contact_transmission()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.transmitted_at is not null and old.transmitted_at is null and exists (
       select 1 from contact_requests r where r.id = new.request_id and r.status in ('spam', 'closed')) then
    raise exception 'Demande close ou indésirable : aucune transmission' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger contact_request_targets_guard before update of transmitted_at on public.contact_request_targets
  for each row execute function public.guard_contact_transmission();

-- Purge à 3 ans : demandes, réponses et lignes du journal qui les concernent.
create or replace function public.purge_lead_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int;
begin
  delete from challenge_responses where created_at < now() - interval '3 years'; get diagnostics a = row_count;
  delete from contact_requests where created_at < now() - interval '3 years'; get diagnostics b = row_count;
  delete from audit_log where table_name in ('contact_requests', 'contact_request_targets') and at < now() - interval '3 years';
  get diagnostics c = row_count;
  return jsonb_build_object('challenge_responses', a, 'contact_requests', b, 'audit_log', c);
end;
$$;
revoke execute on function public.purge_lead_data() from public, anon, authenticated;
