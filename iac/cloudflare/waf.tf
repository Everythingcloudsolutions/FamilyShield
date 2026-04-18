# iac/cloudflare/waf.tf
# WAF Configuration Rules — Zone-level singleton, managed by prod IaC only
#
# One Cloudflare zone can only have ONE http_config_settings phase ruleset.
# Both dev and prod share the same zone (everythingcloud.ca), so this resource
# is created ONLY when environment == "prod" (count = 0 for dev/staging).
#
# The single zone-wide ruleset covers ALL environments so Tailscale clients and
# GitHub Actions runners get bot bypass regardless of which environment they target.
#
# Two bypass rules:
# 1. SSH endpoints (all envs) — GitHub Actions runner IPs get bot-challenged.
#    security_level=essentially_off lets service token auth reach the Access layer.
#
# 2. VPN/Headscale endpoints (all envs) — Tailscale client connections come from
#    datacenter IPs that Cloudflare scores as bots. Without this rule the
#    coordination protocol is blocked before it reaches Headscale.
#
# Available on Cloudflare free tier:
#   phase = "http_config_settings" with action = "set_config"
#
# Reference: https://developers.cloudflare.com/ruleset-engine/rules-language/

resource "cloudflare_ruleset" "ssh_bot_bypass" {
  # Zone-wide singleton — only prod IaC owns it.
  # Dev/staging: count=0 will destroy any previously created copy on next apply.
  count = var.environment == "prod" ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  name        = "FamilyShield bot bypass rules"
  description = "Disable bot scoring for SSH and VPN endpoints (all environments)"
  kind        = "zone"
  phase       = "http_config_settings"

  rules {
    ref         = "ssh_bot_bypass_all"
    description = "Allow cloudflared SSH connections — disable bot challenge for all environments"
    expression  = "(http.host eq \"ssh.${var.root_domain}\") or (http.host eq \"ssh-dev.${var.root_domain}\") or (http.host eq \"ssh-staging.${var.root_domain}\")"
    action      = "set_config"
    enabled     = true

    action_parameters {
      security_level = "essentially_off"
      bic            = false
    }
  }

  rules {
    ref         = "vpn_bot_bypass_all"
    description = "Allow Tailscale/Headscale client connections — disable bot challenge for all environments"
    expression  = "(http.host eq \"vpn.familyshield.${var.root_domain}\") or (http.host eq \"vpn.familyshield-dev.${var.root_domain}\") or (http.host eq \"vpn.familyshield-staging.${var.root_domain}\")"
    action      = "set_config"
    enabled     = true

    action_parameters {
      security_level = "essentially_off"
      bic            = false
    }
  }
}
