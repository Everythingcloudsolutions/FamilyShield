# FamilyShield agent-mitm
# Multi-stage build — ARM64 compatible (OCI Always Free VM)
#
# Author: FamilyShield / Everythingcloudsolutions
# Year:   2026

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install openssh-client for SSH key operations (agent SSHes to OCI VM)
RUN apk add --no-cache openssh-client

WORKDIR /app

# Copy compiled output and production dependencies only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Non-root user for security
RUN addgroup -S familyshield && adduser -S agent -G familyshield
USER agent

# Environment variables (set at runtime via docker run -e or docker-compose)
# ANTHROPIC_API_KEY  -- required
# OCI_VM_HOST        -- required
# OCI_VM_USER        -- required
# OCI_SSH_KEY_PATH   -- required (mount the key as a volume)
# MITMPROXY_CONTAINER -- optional, default: familyshield-mitmproxy

# Default: print usage
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]
