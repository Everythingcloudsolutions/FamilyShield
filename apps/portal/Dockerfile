# Dockerfile for FamilyShield Portal
# Next.js 14 parent portal
# Target: linux/arm64 (OCI Always Free ARM VM)
#
# Build strategy: npm steps run on native amd64 (fast, no QEMU).
# Next.js standalone output is pure JS — safe to run on arm64.

# Build stage — runs on native runner arch (amd64)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
# Build-time env vars for NEXT_PUBLIC_* — must be set before `next build`
# so the client-side JS bundle contains the real values (not undefined).
# These are intentionally public (Supabase anon key is browser-safe).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

# Runtime stage — arm64 image, no npm install needed
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# Non-root user — created before COPY so --chown works
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy Next.js standalone output with correct ownership so nodejs user can write cache
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
