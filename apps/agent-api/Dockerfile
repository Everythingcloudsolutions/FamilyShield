# FamilyShield Agent API — Docker Image
# =======================================
# Runs the Claude Agent SDK CLI for managing the enrichment pipeline.
#
# Note: This container requires ANTHROPIC_API_KEY and access to the API
# source directory. It is primarily intended for developer use, not
# continuous operation.
#
# Author: FamilyShield / Everythingcloudsolutions
# Year:   2026

FROM node:20-alpine AS base

WORKDIR /app

# -- Dependencies
FROM base AS deps

COPY package.json ./
RUN npm install --frozen-lockfile

# -- Builder
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# -- Production image
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="FamilyShield Agent API"
LABEL org.opencontainers.image.description="Claude Agent SDK CLI for FamilyShield enrichment pipeline management"
LABEL org.opencontainers.image.source="https://github.com/Everythingcloudsolutions/FamilyShield"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.created="2026"

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile

COPY --from=builder /app/dist ./dist

# The agent needs access to the API source code to read enrichers.
# Mount the api/src directory at runtime:
#   docker run -v /path/to/apps/api/src:/api-src familyshield-agent-api review-logs

# Environment variables -- set at runtime, never baked in
# Required: ANTHROPIC_API_KEY
# Optional: SUPABASE_URL, SUPABASE_SERVICE_KEY, REDIS_URL, GROQ_API_KEY

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]
