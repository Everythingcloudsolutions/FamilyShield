# Dockerfile for FamilyShield API Worker
# Node.js enrichment worker + Express health server
# Target: linux/arm64 (OCI Always Free ARM VM)

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (dev needed for tsc)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built artifacts and install production-only deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose health/metrics port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the app
CMD ["node", "dist/index.js"]
