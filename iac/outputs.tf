###############################################################################
# FamilyShield — Root Outputs
###############################################################################

output "vm_public_ip" {
  description = "Public IP of the OCI ARM VM — use for VS Code Remote SSH"
  value       = module.compute.public_ip
}

output "vm_ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh -i ~/.ssh/familyshield ubuntu@${module.compute.public_ip}"
}

output "portal_url" {
  description = "FamilyShield portal URL"
  value       = "https://familyshield-${var.environment}.everythingcloud.ca"
}

output "adguard_url" {
  description = "AdGuard Home admin URL (behind Cloudflare Zero Trust)"
  value       = "https://adguard-${var.environment}.everythingcloud.ca"
}

output "compartment_id" {
  description = "OCI compartment OCID for this environment"
  value       = module.compartments.compartment_id
}

output "state_bucket_name" {
  description = "OCI Object Storage bucket for Terraform state"
  value       = module.storage.state_bucket_name
}

output "tunnel_id" {
  description = "Cloudflare Tunnel ID"
  value       = module.cloudflare.tunnel_id
  sensitive   = true
}
