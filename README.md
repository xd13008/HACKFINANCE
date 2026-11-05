# Réseau de portails média B2B

Média comparateur + annuaire + régie, multi-portails : **Radar Finances** et **Céder ma société**.
Architecture et stratégie : [`ARCHITECTURE.md`](ARCHITECTURE.md). Consignes de développement : [`CLAUDE.md`](CLAUDE.md).

## Lancement local

Prérequis : Node 22, pnpm, Docker.

```bash
pnpm install
pnpm db:start
pnpm db:reset
cp .env.example .env.local   # puis renseigner NEXT_PUBLIC_SUPABASE_ANON_KEY (npx supabase status -o env) et ANALYTICS_SALT
pnpm dev
```

- Portail DAF : http://radarfinances.localhost:3000
- Portail Cession : http://cedermasociete.localhost:3000
- Back-office : http://radarfinances.localhost:3000/admin (`editeur@exemple.test` / `demo-local-2026`)

Toutes les données sont fictives et signalées comme telles.

## Tests

```bash
pnpm test        # unitaires
pnpm test:db     # droits et file de validation (pgTAP)
```
