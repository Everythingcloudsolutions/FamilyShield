# FamilyShield Hybrid Rebuild Plan

**Objective:** Fresh start + phased IaC migration  
**Timeline:** Phase 1 (today) → Phase 2-3 (this week)

---

## Phase 1: Fresh Start (1-2 hours) — Execute NOW

### Step 1.1: Cleanup Existing OCI Resources

**Run this from your local machine** (requires OCI CLI with tenancy admin access):

```bash
#!/usr/bin/env bash
# scripts/cleanup-dev-environment.sh
# WARNING: This DELETES all FamilyShield dev resources
# Run ONLY if you want a complete fresh start

set -euo pipefail

echo "⚠️  WARNING: This will DELETE all FamilyShield dev resources!"
read -p "Type 'yes' to confirm: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

TENANCY_OCID=$(grep tenancy ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')
ENVIRONMENT="dev"

echo "Using tenancy: $TENANCY_OCID"
echo ""

# 1. Terminate VM instance
echo "1️⃣  Terminating VM instance..."
INSTANCE_ID=$(oci compute instance list \
  --compartment-id "$TENANCY_OCID" \
  --query "data[?contains(\"display-name\", 'familyshield-$ENVIRONMENT')] | [0].id" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
  oci compute instance terminate --instance-id "$INSTANCE_ID" --force || true
  echo "   ✅ Instance termination initiated (takes ~60 seconds)"
  sleep 10
else
  echo "   ℹ️  No instance found"
fi

# 2. Delete Object Storage buckets
echo ""
echo "2️⃣  Deleting Object Storage buckets..."
NAMESPACE=$(oci os ns get --query "data" --raw-output)

for BUCKET_NAME in "familyshield-tfstate-$ENVIRONMENT" "familyshield-backups-$ENVIRONMENT" "familyshield-app-$ENVIRONMENT"; do
  echo "   Cleaning bucket: $BUCKET_NAME"
  
  # Empty bucket first (delete all objects)
  oci os object bulk-delete-objects \
    --bucket-name "$BUCKET_NAME" \
    --namespace-name "$NAMESPACE" \
    2>/dev/null || true
  
  # Delete bucket
  oci os bucket delete \
    --bucket-name "$BUCKET_NAME" \
    --namespace-name "$NAMESPACE" \
    --force \
    2>/dev/null || echo "   ⚠️  Bucket deletion may have failed (may not exist)"
done

echo "   ✅ Buckets deleted"

# 3. Delete compartment
echo ""
echo "3️⃣  Deleting compartment..."
COMPARTMENT_ID=$(oci iam compartment list \
  --compartment-id "$TENANCY_OCID" \
  --query "data[?name=='familyshield-$ENVIRONMENT'] | [0].id" \
  --raw-output 2>/dev/null || echo "")

if [ -n "$COMPARTMENT_ID" ] && [ "$COMPARTMENT_ID" != "None" ]; then
  # Compartments must be inactive before deletion
  oci iam compartment update \
    --compartment-id "$COMPARTMENT_ID" \
    --name "familyshield-$ENVIRONMENT-inactive" \
    2>/dev/null || true
  
  # Delete compartment
  oci iam compartment delete \
    --compartment-id "$COMPARTMENT_ID" \
    2>/dev/null || echo "   ⚠️  Compartment deletion may have failed"
  
  echo "   ✅ Compartment deletion initiated (may take 5-10 minutes to finalize)"
else
  echo "   ℹ️  No compartment found"
fi

# 4. Delete old Terraform state
echo ""
echo "4️⃣  Removing local Terraform state..."
rm -rf iac/.terraform
rm -f iac/.terraform.lock.hcl
echo "   ✅ Local state cleaned"

echo ""
echo "════════════════════════════════════════════════"
echo "Cleanup complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "⏳ OCI compartment deletion may take 5-10 minutes"
echo "    (you can proceed while waiting)"
echo ""
echo "Next: Run bootstrap-oci.sh to verify fresh setup works"
```

**Execute it:**

```bash
bash scripts/cleanup-dev-environment.sh
```

---

### Step 1.2: Re-run Bootstrap (Verify It Works)

```bash
# This is your source of truth for setting up dev environment
bash scripts/bootstrap-oci.sh

# Should output:
# ✅ OCI CLI configured
# ✅ GitHub Actions user OCID: ocid1.user.oc1...
# ✅ Bootstrap IAM policy created: familyshield-bootstrap-policy
# ✅ Terraform state bucket: familyshield-tfstate
# ✅ Dynamic group created
```

