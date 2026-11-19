-- DONNÉES FICTIVES (local uniquement) : constats de démonstration par fonction pour les 3 logiciels fictifs de trésorerie.
insert into public.software_facts (software_id, fact_type, value, source_url, status, author_kind, note)
select s.id, 'bloc_' || v.code, jsonb_build_object('level', v.level, 'how', v.how, 'plan', v.plan), 'https://exemple.test/tarifs', 'validated', 'human', 'démonstration'
  from public.software s
  join (values
    ('tresoflux', 'banques', 'inclus', '11 comptes sur 12 connectés en moins d''une heure (démonstration)', 'Toutes offres'),
    ('tresoflux', 'scenarios', 'inclus', '3 scénarios comparés côte à côte (démonstration)', 'Groupe'),
    ('tresoflux', 'consolidation', 'inclus', 'Vue groupe, intragroupe éliminé (démonstration)', 'Groupe'),
    ('tresoflux', 'ebics', 'option', 'En option sur devis (démonstration)', 'Sur mesure'),
    ('cashpilot', 'banques', 'inclus', 'Toutes les grandes banques (démonstration)', 'Toutes offres'),
    ('cashpilot', 'scenarios', 'absent', 'Une seule prévision (démonstration)', null),
    ('cashpilot', 'consolidation', 'absent', 'Une seule société (démonstration)', null),
    ('cashpilot', 'mobile', 'inclus', 'Application complète (démonstration)', 'Toutes offres'),
    ('previa', 'banques', 'inclus', '9 banques sur 12, imports CSV pour les autres (démonstration)', 'Toutes offres'),
    ('previa', 'scenarios', 'inclus', 'Scénarios reliés au budget (démonstration)', 'Toutes offres'),
    ('previa', 'rapprochement', 'option', 'Uniquement via l''ERP (démonstration)', 'Option')
  ) as v(slug, code, level, how, plan) on v.slug = s.slug
 where s.is_fictional
   and not exists (select 1 from public.software_facts f where f.software_id = s.id and f.fact_type = 'bloc_' || v.code);
