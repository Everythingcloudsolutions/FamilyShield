variable "tenancy_ocid" { type = string }
variable "environment" { type = string }
variable "compartment_description" { type = string }
variable "tags" { type = map(string) }

output "compartment_id" {
  value = oci_identity_compartment.familyshield.id
}
output "compartment_name" {
  value = oci_identity_compartment.familyshield.name
}