**CRITICAL VERIFICATION:** Ensure you see `✅ Bootstrap IAM policy created`  
If you see `✅ Bootstrap policy already exists`, verify manually:

```bash
# Verify policy exists and has correct statement
oci iam policy list \
  --compartment-id $(grep tenancy ~/.oci/config | cut -d= -f2 | tr -d ' ') \
  --query "data[?name=='familyshield-bootstrap-policy'] | [0]" \
  --all

# Should show: "Allow any-user to manage all-resources in tenancy where request.user.id = 'ocid1.user.oc1...'"
```

---

### Step 1.3: Verify GitHub Secrets Are Correct

```bash
# Test OCI login with GitHub Actions credentials
oci iam region list \
  --config-file ~/.oci/config \
  --profile DEFAULT \
  --output table | head -5

# Should output region list without errors
```

If authentication fails:

```bash
# Re-check GitHub secrets in: Settings → Secrets and variables → Actions
# Must have:
# - OCI_TENANCY_OCID
# - OCI_USER_OCID
# - OCI_FINGERPRINT
# - OCI_PRIVATE_KEY (full PEM content)
# - OCI_NAMESPACE
# - OCI_SSH_PUBLIC_KEY
```

---

### Step 1.4: Trigger Deploy-Dev Workflow

```bash
# Commit cleanup scripts first
git add scripts/cleanup-dev-environment.sh
git commit -m "chore: add OCI cleanup script for fresh starts"
git push origin development

# Trigger deploy workflow
gh workflow run deploy-dev.yml --ref development

# Monitor in real-time
gh run watch $(gh run list --workflow deploy-dev.yml --limit 1 --json number -q)
```

**Expected outcomes:**

- ✅ OCI Login succeeds
- ✅ Create compartment and IAM policy step succeeds
- ✅ Apply IaC → dev succeeds
- ✅ Build & Push Docker images succeeds
- ✅ App deploy → dev VM succeeds
- ✅ Smoke test succeeds

---

## Phase 2: Workflow Bootstrap (2-3 hours) — Tomorrow

Once Phase 1 is green, create workflow that automates bootstrap:

```yaml
# .github/workflows/bootstrap-dev.yml
name: Bootstrap → Dev Environment

on:
  workflow_dispatch:  # Manual trigger only

jobs:
  bootstrap:
    name: "OCI Bootstrap"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: OCI Login
        uses: ./.github/actions/oci-login
        with:
          oci_tenancy_ocid: ${{ secrets.OCI_TENANCY_OCID }}
          oci_user_ocid: ${{ secrets.OCI_USER_OCID }}
          oci_fingerprint: ${{ secrets.OCI_FINGERPRINT }}
          oci_private_key: ${{ secrets.OCI_PRIVATE_KEY }}

      - name: Run Bootstrap Script
        shell: bash
        env:
          OCI_TENANCY_OCID: ${{ secrets.OCI_TENANCY_OCID }}
        run: |
          # Extract bootstrap steps from scripts/bootstrap-oci.sh
          # Run them with --non-interactive flag
          bash scripts/bootstrap-oci.sh

      - name: Verify Bootstrap Success
        shell: bash
        env:
          OCI_TENANCY_OCID: ${{ secrets.OCI_TENANCY_OCID }}
          OCI_USER_OCID: ${{ secrets.OCI_USER_OCID }}
        run: |
          echo "📋 Verifying bootstrap results..."
          
          # 1. Verify policy exists
          POLICY=$(oci iam policy list \
            --compartment-id "$OCI_TENANCY_OCID" \
            --query "data[?name=='familyshield-bootstrap-policy']" --all)
          
          if [ -z "$POLICY" ] || [ "$POLICY" == "[]" ]; then
            echo "❌ Bootstrap policy not found!"
            exit 1
          fi
          echo "✅ Bootstrap policy verified"
          
          # 2. Verify dynamic group exists
          DG=$(oci iam dynamic-group list \
            --query "data[?name=='familyshield-github-actions']" --all)
          
          if [ -z "$DG" ] || [ "$DG" == "[]" ]; then
            echo "❌ Dynamic group not found!"
            exit 1
          fi
          echo "✅ Dynamic group verified"
          
          # 3. Verify state bucket exists
          BUCKET=$(oci os bucket get --bucket-name "familyshield-tfstate" 2>/dev/null || echo "")
          if [ -z "$BUCKET" ]; then
            echo "❌ State bucket not found!"
            exit 1
          fi
          echo "✅ State bucket verified"
          
          echo ""
          echo "✅ Bootstrap verification passed!"
```

---

## Phase 3: IaC Migration (3-4 hours) — This Week

