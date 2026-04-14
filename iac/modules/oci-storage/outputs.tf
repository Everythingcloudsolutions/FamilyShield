###############################################################################
# Module: oci-storage — Outputs
###############################################################################

output "state_bucket_name" {
  description = "Name of the single Terraform state bucket (shared across all environments via prefixes)"
  value       = oci_objectstorage_bucket.tfstate.name
}

output "state_bucket_url" {
  description = "Full URL to the Terraform state bucket"
  value       = "https://${var.namespace}.compat.objectstorage.ca-toronto-1.oraclecloud.com/${oci_objectstorage_bucket.tfstate.name}"
}
