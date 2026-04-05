# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

ARG TOFU_VERSION=1.8.3
LABEL org.opencontainers.image.title="FamilyShield IaC Agent"
LABEL org.opencontainers.image.description="Claude Agent SDK agent for OpenTofu IaC management"
LABEL org.opencontainers.image.year="2026"
LABEL org.opencontainers.image.source="https://github.com/Everythingcloudsolutions/FamilyShield"

# Install runtime deps: curl/unzip for tofu download, openssh for OCI key auth
RUN apk add --no-cache curl bash git ca-certificates unzip openssh-client

# Install OpenTofu (ARM64 + AMD64 auto-detect)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then TOFU_ARCH="arm64"; else TOFU_ARCH="amd64"; fi && \
    curl -fsSL \
      "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${TOFU_ARCH}.zip" \
      -o /tmp/tofu.zip && \
    unzip /tmp/tofu.zip -d /tmp/tofu-bin && \
    mv /tmp/tofu-bin/tofu /usr/local/bin/tofu && \
    chmod +x /usr/local/bin/tofu && \
    rm -rf /tmp/tofu.zip /tmp/tofu-bin

# Non-root user
RUN addgroup -g 1001 -S familyshield && adduser -u 1001 -S agent -G familyshield
RUN mkdir -p /app /iac && chown -R agent:familyshield /app /iac

WORKDIR /app
COPY --from=builder --chown=agent:familyshield /app/dist ./dist
COPY --from=builder --chown=agent:familyshield /app/node_modules ./node_modules
COPY --from=builder --chown=agent:familyshield /app/package.json ./package.json

USER agent

ENV NODE_ENV=production \
    ANTHROPIC_API_KEY="" \
    OCI_REGION="ca-toronto-1" \
    TF_CLI_ARGS="-no-color"

# Mount the iac/ directory at runtime: docker run -v ./iac:/iac ...
VOLUME ["/iac"]

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]
