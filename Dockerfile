# syntax=docker/dockerfile:1.10
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: build — Node 22 LTS. better-sqlite3 compiles a native addon, so the
# build stage needs python3/make/g++.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Drop dev dependencies (keeps the compiled better-sqlite3 prod binding).
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime — Node server (standalone adapter), non-root. node:22-alpine
# already ships libstdc++ that the better-sqlite3 binding needs.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/scripts ./scripts

# Data dir for the SQLite file (bind-mount /opt/mapswitch/data here in Dokploy).
RUN mkdir -p /app/data && chown app:app /app/data

USER app
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/api/health || exit 1

# Apply migrations, then start the server. Migrations are idempotent.
CMD ["sh", "-c", "node ./scripts/migrate.mjs && node ./dist/server/entry.mjs"]
