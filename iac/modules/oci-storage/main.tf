###############################################################################
# Module: oci-storage
# OCI Object Storage — S3-compatible, Always Free (20GB)
# Single bucket: familyshield-tfstate with environment-specific prefixes
#   - dev/terraform.tfstate  (dev environment state)
#   - staging/terraform.tfstate (staging environment state)
#   - prod/terraform.tfstate (prod environment state)
# NOTE: Bucket is created once by scripts/bootstrap-oci.sh (Step 8).
# IaC reads it as a data source — no ownership, no 409, no import needed.
###############################################################################

data "oci_objectstorage_bucket" "tfstate" {
  namespace = var.namespace
  name      = "familyshield-tfstate"
}
