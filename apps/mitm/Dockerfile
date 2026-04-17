# FamilyShield mitmproxy addon
# Base: official mitmproxy image (ARM64 compatible)
FROM mitmproxy/mitmproxy:latest

# Install Python dependencies for the addon
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy addon code
WORKDIR /addon
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q -O - http://localhost:8080/ || exit 1

# Run mitmproxy in transparent mode with our addon
# --web-port 8080  = web UI (mapped to host:8888 via docker-compose)
# --listen-port 8081 = proxy port (mapped to host:8889 via docker-compose)
# These must be different ports — mitmweb defaults both to 8080 which causes EADDRINUSE.
CMD ["mitmweb", \
  "--mode", "transparent", \
  "--web-host", "0.0.0.0", \
  "--web-port", "8080", \
  "--listen-port", "8081", \
  "--scripts", "/addon/familyshield_addon.py"]
