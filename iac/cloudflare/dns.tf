# iac/cloudflare/dns.tf
# 8 CNAME records pointing to the tunnel's Cloudflare-assigned hostname.
# All proxied=true so traffic flows through Cloudflare network.
# ttl=1 means "Auto" in Cloudflare (required when proxied=true).

locals {
  # Subdomains that map directly to the tunnel
  dns_subdomains = [
    "familyshield-${var.environment}",
    "api-${var.environment}",
    "adguard-${var.environment}",
    "mitmproxy-${var.environment}",
    "grafana-${var.environment}",
    "nodered-${var.environment}",
    "ssh-${var.environment}",
    "vpn.familyshield-${var.environment}",
  ]
}

resource "cloudflare_record" "tunnel" {
  for_each = toset(local.dns_subdomains)

  zone_id         = var.cloudflare_zone_id
  name            = each.value
  type            = "CNAME"
  content         = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  proxied         = true
  ttl             = 1
  allow_overwrite = true # take ownership of DNS records created by cloudflare-api.sh
  comment         = "FamilyShield ${var.environment} — managed by OpenTofu"
}
