###############################################################################
# FamilyShield — Root Outputs
###############################################################################

# VM outputs skipped until Phase 2 (compute module disabled for now)
# output "vm_public_ip" {
#   description = "Public IP of the OCI ARM VM — use for VS Code Remote SSH"
#   value       = module.compute.public_ip
# }

# output "vm_ssh_command" {
#   description = "SSH command to connect to the VM"
#   value       = "ssh -i ~/.ssh/familyshield ubuntu@${module.compute.public_ip}"
# }

output "portal_url" {
  description = "FamilyShield portal URL"
  value       = "https://familyshield-${var.environment}.everythingcloud.ca"
}

output "adguard_url" {
  description = "AdGuard Home admin URL (behind Cloudflare Zero Trust)"
  value       = "https://adguard-${var.environment}.everythingcloud.ca"
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

# Cloudflare tunnel_id and tunnel_token now created by deploy-cloudflare.yml workflow
# output "tunnel_id" {
#   description = "Cloudflare Tunnel ID"
#   value       = module.cloudflare.tunnel_id
#   sensitive   = true
# }
