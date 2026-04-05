variable "compartment_id" { type = string }
variable "namespace"      { type = string }
variable "environment"    { type = string }
variable "tags"           { type = map(string) }

output "state_bucket_name"   { value = oci_objectstorage_bucket.tfstate.name }
output "backups_bucket_name" { value = oci_objectstorage_bucket.backups.name }
output "app_bucket_name"     { value = oci_objectstorage_bucket.app_data.name }
output "state_bucket_url" {
  value = "https://${var.namespace}.compat.objectstorage.ca-toronto-1.oraclecloud.com/${oci_objectstorage_bucket.tfstate.name}"
}
