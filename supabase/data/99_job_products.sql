-- Offres d'annonces d'emploi (prix hors taxes, en centimes). Idempotent : ce fichier fait foi pour les prix.
insert into public.job_products (code, label, description, amount_cents, duration_days, featured, active, sort) values
  ('annonce-30', 'Annonce 30 jours', 'Publication pendant 30 jours après relecture, visible dans la liste et sur Google pour l''emploi.', 19000, 30, false, true, 1),
  ('annonce-30-avant', 'Annonce 30 jours mise en avant', 'Annonce placée en tête de liste pendant 30 jours, avec la mention « Annonce ».', 29000, 30, true, true, 2)
on conflict (code) do update set label = excluded.label, description = excluded.description, amount_cents = excluded.amount_cents,
  duration_days = excluded.duration_days, featured = excluded.featured, active = excluded.active, sort = excluded.sort;
