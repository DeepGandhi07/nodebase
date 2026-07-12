# syntax=docker/dockerfile:1

##### 1. Base image with pnpm enabled #####
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

##### 2. Install dependencies only #####
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

##### 3. Build the app #####
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These are only needed so `next build`'s page-data collection doesn't
# crash — some modules (e.g. Cryptr in src/lib/encryption.ts) throw if the
# env var is empty at *import* time. Dummy values are fine here: the real
# values from your .env are read fresh at container runtime, not baked in.
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ARG ENCRYPTION_KEY="build-time-placeholder-not-used-at-runtime"
ARG GITHUB_CLIENT_ID="placeholder"
ARG GITHUB_CLIENT_SECRET="placeholder"
ARG GOOGLE_CLIENT_ID="placeholder"
ARG GOOGLE_CLIENT_SECRET="placeholder"
ENV DATABASE_URL=${DATABASE_URL}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# package.json's "build" script already runs `prisma generate && next build`
RUN pnpm build

##### 4. Production runtime image #####
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js "standalone" output: a minimal server bundle + only the node_modules it needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Full node_modules from the builder (pnpm's node_modules is a tree of
# symlinks into node_modules/.pnpm — copying only specific packages leaves
# broken symlinks, since the .pnpm store they point to wouldn't be copied).
# This is what makes `prisma migrate deploy` work inside the container.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]