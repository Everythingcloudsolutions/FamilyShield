###############################################################################
# Module: oci-compartments
# Creates and manages FamilyShield compartments for each environment
# Simplified: No data source query (was hanging). Just create directly.
# Terraform state manages idempotency.
###############################################################################

# Create compartment directly (state file prevents duplicates)
resource "oci_identity_compartment" "familyshield" {
  compartment_id = var.tenancy_ocid
  name           = "familyshield-${var.environment}"
  description    = var.compartment_description
  enable_delete  = false # Protect from accidental deletion
  freeform_tags  = var.tags
}

# Output the compartment ID (always the created one since no data source)
locals {
  compartment_id = oci_identity_compartment.familyshield.id
}


