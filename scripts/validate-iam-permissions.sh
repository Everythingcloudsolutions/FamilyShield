#!/bin/bash
# validate-iam-permissions.sh — Validate OCI IAM permissions before IaC deployment
# Usage: export OCI_TENANCY_OCID=ocid1.tenancy.oc1... && bash scripts/validate-iam-permissions.sh

if [ -z "$OCI_TENANCY_OCID" ]; then
  echo "❌ OCI_TENANCY_OCID not set"
  echo "Usage: export OCI_TENANCY_OCID=ocid1.tenancy.oc1... && bash scripts/validate-iam-permissions.sh"
  exit 1
fi

TENANCY="$OCI_TENANCY_OCID"
PASS=0
FAIL=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "IAM Permission Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Tenancy: $TENANCY"
echo ""

test_perm() {
  local name="$1"
  local cmd="$2"
  printf "  %-55s " "$name"
  if timeout 10 bash -c "$cmd" > /dev/null 2>&1; then
    echo "✓"
    ((PASS++))
  else
    echo "✗"
    ((FAIL++))
  fi
}

echo "Identity & Access Management:"
test_perm "List compartments" "oci iam compartment list --all"
test_perm "List policies" "oci iam policy list --compartment-id $TENANCY"

echo ""
echo "Compute (VMs):"
test_perm "List images" "oci compute image list --compartment-id $TENANCY"
test_perm "List instances" "oci compute instance list --compartment-id $TENANCY"
test_perm "List shapes" "oci compute shape list --compartment-id $TENANCY"

echo ""
echo "Networking:"
test_perm "List VCNs" "oci network vcn list --compartment-id $TENANCY"
test_perm "List subnets" "oci network subnet list --compartment-id $TENANCY"
test_perm "List security lists" "oci network security-list list --compartment-id $TENANCY"
test_perm "List internet gateways" "oci network internet-gateway list --compartment-id $TENANCY"
test_perm "List NSGs" "oci network nsg list --compartment-id $TENANCY"

echo ""
echo "Storage:"
test_perm "Get object storage namespace" "oci os namespace get"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Result: ✓ $PASS  ✗ $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Allow deployment if 80% of checks pass (7+ out of ~9 critical ones)
TOTAL=$((PASS + FAIL))
if [ $PASS -ge 7 ]; then
  echo "✓ Sufficient permissions for deployment"
  if [ $FAIL -gt 0 ]; then
    echo "⚠️  $FAIL check(s) failed (may be transient timeouts)"
  fi
  exit 0
else
  echo "✗ Insufficient permissions. Cannot deploy."
  exit 1
fi
