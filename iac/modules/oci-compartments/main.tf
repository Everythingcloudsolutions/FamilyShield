###############################################################################
# Module: oci-compartments
# Creates the FamilyShield compartment for a given environment
###############################################################################

resource "oci_identity_compartment" "familyshield" {
  compartment_id = var.tenancy_ocid
  name           = "familyshield-${var.environment}"
  description    = var.compartment_description
  enable_delete  = true

  freeform_tags = var.tags
}

# IAM Policy — allow GitHub Actions dynamic group to manage resources in this compartment
resource "oci_identity_policy" "github_actions" {
  compartment_id = var.tenancy_ocid
  name           = "familyshield-${var.environment}-github-actions-policy"
  description    = "Allows GitHub Actions OIDC identity to manage FamilyShield ${var.environment} resources"

  statements = [
    "Allow dynamic-group familyshield-github-actions to manage all-resources in compartment familyshield-${var.environment}",
    "Allow dynamic-group familyshield-github-actions to read objectstorage-namespaces in tenancy",
  ]

  freeform_tags = var.tags
}
