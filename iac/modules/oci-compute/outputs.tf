###############################################################################
# Module: oci-compute — Outputs
###############################################################################

output "instance_id" {
  description = "OCID of the FamilyShield VM instance"
  value       = oci_core_instance.familyshield.id
}

output "availability_domain" {
  description = "Availability domain of the FamilyShield VM — must match data volume AD"
  value       = oci_core_instance.familyshield.availability_domain
}

output "public_ip" {
  description = "Public IP of the FamilyShield VM"
  value       = oci_core_instance.familyshield.public_ip
}

output "private_ip" {
  description = "Private IP of the FamilyShield VM"
  value       = oci_core_instance.familyshield.private_ip
}
