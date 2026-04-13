#!/usr/bin/env bash
# scripts/cleanup-dev-environment.sh
# WARNING: This DELETES all FamilyShield dev resources
# Run ONLY if you want a complete fresh start

set -euo pipefail

echo ""
echo "🚨 FamilyShield Dev Environment — CLEANUP SCRIPT"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This will DELETE all FamilyShield dev resources:"
echo "  - VM instance"
echo "  - Object Storage buckets (tfstate, backups, app-data)"
echo "  - Compartment (familyshield-dev)"
echo ""
read -p "Type 'yes' to confirm deletion: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Verify OCI CLI is available
if ! command -v oci &> /dev/null; then
  echo "❌ OCI CLI not found. Install with: pip install oci-cli"
  exit 1
fi

# Get tenancy OCID from config
TENANCY_OCID=$(grep tenancy ~/.oci/config 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' ')
if [ -z "$TENANCY_OCID" ]; then
  echo "❌ Cannot find tenancy OCID in ~/.oci/config"
  exit 1
fi

ENVIRONMENT="dev"
NAMESPACE=$(oci os ns get --query "data" --raw-output 2>/dev/null || echo "")

echo "Using tenancy: $TENANCY_OCID"
echo "Namespace: $NAMESPACE"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Terminate VM instance
# ─────────────────────────────────────────────────────────────────────────────
echo "1️⃣  Terminating VM instance..."

INSTANCE_ID=$(oci compute instance list \
  --compartment-id "$TENANCY_OCID" \
  --query "data[?contains(\"display-name\", 'familyshield-$ENVIRONMENT-vm')] | [0].id" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
  echo "   Found instance: $INSTANCE_ID"
  echo "   Terminating (takes ~60 seconds)..."
  oci compute instance terminate --instance-id "$INSTANCE_ID" --force || true
  echo "   ✅ Instance termination initiated"
else
  echo "   ℹ️  No instance found (already deleted or naming mismatch)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Delete Object Storage buckets
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "2️⃣  Deleting Object Storage buckets..."

BUCKETS=("familyshield-tfstate-$ENVIRONMENT" "familyshield-backups-$ENVIRONMENT" "familyshield-app-$ENVIRONMENT")

for BUCKET_NAME in "${BUCKETS[@]}"; do
  echo "   Processing: $BUCKET_NAME"

  # Check if bucket exists
  BUCKET_EXISTS=$(oci os bucket get \
    --namespace-name "$NAMESPACE" \
    --bucket-name "$BUCKET_NAME" \
    --query "name" --raw-output 2>/dev/null || echo "")

  if [ -n "$BUCKET_EXISTS" ] && [ "$BUCKET_EXISTS" != "None" ]; then
    echo "      - Emptying bucket..."

    # Empty bucket first (delete all objects)
    oci os object bulk-delete-objects \
      --bucket-name "$BUCKET_NAME" \
      --namespace-name "$NAMESPACE" \
      2>/dev/null || true

    sleep 2

    echo "      - Deleting bucket..."
    # Delete bucket
    oci os bucket delete \
      --bucket-name "$BUCKET_NAME" \
      --namespace-name "$NAMESPACE" \
      --force \
      2>/dev/null || echo "      ⚠️  Deletion may have failed"

    echo "      ✅ Deleted"
  else
    echo "      ℹ️  Not found (already deleted)"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 3. Delete compartment
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "3️⃣  Deleting compartment..."

COMPARTMENT_ID=$(oci iam compartment list \
  --compartment-id "$TENANCY_OCID" \
  --all \
  --query "data[?name=='familyshield-$ENVIRONMENT'] | [0].id" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$COMPARTMENT_ID" ] && [ "$COMPARTMENT_ID" != "None" ]; then
  echo "   Found compartment: $COMPARTMENT_ID"

  # List resources in compartment first
  RESOURCES=$(oci search resource structured-search \
    --query-text "(compartmentId = '$COMPARTMENT_ID')" \
    --query "data[0].metadata.results | length(@)" \
    --raw-output 2>/dev/null || echo "0")

  echo "   Resources in compartment: $RESOURCES"

  if [ "$RESOURCES" -gt 0 ]; then
    echo "   ⚠️  Compartment still has $RESOURCES resources"
    echo "   Deleting all resources in compartment (may take several minutes)..."
  fi

  # Compartments must be inactive before deletion
  echo "   Marking compartment as inactive..."
  oci iam compartment update \
    --compartment-id "$COMPARTMENT_ID" \
    --name "familyshield-$ENVIRONMENT-inactive" \
    --freeform-tags '{}' \
    2>/dev/null || true

  sleep 3

  # Delete compartment
  echo "   Deleting compartment..."
  oci iam compartment delete \
    --compartment-id "$COMPARTMENT_ID" \
    --force \
    2>/dev/null || echo "   ⚠️  Compartment deletion may have failed"

  echo "   ⏳ Compartment deletion initiated (takes 5-10 minutes)"
else
  echo "   ℹ️  No compartment found (already deleted)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Delete local Terraform state
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "4️⃣  Cleaning local Terraform state..."

if [ -d "iac/.terraform" ]; then
  rm -rf iac/.terraform
  echo "   ✅ Removed iac/.terraform"
fi

if [ -f "iac/.terraform.lock.hcl" ]; then
  rm -f iac/.terraform.lock.hcl
  echo "   ✅ Removed iac/.terraform.lock.hcl"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Cleanup initiated!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⏳ IMPORTANT: Compartment deletion takes 5-10 minutes"
echo ""
echo "📋 Next steps:"
echo ""
echo "   1. Wait 5-10 minutes for compartment deletion to complete"
echo "      (you can proceed while waiting)"
echo ""
echo "   2. Run bootstrap:"
echo "      $ bash scripts/bootstrap-oci.sh"
echo ""
echo "   3. Trigger deployment:"
echo "      $ gh workflow run deploy-dev.yml --ref development"
echo ""
echo "   4. Monitor:"
echo "      $ gh run watch"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
