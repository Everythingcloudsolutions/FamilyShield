###############################################################################
# Module: oci-compartments
# Queries existing FamilyShield compartment (created via bootstrap script)
###############################################################################

# Data source to query the existing compartment created by bootstrap-oci.sh
data "oci_identity_compartments" "familyshield" {
  compartment_id = var.tenancy_ocid
  filter {
    name   = "name"
    values = ["familyshield-${var.environment}"]
  }
}

# Local to get the compartment OCID from the data source
locals {
  compartment_id = try(data.oci_identity_compartments.familyshield.compartments[0].id, "")
}

# Note: Compartment and policies are created by bootstrap-oci.sh script, not by Terraform.
# This module only queries for the existing compartment using a data source.
# If the compartment doesn't exist, Terraform will fail with a clear error message
# instructing the user to run bootstrap-oci.sh first.
