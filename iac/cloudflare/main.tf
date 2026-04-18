# iac/cloudflare/main.tf
# Cloudflare Tunnel lifecycle: tunnel secret, tunnel, ingress config

# ── Environment suffix ────────────────────────────────────────────────────────
# Production has clean URLs (no suffix). Lower environments get -dev / -staging.
locals {
  env_suffix = var.environment == "prod" ? "" : "-${var.environment}"
}


# ── Tunnel secret ─────────────────────────────────────────────────────────────
# Generates a cryptographic 32-byte secret for the tunnel.
# The .base64 output is used directly as the tunnel secret field.
# stored in state — tofu will reuse it on subsequent applies (no rotation).
resource "random_bytes" "tunnel_secret" {
  length = 32
}

# ── Cloudflare Tunnel ─────────────────────────────────────────────────────────
resource "cloudflare_zero_trust_tunnel_cloudflared" "main" {
  account_id = var.cloudflare_account_id
  name       = "familyshield${local.env_suffix}"
  secret     = random_bytes.tunnel_secret.base64

  # config_src = "cloudflare" means ingress rules are managed via the API
  # (as opposed to "local" which reads a config file on the connector host).
  config_src = "cloudflare"
}

# ── Ingress rules ─────────────────────────────────────────────────────────────
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "main" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.main.id

  config {
    ingress_rule {
      hostname = "familyshield${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:3000"
    }

    ingress_rule {
      hostname = "api${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:3001"
    }

    ingress_rule {
      hostname = "adguard${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:3080"
    }

    ingress_rule {
      hostname = "mitmproxy${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:8888" # docker-compose: 8888:8080 (web UI)
    }

    ingress_rule {
      hostname = "vpn${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:8080" # headscale control plane
    }

    ingress_rule {
      hostname = "grafana${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:3002" # docker-compose: 3002:3000
    }

    ingress_rule {
      hostname = "nodered${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:1880"
    }

    ingress_rule {
      hostname = "notify${local.env_suffix}.${var.root_domain}"
      service  = "http://localhost:2586" # docker-compose: 2586:80
    }

    ingress_rule {
      hostname = "ssh${local.env_suffix}.${var.root_domain}"
      service  = "ssh://localhost:22"
    }

    # Catch-all — must be last (no hostname)
    ingress_rule {
      service = "http_status:404"
    }
  }
}
