###############################################################################
# Module: oci-storage — Outputs
###############################################################################

output "state_bucket_name" {
  description = "Name of the Terraform state bucket"
  value       = oci_objectstorage_bucket.tfstate.name
}

output "backups_bucket_name" {
  description = "Name of the backups bucket"
  value       = oci_objectstorage_bucket.backups.name
}

output "app_bucket_name" {
  description = "Name of the app data bucket"
  value       = oci_objectstorage_bucket.app_data.name
}

output "state_bucket_url" {
  description = "Full URL to the Terraform state bucket"
  value       = "https://${var.namespace}.compat.objectstorage.ca-toronto-1.oraclecloud.com/${oci_objectstorage_bucket.tfstate.name}"
}
