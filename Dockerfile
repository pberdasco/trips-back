# =========================
# Base comun
# =========================
FROM node:22-alpine AS base

ARG PNPM_VERSION=10.14.0

RUN apk add --no-cache curl

WORKDIR /app

RUN corepack enable


# =========================
# Dependencias PRODUCCION
# =========================
FROM base AS deps-prod

COPY package.json pnpm-lock.yaml ./

RUN corepack prepare pnpm@${PNPM_VERSION} --activate \
  && pnpm install --prod --frozen-lockfile


# =========================
# Dependencias DEV/TEST
# =========================
FROM base AS deps-test

COPY package.json pnpm-lock.yaml ./

RUN corepack prepare pnpm@${PNPM_VERSION} --activate \
  && pnpm install --frozen-lockfile


# =========================
# Runtime PRODUCCION
# =========================
FROM base AS runtime-prod

ENV NODE_ENV=production

COPY --chown=node:node --from=deps-prod /app/node_modules ./node_modules
COPY --chown=node:node . .

RUN rm -rf .git test request exports logs \
  && mkdir -p logs exports storage/uploads \
  && chown -R node:node logs exports storage

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD curl -fsS http://127.0.0.1:${PORT:-5030}/health || exit 1

EXPOSE 5030

USER node

CMD ["pnpm", "start:docker"]


# =========================
# Runtime DEV/TEST
# =========================
FROM base AS runtime-test

ENV NODE_ENV=development

COPY --chown=node:node --from=deps-test /app/node_modules ./node_modules
COPY --chown=node:node . .

RUN mkdir -p logs exports storage/uploads \
  && chown -R node:node logs exports storage

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD curl -fsS http://127.0.0.1:${PORT:-5030}/health || exit 1

EXPOSE 5030

USER node

CMD ["pnpm", "run", "dev"]
