FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/telemetry-ingestion ./apps/telemetry-ingestion

RUN pnpm install

WORKDIR /app/apps/telemetry-ingestion

EXPOSE 8081

USER node

CMD ["pnpm", "docker:start"]
