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
CMD ["mitmweb", \
     "--mode", "transparent", \
     "--web-host", "0.0.0.0", \
     "--web-port", "8080", \
     "--scripts", "/addon/familyshield_addon.py"]
