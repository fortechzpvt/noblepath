# Noble Path admin — production container image (D-36).
#
# Built from the admin/ folder on its own:
#   docker build --build-arg PUBLIC_SITE_URL=https://noblepath.lk -t noble-path-admin admin/
# Run (all secrets from the platform, never baked in):
#   docker run -p 3100:3100 -e DATABASE_URL=… -e DATABASE_CA_CERT=… \
#     -e ADMIN_ENCRYPTION_KEY=… -e PUBLIC_SITE_URL=… -e SITE_DEPLOY_HOOK_URL=… noble-path-admin
#
# Serve it only over HTTPS: the session cookie is __Host- and Secure.

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Not a secret: the public site's address, used in the image CSP (img-src).
ARG PUBLIC_SITE_URL=https://noblepath.lk
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache curl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail --silent --output /dev/null http://127.0.0.1:3100/login || exit 1
CMD ["node", "server.js"]
