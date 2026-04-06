###############################################################################
# Module: cloudflare-dns
# Creates: DNS records, Cloudflare Tunnel, Zero Trust access policies
# Domain: familyshield.everythingcloud.ca
###############################################################################

# Cloudflare Tunnel (outbound-only — no open inbound ports needed)
resource "cloudflare_tunnel" "main" {
  account_id = var.cloudflare_account_id
  name       = "familyshield-${var.environment}"
  secret     = base64encode(var.tunnel_secret)
}

# Tunnel config — routes internal services to public subdomains
resource "cloudflare_tunnel_config" "main" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_tunnel.main.id

  config {
    # Portal
    ingress_rule {
      hostname = "${var.subdomain}.${var.root_domain}"
      service  = "http://localhost:3000"
    }
    # AdGuard Home admin (behind Zero Trust)
    ingress_rule {
      hostname = "adguard-${var.environment}.${var.root_domain}"
      service  = "http://localhost:3080"
    }
    # Grafana (behind Zero Trust)
    ingress_rule {
      hostname = "grafana-${var.environment}.${var.root_domain}"
      service  = "http://localhost:3001"
    }
    # Headscale VPN control plane
    ingress_rule {
      hostname = "vpn.${var.subdomain}.${var.root_domain}"
      service  = "http://localhost:8080"
    }
    # Catch-all
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# DNS CNAME record pointing to Cloudflare Tunnel
resource "cloudflare_record" "portal" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  value   = "${cloudflare_tunnel.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "adguard" {
  zone_id = var.cloudflare_zone_id
  name    = "adguard-${var.environment}"
  value   = "${cloudflare_tunnel.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "grafana" {
  zone_id = var.cloudflare_zone_id
  name    = "grafana-${var.environment}"
  value   = "${cloudflare_tunnel.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "vpn" {
  zone_id = var.cloudflare_zone_id
  name    = "vpn.${var.subdomain}"
  value   = "${cloudflare_tunnel.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}

# Cloudflare Zero Trust Access Application — protects admin services
resource "cloudflare_access_application" "adguard" {
  zone_id          = var.cloudflare_zone_id
  name             = "FamilyShield AdGuard ${var.environment}"
  domain           = "adguard-${var.environment}.${var.root_domain}"
  session_duration = "8h"
  type             = "self_hosted"
}

resource "cloudflare_access_application" "grafana" {
  zone_id          = var.cloudflare_zone_id
  name             = "FamilyShield Grafana ${var.environment}"
  domain           = "grafana-${var.environment}.${var.root_domain}"
  session_duration = "8h"
  type             = "self_hosted"
}

# Access Policy — email allowlist (your email only)
resource "cloudflare_access_policy" "admin_email" {
  application_id = cloudflare_access_application.adguard.id
  zone_id        = var.cloudflare_zone_id
  name           = "Admin email allowlist"
  precedence     = 1
  decision       = "allow"

  include {
    email = var.admin_emails
  }
}
