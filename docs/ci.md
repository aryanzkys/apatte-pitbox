# CI

## What runs in CI
- Install dependencies with pnpm
- Lint
- Typecheck
- Test

## Run locally
- pnpm install
- pnpm lint
- pnpm typecheck
- pnpm test

## Caching
- CI caches the pnpm store to speed up installs.
- The cache key is based on pnpm-lock.yaml when present.
