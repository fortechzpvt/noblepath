# Noble Path — production container image
#
# PROPOSED AND APPROVED-FOR-V1 DESIGN. The primary v1 target is Vercel
# (see docs/deployment/deployment.md). This image exists as the portability
# escape hatch: it lets Noble Path run on any container platform without a
# rewrite, and it is what the team would use if the hosting decision changes.
#
# ============================ REQUIRED PRECONDITION ==========================
# This Dockerfile depends on Next.js standalone output:
#
#     // next.config.ts
#     const nextConfig: NextConfig = {
#       output: "standalone",
#       ...
#     };
#
# `next.config.ts` does NOT currently set this. `next.config.ts` is owned by the
# Full-Stack Engineer, so the DevOps Engineer has not edited it. Until that
# one-line change lands, the `builder` stage will produce no
# `.next/standalone` directory and the COPY below will fail the build with
# "failed to compute cache key: ... /app/.next/standalone: not found".
# That failure is intentional and loud: it is better than shipping a broken
# image. Tracked as a required action in the DevOps handoff.
# =============================================================================
#
# Build:  docker build -t noble-path:local .
# Run:    docker run --rm -p 3000:3000 \
#           -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
#           -e BOOKINGS_NOTIFICATION_EMAIL=... \
#           noble-path:local
#
# NOTE ON NEXT_PUBLIC_*: these are inlined into the client bundle at BUILD time,
# not read at runtime. An image built with one NEXT_PUBLIC_SITE_URL cannot be
# promoted to an environment with a different one — build a separate image per
# environment, or accept the baked-in value. See docs/deployment/environment.md.

# -----------------------------------------------------------------------------
# Stage 1: deps — install production+dev dependencies from the lockfile only.
# Kept separate so a source-only change does not re-run npm ci.
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

# libc6-compat is required by some native Next.js/SWC binaries on musl.
RUN apk add --no-cache libc6-compat

# Only the manifests, so this layer caches on dependency changes alone.
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: builder — produce the standalone production build.
# -----------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public configuration. Override with
# `--build-arg NEXT_PUBLIC_SITE_URL=https://noblepath.lk`.
# MUST NOT ever carry a secret: build args are visible in image history and the
# value is inlined into JavaScript served to the browser (NFR-6).
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: runner — minimal runtime. No source, no dev dependencies, no npm ci.
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# curl is used only by HEALTHCHECK. wget from busybox would also work; curl is
# chosen for consistency with the CI smoke check.
RUN apk add --no-cache curl

# Non-root runtime user. The `node` user (uid 1000) ships with the base image,
# but an explicit dedicated user makes the intent auditable and avoids relying
# on the base image keeping that account.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Static assets and public files are copied separately from the server bundle:
# standalone output deliberately excludes them.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Only the HTTP port. No debug port, no metrics port in v1.
EXPOSE 3000

# Liveness against the application's own health route. If /api/health does not
# exist the container will be marked unhealthy — see the DevOps handoff, which
# requires app/api/health/route.ts from the Full-Stack Engineer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail --silent --show-error http://127.0.0.1:3000/api/health || exit 1

# standalone output emits its own minimal server at ./server.js.
CMD ["node", "server.js"]
