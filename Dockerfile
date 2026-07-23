# Aclearo API — staging/production image (monorepo root context).
# Build: docker build -t aclearo-api:staging .
# Run:   docker run --rm -p 3001:3001 --env-file apps/api/.env.staging.example aclearo-api:staging

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# Workspace manifests (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/ai/package.json packages/ai/

RUN pnpm install --frozen-lockfile --filter api...

# Application source
COPY apps/api apps/api
COPY packages/core packages/core
COPY packages/ai packages/ai

WORKDIR /app/apps/api
ENV NODE_ENV=production \
    API_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/api/health').then(r=>r.json()).then(j=>process.exit(j.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "start"]
