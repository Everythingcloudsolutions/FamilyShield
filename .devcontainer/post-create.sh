#!/bin/bash
set -e

echo "🛡️  FamilyShield — Dev Container Post-Create Setup"
echo "=================================================="

# Install OpenTofu (Terraform-compatible IaC)
echo "→ Installing OpenTofu..."
curl -fsSL https://get.opentofu.org/install-opentofu.sh | bash -s -- --install-method standalone
tofu version

# Install OCI CLI
echo "→ Installing OCI CLI..."
bash -c "$(curl -fsSL https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" \
  -- --accept-all-defaults --no-tty
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/bin:$PATH"
oci --version

# Install Node.js deps for portal and API
echo "→ Installing portal dependencies..."
if [ -f "apps/portal/package.json" ]; then
  cd apps/portal && npm install && cd ../..
fi

echo "→ Installing API dependencies..."
if [ -f "apps/api/package.json" ]; then
  cd apps/api && npm install && cd ../..
fi

# Install Python deps for mitmproxy addon
echo "→ Installing mitmproxy addon dependencies..."
if [ -f "apps/mitm/requirements.txt" ]; then
  pip install -r apps/mitm/requirements.txt
fi

# Install global tools
echo "→ Installing global tools..."
npm install -g pnpm tsx dotenv-cli

# Verify Docker
echo "→ Verifying Docker..."
docker --version

# Set up git config reminder
echo ""
echo "✅ Dev container ready!"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/bootstrap-oci.sh   (first time OCI setup)"
echo "  2. Run: ./scripts/dev-start.sh        (start local services)"
echo "  3. See: docs/developer-guide/README.md"
