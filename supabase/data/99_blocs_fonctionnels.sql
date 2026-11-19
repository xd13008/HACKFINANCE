-- Blocs fonctionnels de la catégorie trésorerie (maquette validée le 11/11/2026, écran 13) : libellés, enjeux et conseils.
-- Les constats par logiciel sont des faits « bloc_<code> » relevés pendant les tests et validés par un éditeur (aucun ici).
-- Idempotent : un bloc déjà présent (éventuellement retouché par un éditeur) n'est jamais écrasé.
insert into public.category_blocks (category_id, code, label, why, advice, sort)
select c.id, v.code, v.label, v.why, v.advice, v.sort
  from public.categories c
  join public.sites s on s.id = c.site_id and s.key = 'daf'
  cross join (values
    ('banques', 'Connexions bancaires', 'Sans synchronisation automatique et fiable de toutes vos banques, la prévision repose sur des imports manuels et perd sa valeur.',
     'vérifiez la liste des banques couvertes avant de signer, surtout pour une banque régionale.', 1),
    ('scenarios', 'Prévision par scénarios', 'Comparer un scénario prudent et un scénario central est indispensable pour piloter le BFR et préparer un rendez-vous bancaire.',
     'trois scénarios suffisent à la plupart des PME ; au-delà, regardez la facilité à les comparer côte à côte.', 2),
    ('consolidation', 'Consolidation multi-sociétés', 'Dès deux sociétés, il faut une vue groupe et l''élimination des flux intragroupe, sinon le cash consolidé est faux.',
     'testez l''élimination des flux intragroupe sur un mois réel avant de choisir.', 3),
    ('rapprochement', 'Rapprochement automatique', 'Le rapprochement des flux avec les factures évite la ressaisie et fiabilise la prévision.',
     'mesurez le taux de rapprochement automatique sur vos propres flux pendant l''essai.', 4),
    ('ebics', 'Communication bancaire EBICS', 'Pour les groupes multi-banques, EBICS sécurise les relevés et les paiements de masse.',
     'seulement utile au-delà de 3 ou 4 banques et pour des paiements fournisseurs en volume.', 5),
    ('mobile', 'Application mobile', 'Utile au dirigeant pour suivre le cash en déplacement ; secondaire pour l''équipe finance.',
     'ne choisissez pas un outil sur ce critère seul.', 6)
  ) as v(code, label, why, advice, sort)
 where c.slug = 'tresorerie' and c.kind = 'software'
on conflict (category_id, code) do nothing;
