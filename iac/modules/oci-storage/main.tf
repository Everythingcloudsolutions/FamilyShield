###############################################################################
# Module: oci-storage
# OCI Object Storage — S3-compatible, Always Free (20GB)
# Single bucket: familyshield-tfstate with environment-specific prefixes
#   - dev/terraform.tfstate  (dev environment state)
#   - staging/terraform.tfstate (staging environment state)
#   - prod/terraform.tfstate (prod environment state)
#   - backups/  (backup storage shared across environments)
#   - app/      (application data shared across environments)
###############################################################################

resource "oci_objectstorage_bucket" "tfstate" {
  compartment_id = var.compartment_id
  namespace      = var.namespace
  name           = "familyshield-tfstate"  # Single bucket — no environment suffix
  access_type    = "NoPublicAccess"
  versioning     = "Enabled" # Protects state files from accidental deletion

  freeform_tags = var.tags
}
