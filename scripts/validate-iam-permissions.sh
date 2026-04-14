#!/bin/bash
# validate-iam-permissions.sh — Validate OCI IAM permissions before IaC deployment
# Usage: export OCI_TENANCY_OCID=ocid1.tenancy.oc1... && bash scripts/validate-iam-permissions.sh

set -e

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

test_permission() {
  local name="$1"
  local cmd="$2"
  local timeout_sec="${3:-30}"

  printf "  %-55s " "$name"

  if output=$(timeout "$timeout_sec" bash -c "$cmd" 2>&1); then
    echo "✓"
    ((PASS++))
  else
    echo "✗"
    error_line=$(echo "$output" | head -1 | cut -c1-70)
    echo "      Error: $error_line"
    ((FAIL++))
  fi
}

echo "Identity & Access Management:"
test_permission "List compartments" "oci iam compartment list --all > /dev/null"
test_permission "List policies" "oci iam policy list --compartment-id '$TENANCY' > /dev/null"

echo ""
echo "Compute (VMs):"
test_permission "List availability domains" "oci compute availability-domain list --compartment-id '$TENANCY' > /dev/null"
test_permission "List images" "oci compute image list --compartment-id '$TENANCY' --query 'data | length(@)' --raw-output > /dev/null"
test_permission "List shapes" "oci compute shape list --compartment-id '$TENANCY' > /dev/null"

echo ""
echo "Networking (VCN, Subnets, Security):"
test_permission "List VCNs" "oci network vcn list --compartment-id '$TENANCY' > /dev/null"
test_permission "List subnets" "oci network subnet list --compartment-id '$TENANCY' > /dev/null"
test_permission "List security lists" "oci network security-list list --compartment-id '$TENANCY' > /dev/null"
test_permission "List internet gateways" "oci network internet-gateway list --compartment-id '$TENANCY' > /dev/null"
test_permission "List network security groups" "oci network nsg list --compartment-id '$TENANCY' > /dev/null"

echo ""
echo "Storage (Buckets for Terraform state):"
test_permission "List buckets" "oci os bucket list --compartment-id '$TENANCY' > /dev/null"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Result: ✓ $PASS passed  ✗ $FAIL failed  (Total: $((PASS + FAIL)))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✓ All permissions validated. Ready to deploy."
  exit 0
else
  echo "✗ Missing permissions detected. Cannot proceed."
  echo ""
  echo "To fix:"
  echo "  1. Run: bash scripts/bootstrap-oci.sh"
  echo "  2. Verify GitHub Actions user is in Administrators group"
  echo "  3. Check OCI Console → Identity → Policies"
  echo ""
  exit 1
fi
