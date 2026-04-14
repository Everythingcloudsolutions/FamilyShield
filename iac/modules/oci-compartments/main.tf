###############################################################################
# Module: oci-compartments
# Queries existing FamilyShield compartment (created by bootstrap-oci.sh)
# Bootstrap script Step 7 creates: familyshield-dev, familyshield-staging, familyshield-prod
# IaC queries for existing compartments and fails with clear error if not found
###############################################################################

# Data source to query the existing compartment created by bootstrap-oci.sh
data "oci_identity_compartments" "familyshield" {
  compartment_id = var.tenancy_ocid
  filter {
    name   = "name"
    values = ["familyshield-${var.environment}"]
  }
}

# Extract compartment ID with validation
locals {
  compartment_id = try(data.oci_identity_compartments.familyshield.compartments[0].id, null)

  # Validation check
  compartment_exists = local.compartment_id != null ? true : false
}

# Trigger an error if compartment not found (clear instruction to user)
resource "null_resource" "compartment_validation" {
  lifecycle {
    precondition {
      condition     = local.compartment_exists
      error_message = <<-EOT
        ❌ FamilyShield compartment 'familyshield-${var.environment}' not found in OCI.

        This compartment must be created by the bootstrap script BEFORE running tofu apply.

        FIX: Run the bootstrap script from your local machine:
          bash scripts/bootstrap-oci.sh

        This script creates three compartments:
          - familyshield-dev
          - familyshield-staging
          - familyshield-prod

        After bootstrap completes, re-run: tofu apply
      EOT
    }
  }
}


