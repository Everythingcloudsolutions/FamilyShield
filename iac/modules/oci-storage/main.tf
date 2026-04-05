###############################################################################
# Module: oci-storage
# OCI Object Storage — S3-compatible, Always Free (20GB)
# Used for: Terraform remote state, application backups
###############################################################################

resource "oci_objectstorage_bucket" "tfstate" {
  compartment_id = var.compartment_id
  namespace      = var.namespace
  name           = "familyshield-tfstate-${var.environment}"
  access_type    = "NoPublicAccess"
  versioning     = "Enabled" # Protects state file from accidental deletion

  freeform_tags = var.tags
}

resource "oci_objectstorage_bucket" "backups" {
  compartment_id = var.compartment_id
  namespace      = var.namespace
  name           = "familyshield-backups-${var.environment}"
  access_type    = "NoPublicAccess"
  versioning     = "Enabled"

  freeform_tags = var.tags
}

resource "oci_objectstorage_bucket" "app_data" {
  compartment_id = var.compartment_id
  namespace      = var.namespace
  name           = "familyshield-app-${var.environment}"
  access_type    = "NoPublicAccess"

  freeform_tags = var.tags
}
