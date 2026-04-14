#!/usr/bin/env bash
# scripts/bootstrap-oci.sh
# ─────────────────────────────────────────────────────────────────────────────
# FamilyShield — First-Time OCI Setup Script
# Run this ONCE from your local machine or OCI Cloud Shell
# before running any OpenTofu commands
#
# Prerequisites:
#   - OCI account at oracle.com/cloud/free (Toronto region)
#   - OCI CLI installed: pip install oci-cli
#   - OpenTofu installed: https://opentofu.org/docs/intro/install/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo ""
echo "🛡️  FamilyShield — OCI Bootstrap"
echo "================================="
echo "Region: ca-toronto-1 (Toronto, Canada)"
echo ""

# ── Step 1: Verify OCI CLI configured ────────────────────────────────────────
echo "STEP 1 — Verify OCI CLI setup"
echo "------------------------------"
echo "If you haven't configured OCI CLI yet, run: oci setup config"
echo "You'll need: Tenancy OCID, User OCID, Region (ca-toronto-1)"
echo ""

if ! oci iam region list &>/dev/null; then
  echo "❌ OCI CLI not configured. Run: oci setup config"
  exit 1
fi

TENANCY_OCID=$(oci iam compartment list --all --query "data[?name=='root'] | [0].id" --raw-output 2>/dev/null || echo "")
if [ -z "$TENANCY_OCID" ]; then
  TENANCY_OCID=$(grep tenancy ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')
fi

echo "✅ OCI CLI configured"
echo "   Tenancy OCID: $TENANCY_OCID"
echo ""

# ── Step 2: Cloud Guard (optional) ──────────────────────────────────────────
echo "STEP 2 — Cloud Guard Setup (Optional)"
echo "-------------------------------------"
echo "Cloud Guard provides continuous security monitoring."
echo "If enabled, prerequisites may apply (check Console first)."
echo ""
read -p "Enable Cloud Guard now? (y/n, default: n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Go to: https://cloud.oracle.com/security/cloud-guard"
  echo "Click: Enable Cloud Guard"
  echo "Reporting region: Canada Southeast (ca-toronto-1)"
  read -p "Press Enter once Cloud Guard is enabled..."
else
  echo "⚠️  Skipping Cloud Guard. You can enable it manually later in OCI Console."
fi

# ── Step 3: Create GitHub Actions service user ────────────────────────────────
echo ""
echo "STEP 3 — Create GitHub Actions IAM User"
echo "----------------------------------------"

GH_USER_NAME="familyshield-github-actions"

# OCI requires an email for all IAM users
read -p "Enter your email address for the GitHub Actions service account: " GH_USER_EMAIL

echo "Creating IAM user: $GH_USER_NAME"

# Try to get existing user first
GH_USER_OCID=$(oci iam user list --all --query "data[?name=='$GH_USER_NAME'] | [0].id" --raw-output 2>/dev/null || echo "")

# If not found, create it
if [ -z "$GH_USER_OCID" ] || [ "$GH_USER_OCID" = "None" ]; then
  GH_USER_OCID=$(oci iam user create \
    --name "$GH_USER_NAME" \
    --email "$GH_USER_EMAIL" \
    --description "FamilyShield GitHub Actions service user - do not use interactively" \
    --query "data.id" \
    --raw-output)
  echo "   Created new user"
else
  echo "   User already exists (email not updated)"
fi

if [ -z "$GH_USER_OCID" ] || [ "$GH_USER_OCID" = "None" ]; then
  echo "❌ Failed to create or retrieve GitHub Actions user"
  exit 1
fi

echo "✅ GitHub Actions user OCID: $GH_USER_OCID"

# ── Step 4: Create API key for GitHub Actions user ───────────────────────────
echo ""
echo "STEP 4 — Generate API Key for GitHub Actions"
echo "---------------------------------------------"

KEY_DIR="$HOME/.oci/familyshield-github"
mkdir -p "$KEY_DIR"

# Generate RSA key pair
openssl genrsa -out "$KEY_DIR/private.pem" 2048
openssl rsa -in "$KEY_DIR/private.pem" -pubout -out "$KEY_DIR/public.pem"
chmod 600 "$KEY_DIR/private.pem"

echo "✅ API key pair generated:"
echo "   Private: $KEY_DIR/private.pem  ← goes into GitHub Secret: OCI_PRIVATE_KEY"
echo "   Public:  $KEY_DIR/public.pem   ← upload to OCI"

# Upload public key to OCI
FINGERPRINT=$(oci iam user api-key upload \
  --user-id "$GH_USER_OCID" \
  --key-file "$KEY_DIR/public.pem" \
  --query "data.fingerprint" \
  --raw-output)

echo "✅ Public key uploaded to OCI"
echo "   Fingerprint: $FINGERPRINT  ← GitHub Secret: OCI_FINGERPRINT"

# ── Step 5: Create Dynamic Group for GitHub Actions ──────────────────────────
echo ""
echo "STEP 5 — Create Dynamic Group"
echo "------------------------------"

oci iam dynamic-group create \
  --name "familyshield-github-actions" \
  --description "FamilyShield GitHub Actions OIDC identities" \
  --matching-rule "Any {request.user.id = '$GH_USER_OCID'}" \
  2>/dev/null || echo "Dynamic group already exists"

echo "✅ Dynamic group created"

# ── Step 6: Grant Bootstrap IAM Policy ──────────────────────────────────────
echo ""
echo "STEP 6 — Grant Bootstrap IAM Policy"
echo "-------------------------------------"

BOOTSTRAP_POLICY_NAME="familyshield-bootstrap-policy"

EXISTING_POLICY=$(oci iam policy list \
  --compartment-id "$TENANCY_OCID" \
  --all \
  --query "data[?name=='$BOOTSTRAP_POLICY_NAME'] | [0].id" \
  --raw-output 2>/dev/null || echo "")

if [ -z "$EXISTING_POLICY" ] || [ "$EXISTING_POLICY" = "None" ]; then
  oci iam policy create \
    --compartment-id "$TENANCY_OCID" \
    --name "$BOOTSTRAP_POLICY_NAME" \
    --description "FamilyShield GitHub Actions bootstrap permissions" \
    --statements "[\"Allow any-user to manage all-resources in tenancy where request.user.id = '$GH_USER_OCID'\"]"
  echo "✅ Bootstrap IAM policy created: $BOOTSTRAP_POLICY_NAME"
else
  echo "✅ Bootstrap policy already exists: $BOOTSTRAP_POLICY_NAME"
fi

# ── Step 7: Create Environment Compartments ────────────────────────────────────
echo ""
echo "STEP 7 — Create Environment Compartments (dev, staging, prod)"
echo "--------------------------------------------------------------"

for ENVIRONMENT in dev staging prod; do
  COMPARTMENT_NAME="familyshield-${ENVIRONMENT}"

  # Check if compartment already exists
  COMPARTMENT_ID=$(oci iam compartment list \
    --compartment-id "$TENANCY_OCID" \
    --all \
    --query "data[?name=='$COMPARTMENT_NAME'] | [0].id" \
    --raw-output 2>/dev/null || echo "")

  if [ -z "$COMPARTMENT_ID" ] || [ "$COMPARTMENT_ID" = "None" ]; then
    # Create new compartment
    COMPARTMENT_ID=$(oci iam compartment create \
      --compartment-id "$TENANCY_OCID" \
      --name "$COMPARTMENT_NAME" \
      --description "FamilyShield ${ENVIRONMENT} environment resources" \
      --query "data.id" \
      --raw-output)
    echo "   ✅ Created compartment: $COMPARTMENT_NAME ($COMPARTMENT_ID)"
  else
    echo "   ✅ Compartment exists: $COMPARTMENT_NAME ($COMPARTMENT_ID)"
  fi
done

echo "✅ Environment compartments ready"

# ── Step 8: Bootstrap Terraform State Bucket ─────────────────────────────────
echo ""
echo "STEP 8 — Bootstrap Terraform State Bucket"
echo "------------------------------------------"

NAMESPACE=$(oci os ns get --query "data" --raw-output)
BUCKET_NAME="familyshield-tfstate"

oci os bucket create \
  --compartment-id "$TENANCY_OCID" \
  --name "$BUCKET_NAME" \
  --versioning Enabled \
  2>/dev/null || echo "State bucket already exists"

echo "✅ Terraform state bucket: $BUCKET_NAME"
echo "   Namespace: $NAMESPACE"

# ── Step 8: Find ARM image OCID ──────────────────────────────────────────────
echo ""
echo "STEP 9 — Find OCI ARM Ubuntu Image OCID"
echo "----------------------------------------"

ARM_IMAGE=$(oci compute image list \
  --compartment-id "$TENANCY_OCID" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query "data[0].id" \
  --raw-output 2>/dev/null || echo "NOT_FOUND")

echo "✅ Ubuntu 22.04 ARM image OCID: $ARM_IMAGE"
echo "   → (No action needed — IaC queries this automatically)"

# ── Step 9: Generate SSH key for VM access ───────────────────────────────────
echo ""
echo "STEP 10 — Generate SSH Key for OCI VM"
echo "--------------------------------------"

SSH_KEY_PATH="$HOME/.ssh/familyshield"
if [ ! -f "$SSH_KEY_PATH" ]; then
  ssh-keygen -t ed25519 -C "familyshield-vm" -f "$SSH_KEY_PATH" -N ""
  echo "✅ SSH key generated: $SSH_KEY_PATH"
else
  echo "✅ SSH key already exists: $SSH_KEY_PATH"
fi

PUBLIC_KEY=$(cat "$SSH_KEY_PATH.pub")

# ── Step 11: Summary ────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo " FamilyShield OCI Bootstrap Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Add these as GitHub Repository Secrets:"
echo "(Settings → Secrets and variables → Actions → New secret)"
echo ""
echo "  OCI_TENANCY_OCID    = $TENANCY_OCID"
echo "  OCI_USER_OCID       = $GH_USER_OCID"
echo "  OCI_FINGERPRINT     = $FINGERPRINT"
echo "  OCI_NAMESPACE       = $NAMESPACE"
echo "  OCI_SSH_PUBLIC_KEY  = $PUBLIC_KEY"
echo ""
echo "  OCI_PRIVATE_KEY     = (contents of $KEY_DIR/private.pem)"
echo "  OCI_SSH_PRIVATE_KEY = (contents of $SSH_KEY_PATH)"
echo ""
echo "  CLOUDFLARE_API_TOKEN   = (from Cloudflare dashboard)"
echo "  CLOUDFLARE_ZONE_ID     = (from Cloudflare dashboard → everythingcloud.ca)"
echo "  CLOUDFLARE_ACCOUNT_ID  = (from Cloudflare dashboard)"
echo ""
echo "  ADGUARD_ADMIN_PASSWORD = (choose a strong password)"
echo "  SUPABASE_URL           = (from Supabase → Settings → API)"
echo "  SUPABASE_ANON_KEY      = (from Supabase → Settings → API → Service Role Key)"
echo "  GROQ_API_KEY           = (from console.groq.com)"
echo "  ANTHROPIC_API_KEY      = (from console.anthropic.com)"
echo ""
echo "⚠️  Supabase note: Use the Service Role Key (not deprecated anon public key)"
echo ""
echo "📝 Image OCID (Step 9): $ARM_IMAGE"
echo "   → No action needed — IaC queries the image automatically by region and shape"
echo ""
echo "VS Code Remote SSH — add to ~/.ssh/config on your Windows laptop:"
echo ""
echo "  Host familyshield-dev"
echo "    HostName       <VM_IP_from_tofu_output>"
echo "    User           ubuntu"
echo "    IdentityFile   ~/.ssh/familyshield"
echo "    ServerAliveInterval 60"
echo ""
echo "Then: Ctrl+Shift+P → Remote-SSH: Connect to Host → familyshield-dev"
echo ""