Move compartment & policy creation FROM bootstrap INTO Terraform:

### 3.1 Create Compartment Resource (NEW)

```hcl
# iac/modules/oci-compartments/main.tf (MODIFIED)

# CHANGE: From data source to resource
resource "oci_identity_compartment" "familyshield" {
  compartment_id = var.tenancy_ocid
  name           = "familyshield-${var.environment}"
  description    = "FamilyShield ${var.environment} environment"
  
  freeform_tags = var.tags
}

# Create bootstrap policy to allow GitHub Actions to manage resources
resource "oci_identity_policy" "bootstrap" {
  compartment_id = var.tenancy_ocid
  name           = "familyshield-bootstrap-policy-${var.environment}"
  description    = "Allows GitHub Actions to manage all resources"
  
  statements = [
    "Allow any-user to manage all-resources in tenancy where request.user.id = '${var.github_actions_user_ocid}'"
  ]
}

output "compartment_id" {
  value       = oci_identity_compartment.familyshield.id
  description = "Compartment ID for environment"
}
```

### 3.2 Update Variables

```hcl
# iac/variables.tf (ADD)

variable "github_actions_user_ocid" {
  description = "OCI User OCID for GitHub Actions"
  type        = string
  default     = ""  # Pass via TF_VAR_github_actions_user_ocid
}
```

### 3.3 Pass Into Workflow

```yaml
# .github/workflows/deploy-dev.yml (UPDATED)

- name: Apply IaC → dev
  uses: ./.github/actions/tofu-apply
  with:
    environment: dev
    working_directory: iac
    var_file: environments/dev/terraform.tfvars
  env:
    TF_VAR_github_actions_user_ocid: ${{ secrets.OCI_USER_OCID }}
    # ... rest of vars
```

### 3.4 Result

Now bootstrap is **fully automated**:

```
tofu apply automatically:
  ✅ Creates compartment
  ✅ Creates policy
  ✅ Creates networking
  ✅ Creates compute
  (NO manual bootstrap-oci.sh needed*)

* bootstrap-oci.sh still needed ONCE to generate API keys, but not for resource creation
```

---

## Timeline & Checkpoints

```
TODAY (Phase 1):
  10:00 - Run cleanup script
  10:15 - Wait for compartment deletion (~5 min)
  10:20 - Run bootstrap-oci.sh
  10:30 - Trigger deploy-dev workflow
  11:00 - CHECKPOINT: Deploy succeeds ✅ or diagnose failure
  
TOMORROW (Phase 2):
  - Create bootstrap-dev.yml workflow
  - Add verification steps
  - Test manual bootstrap trigger
  
THIS WEEK (Phase 3):
  - Move compartment/policy into Terraform
  - Remove bootstrap dependency
  - Production-ready IaC
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Fresh start fails (OCI permission issue) | Phase 1 diagnostics reveal root cause; can escalate with logs |
| Compartment deletion takes >10 min | Proceed with Phase 1.2 while deletion completes in background |
| Bootstrap-oci.sh still fails | Add verbose logging; check OCI console for policy creation manually |
| Workflow uses old code | Push code to `development` branch before triggering |

---

## Success Criteria

**Phase 1 (Fresh Start):**

```
✅ Deploy-dev workflow runs to completion
✅ No 404-NotAuthorizedOrNotFound errors
✅ No 409-BucketAlreadyExists conflicts
✅ VM instance created and healthy
✅ Smoke tests pass
```

**Phase 2 (Workflow Bootstrap):**

```
✅ bootstrap-dev.yml workflow can be triggered manually
✅ Verification step confirms all resources exist
✅ deploy-dev.yml can run independently without manual bootstrap
```

**Phase 3 (IaC Migration):**

```
✅ Compartment created by Terraform resource (not bootstrap)
✅ Policy created by Terraform resource
✅ tofu destroy && tofu apply succeeds (full idempotency)
✅ No manual setup steps remain (except API key generation locally)
```

---

## Next Action

**Execute Phase 1 NOW:**

```bash
# 1. Cleanup
bash scripts/cleanup-dev-environment.sh

# 2. Verify cleanup in OCI console (wait 5-10 min for compartment deletion)

# 3. Bootstrap
bash scripts/bootstrap-oci.sh

# 4. Verify secrets in GitHub (Settings → Secrets → check 6 OCI secrets)

# 5. Trigger workflow
gh workflow run deploy-dev.yml --ref development

# 6. Monitor
gh run watch
```

When Phase 1 is green, I'll help with Phase 2 & 3.

**Ready to start?** Or need clarification on any step?
