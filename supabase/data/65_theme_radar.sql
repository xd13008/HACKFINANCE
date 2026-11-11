-- Charte Radar Finances (maquette validée le 11/11/2026) : encre noire, accent vert citron, fond blanc cassé.
-- Idempotent : ne s'applique que si le thème est encore celui d'origine (un réglage fait en back-office est conservé).
update public.sites
set theme = theme || '{"primary":"#0b0b0f","accent":"#c6f432","page":"#fdfcfa"}'::jsonb
where key = 'daf' and coalesce(theme->>'primary', '#0f4c81') = '#0f4c81';
