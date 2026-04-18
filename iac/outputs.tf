###############################################################################
# FamilyShield — Root Outputs
###############################################################################

output "vm_public_ip" {
  description = "Public IP of the OCI ARM VM — use for VS Code Remote SSH"
  value       = try(module.compute.public_ip, "")
}

output "vm_ssh_command" {
  description = "SSH command to connect to the VM"
  value       = try("ssh -i ~/.ssh/familyshield ubuntu@${module.compute.public_ip}", "")
}

output "portal_url" {
  description = "FamilyShield portal URL"
  value       = "https://familyshield${local.env_suffix}.everythingcloud.ca"
}

output "adguard_url" {
  description = "AdGuard Home admin URL (behind Cloudflare Zero Trust)"
  value       = "https://adguard${local.env_suffix}.everythingcloud.ca"
}


output "state_bucket_name" {
  description = "OCI Object Storage bucket for Terraform state"
  value       = module.storage.state_bucket_name
}

output "tunnel_secret" {
  description = "Tunnel secret (used by deploy-cloudflare workflow to create tunnel)"
  value       = random_password.tunnel_secret.result
  sensitive   = true
}

output "nsg_vm_id" {
  description = "OCID of the VM NSG — used by workflows for dynamic CI SSH hole-punch"
  value       = module.network.nsg_vm_id
}
