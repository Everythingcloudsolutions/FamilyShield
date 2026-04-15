# Dockerfile for FamilyShield API Worker
# Node.js enrichment worker + Express health server
# Target: linux/arm64 (OCI Always Free ARM VM)
#
# Build strategy: npm steps run on native amd64 (fast, no QEMU).
# Final image is arm64 but contains only pure-JS artifacts — no native binaries.

# Build stage — runs on native runner arch (amd64), compiles TypeScript
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Prod-deps stage — installs production-only packages on native amd64
# (all deps are pure JS — no native binaries, safe to run on any arch)
FROM --platform=$BUILDPLATFORM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Runtime stage — arm64 image, no npm install needed
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy only JS artifacts — no QEMU npm install
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
