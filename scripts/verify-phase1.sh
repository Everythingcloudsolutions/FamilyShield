#!/usr/bin/env bash
# scripts/verify-phase1.sh
# Complete verification of Phase 1 setup before deploying
# Checks: OCI credentials, GitHub secrets, bootstrap state, and workflow readiness

set -euo pipefail

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 FamilyShield Phase 1 Verification"
echo "════════════════════════════════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0

# ─────────────────────────────────────────────────────────────────────────────
# 1. Verify Local OCI Setup
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 SECTION 1: Local OCI Credentials"
echo "───────────────────────────────────────"

if ! command -v oci &> /dev/null; then
  echo "❌ OCI CLI not installed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ OCI CLI installed"
fi

if [ ! -f ~/.oci/config ]; then
  echo "❌ ~/.oci/config not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ ~/.oci/config exists"
  TENANCY=$(grep tenancy ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')
  USER_ID=$(grep "^user=" ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')
  FINGERPRINT=$(grep fingerprint ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')

  echo "   Tenancy OCID: ${TENANCY:0:40}..."
  echo "   User OCID:    ${USER_ID:0:40}..."
  echo "   Fingerprint:  ${FINGERPRINT:0:20}..."
fi

if [ ! -f ~/.oci/familyshield-github/private.pem ]; then
  echo "⚠️  ~/.oci/familyshield-github/private.pem not found"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ Private key file exists"
  KEY_HEADER=$(head -1 ~/.oci/familyshield-github/private.pem)
  KEY_FOOTER=$(tail -1 ~/.oci/familyshield-github/private.pem)
  echo "   First line: $KEY_HEADER"
  echo "   Last line:  $KEY_FOOTER"

  if [ "$KEY_HEADER" != "-----BEGIN RSA PRIVATE KEY-----" ]; then
    echo "❌ Private key header is wrong!"
    ERRORS=$((ERRORS + 1))
  fi

  if [ "$KEY_FOOTER" != "-----END RSA PRIVATE KEY-----" ]; then
    echo "❌ Private key footer is wrong!"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 2. Verify OCI Authentication Works
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 SECTION 2: OCI Authentication Test"
echo "──────────────────────────────────────"

if oci iam region list --output table &>/dev/null; then
  echo "✅ OCI authentication successful"
else
  echo "❌ OCI authentication failed"
  echo "   Try: oci setup config"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 3. Verify Bootstrap Resources Exist
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 SECTION 3: OCI Bootstrap Resources"
echo "──────────────────────────────────────"

# Check bootstrap policy
POLICY=$(oci iam policy list --compartment-id "$TENANCY" --all \
  --query "data[?name=='familyshield-bootstrap-policy'] | [0].statements[0]" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$POLICY" ] && [ "$POLICY" != "None" ]; then
  echo "✅ Bootstrap IAM policy exists"
  echo "   Statement: $POLICY"
else
  echo "❌ Bootstrap IAM policy not found or misconfigured"
  ERRORS=$((ERRORS + 1))
fi

# Check state bucket
NAMESPACE=$(oci os ns get --query "data" --raw-output 2>/dev/null)
BUCKET=$(oci os bucket get --namespace-name "$NAMESPACE" --bucket-name "familyshield-tfstate" \
  --query "name" --raw-output 2>/dev/null || echo "")

if [ -n "$BUCKET" ] && [ "$BUCKET" = "familyshield-tfstate" ]; then
  echo "✅ Terraform state bucket exists"
else
  echo "❌ Terraform state bucket not found"
  ERRORS=$((ERRORS + 1))
fi

# Check dynamic group
DG=$(oci iam dynamic-group list --all \
  --query "data[?name=='familyshield-github-actions'] | [0].name" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$DG" ] && [ "$DG" = "familyshield-github-actions" ]; then
  echo "✅ Dynamic group exists"
else
  echo "⚠️  Dynamic group not found (less critical)"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 4. Verify GitHub Secrets
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 SECTION 4: GitHub Secrets Configuration"
echo "───────────────────────────────────────────"

SECRETS=(
  "OCI_TENANCY_OCID"
  "OCI_USER_OCID"
  "OCI_FINGERPRINT"
  "OCI_PRIVATE_KEY"
  "OCI_NAMESPACE"
  "OCI_SSH_PUBLIC_KEY"
  "OCI_SSH_PRIVATE_KEY"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
)

MISSING_SECRETS=()
for SECRET in "${SECRETS[@]}"; do
  if gh secret list --json name -q | grep -q "\"$SECRET\""; then
    echo "✅ $SECRET exists"
  else
    echo "❌ $SECRET missing"
    MISSING_SECRETS+=("$SECRET")
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 5. Verify Workflow Configuration
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 SECTION 5: Workflow Configuration"
echo "─────────────────────────────────────"

if [ -f ".github/workflows/deploy-dev.yml" ]; then
  echo "✅ deploy-dev.yml workflow exists"

  # Check for OCI login step
  if grep -q "OCI Login" .github/workflows/deploy-dev.yml; then
    echo "✅ OCI Login step present"
  else
    echo "❌ OCI Login step missing"
    ERRORS=$((ERRORS + 1))
  fi

  # Check for compartment creation step
  if grep -q "Create compartment and IAM policy" .github/workflows/deploy-dev.yml; then
    echo "✅ Compartment creation step present"
  else
    echo "❌ Compartment creation step missing"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "❌ deploy-dev.yml not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 6. Summary & Recommendations
# ─────────────────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "📊 SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Errors found:   $ERRORS"
echo "Warnings found: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ Phase 1 verification PASSED"
  echo ""
  echo "🚀 You can now run the deploy-dev workflow:"
  echo "   gh workflow run deploy-dev.yml --ref development"
  echo ""
  exit 0
else
  echo "❌ Phase 1 verification FAILED"
  echo ""
  echo "📝 Issues to fix:"

  if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo "   Missing GitHub Secrets:"
    for SECRET in "${MISSING_SECRETS[@]}"; do
      echo "     - $SECRET"
    done
    echo ""
    echo "   Add them at: Settings → Secrets and variables → Actions → New secret"
  fi

  echo ""
  echo "⚠️  Check the errors above and fix them before proceeding."
  exit 1
fi
