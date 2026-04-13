###############################################################################
# Module: oci-compartments
# Creates and manages FamilyShield compartments for each environment
###############################################################################

# Data source to query the existing compartment
data "oci_identity_compartments" "familyshield" {
  compartment_id = var.tenancy_ocid
  filter {
    name   = "name"
    values = ["familyshield-${var.environment}"]
  }
}

# Create compartment if it doesn't exist
resource "oci_identity_compartment" "familyshield" {
  count          = length(data.oci_identity_compartments.familyshield.compartments) == 0 ? 1 : 0
  compartment_id = var.tenancy_ocid
  name           = "familyshield-${var.environment}"
  description    = var.compartment_description
  enable_delete  = false # Protect from accidental deletion
  freeform_tags  = var.tags
}

# Local to get the compartment OCID (either existing or newly created)
locals {
  compartment_id = (
    length(data.oci_identity_compartments.familyshield.compartments) > 0
    ? data.oci_identity_compartments.familyshield.compartments[0].id
    : (
      length(oci_identity_compartment.familyshield) > 0
      ? oci_identity_compartment.familyshield[0].id
      : ""
    )
  )
}

