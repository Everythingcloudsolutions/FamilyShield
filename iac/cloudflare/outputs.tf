# iac/cloudflare/outputs.tf

output "tunnel_id" {
  description = "Cloudflare Tunnel ID (UUID)"
  value       = cloudflare_zero_trust_tunnel_cloudflared.main.id
}

output "tunnel_token" {
  description = "Cloudflare Tunnel token — passed to cloudflared connector at runtime"
  value       = cloudflare_zero_trust_tunnel_cloudflared.main.tunnel_token
  sensitive   = true
}

output "tunnel_cname" {
  description = "Cloudflare-assigned CNAME for this tunnel (used by DNS records)"
  value       = cloudflare_zero_trust_tunnel_cloudflared.main.cname
}

output "service_token_client_id" {
  description = "CF-Access-Client-Id for GitHub Actions service token"
  value       = cloudflare_zero_trust_access_service_token.github_actions.client_id
  sensitive   = true
}

output "service_token_client_secret" {
  description = "CF-Access-Client-Secret for GitHub Actions service token"
  value       = cloudflare_zero_trust_access_service_token.github_actions.client_secret
  sensitive   = true
}
