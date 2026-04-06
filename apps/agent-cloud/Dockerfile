# ---------------------------------------------------------
# FamilyShield Cloud Agent -- Dockerfile
# Base: Node.js 20 LTS on Alpine (ARM64-compatible)
# Registry: ghcr.io/everythingcloudsolutions/familyshield-agent-cloud
# Year: 2026
# ---------------------------------------------------------

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssh-client for SSH connectivity to OCI VM
RUN apk add --no-cache openssh-client

# Copy manifests first to leverage Docker layer cache
COPY package.json tsconfig.json ./

# Install all deps (including devDependencies needed for tsc)
RUN npm install --frozen-lockfile

# Copy source
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# ---------------------------------------------------------
# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install openssh-client in runtime image too
RUN apk add --no-cache openssh-client

# Create non-root user
RUN addgroup -S agentcloud && adduser -S agentcloud -G agentcloud

# Copy compiled output and production dependencies only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create the reports directory with correct ownership
RUN mkdir -p /app/reports && chown -R agentcloud:agentcloud /app

USER agentcloud

# Mount your SSH key at /home/agentcloud/.ssh/familyshield
# (or override OCI_SSH_KEY_PATH via environment variable)
ENV NODE_ENV=production \
    OCI_VM_USER=ubuntu \
    OCI_SSH_KEY_PATH=/home/agentcloud/.ssh/familyshield

# The agent is a CLI tool -- no exposed ports
# Run via: docker run --rm -e ANTHROPIC_API_KEY=... -e OCI_VM_HOST=... \
#            -v ~/.ssh/familyshield:/home/agentcloud/.ssh/familyshield:ro \
#            -v ./reports:/app/reports \
#            ghcr.io/everythingcloudsolutions/familyshield-agent-cloud health-check

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]
