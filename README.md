# Apatte Pitbox
Apatte Pitbox is a real-time pit-wall telemetry and race-operations platform
for endurance and efficiency racing. It will ingest telemetry, store and
analyze session data, and power a multi-panel dashboard with alerts and
race-session tools. The platform is designed for reliability, low-latency
visibility, and clear operational workflows. This monorepo will host multiple
apps and shared packages to keep the system cohesive and scalable.

Status: Phase 1: Foundation (in progress)

## Monorepo layout
- Apps
	- [apps/web-dashboard](apps/web-dashboard/README.md)
	- [apps/telemetry-ingestion](apps/telemetry-ingestion/README.md)
	- [apps/edge-agent](apps/edge-agent/README.md)
	- [apps/ml-engine](apps/ml-engine/README.md)
- Packages
	- [packages/config](packages/config/README.md)
	- [packages/env](packages/env)
	- [packages/types](packages/types/README.md)
	- [packages/utils](packages/utils/README.md)
- [infra](infra/README.md)
- [docs](docs/README.md)

## Repo Conventions
**Naming rules**
- Folders and packages: kebab-case
- Branches: kebab-case (recommended)
- Commits: short, imperative, scoped (recommended)

**Where to put new code**
- Product apps live under apps/
- Shared code lives under packages/
- Operational assets live under infra/
- Docs and decisions live under docs/

**How to add a new app or package**
1. Create a new folder under apps/ or packages/ using kebab-case.
2. Add a README.md with purpose, scope, and exclusions.
3. Keep cross-cutting logic in packages/ and avoid app-to-app coupling.

**Do / Don’t**
- Do keep modules small and single-purpose.
- Do document assumptions early.
- Don’t mix infra with app code.
- Don’t add framework boilerplate until required.

## Roadmap Snapshot
- Foundation: establish repo structure, contracts, and baseline conventions.
- Race Ops: build ingestion, dashboard workflows, and core alerting.
- AI: add model pipelines, predictions, and decision support.
- Production hardening: reliability, observability, and security maturity.

## Getting Started
Required tools:
- Node.js >= 20
- pnpm

Commands:
- pnpm install
- pnpm dev
- pnpm build
- pnpm lint
- pnpm typecheck
- pnpm -r typecheck

Note: Apps are placeholders in Phase 1/2 and will print a “Not implemented yet” message.

## Environment Setup
See [docs/env.md](docs/env.md) for the full environment variable strategy.

Quick start:
- cp .env.local.example .env
- pnpm install
- pnpm dev

## Local Supabase
See [docs/supabase-local.md](docs/supabase-local.md) for setup details.

Quick start:
- pnpm supabase:start
- pnpm supabase:status

## CI
GitHub Actions runs install, lint, typecheck, and test on push and PR.
Local equivalents:
- pnpm lint
- pnpm typecheck
- pnpm test

## Deploy to Netlify
See [docs/netlify-deploy.md](docs/netlify-deploy.md).
