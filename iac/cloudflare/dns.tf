# iac/cloudflare/dns.tf
# 9 CNAME records pointing to the tunnel's Cloudflare-assigned hostname.
# All proxied=true so traffic flows through Cloudflare network.
# ttl=1 means "Auto" in Cloudflare (required when proxied=true).
# env_suffix is "" for prod (clean URLs) and "-dev"/"-staging" for lower envs.
#
# Additionally: 1 A record for direct Headscale exposure (vpn-direct${env_suffix})
# This record points directly to the OCI public IP, bypassing Cloudflare tunnel.
# Allows testing Headscale without reverse proxy header stripping issues.

locals {
  # Subdomains that map directly to the tunnel
  dns_subdomains = [
    "familyshield${local.env_suffix}",
    "api${local.env_suffix}",
    "adguard${local.env_suffix}",
    "mitmproxy${local.env_suffix}",
    "grafana${local.env_suffix}",
    "nodered${local.env_suffix}",
    "notify${local.env_suffix}",
    "ssh${local.env_suffix}",
    "vpn${local.env_suffix}",
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

# Direct A record for Headscale (bypasses Cloudflare tunnel)
# Only created if oci_public_ip is provided
resource "cloudflare_record" "vpn_direct" {
  count   = var.oci_public_ip != null ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "vpn-direct${local.env_suffix}"
  type    = "A"
  content = var.oci_public_ip
  proxied = false # DNS only, no Cloudflare proxy
  ttl     = 300   # 5 min — allows quick IP changes during testing
  comment = "FamilyShield ${var.environment} — Headscale direct public IP (no tunnel)"
}
