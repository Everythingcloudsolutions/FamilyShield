# iac/cloudflare/waf.tf
# WAF Configuration Rules
#
# Two bot-bypass rules in a single zone ruleset:
#
# 1. SSH endpoint — GitHub Actions runner IPs get bot-challenged before Access
#    policy evaluation. security_level=essentially_off lets service token auth
#    reach the Access layer.
#
# 2. VPN/Headscale endpoint — Tailscale client connections (mobile, laptops) come
#    from IPs that Cloudflare scores as bots (datacenter egress, automated clients).
#    Without this rule the coordination protocol is blocked before it reaches
#    Headscale, preventing device registration and keep-alive traffic.
#
# Available on Cloudflare free tier:
#   phase = "http_config_settings" with action = "set_config"
#
# Reference: https://developers.cloudflare.com/ruleset-engine/rules-language/

resource "cloudflare_ruleset" "ssh_bot_bypass" {
  zone_id     = var.cloudflare_zone_id
  name        = "FamilyShield bot bypass rules ${var.environment}"
  description = "Disable bot scoring for SSH and VPN endpoints"
  kind        = "zone"
  phase       = "http_config_settings"

  rules {
    ref         = "ssh_bot_bypass_${var.environment}"
    description = "Allow cloudflared SSH connections — disable bot challenge for ${var.environment} SSH"
    expression  = "(http.host eq \"ssh${local.env_suffix}.${var.root_domain}\")"
    action      = "set_config"
    enabled     = true

    action_parameters {
      security_level = "essentially_off"
      bic            = false
    }
  }

  rules {
    ref         = "vpn_bot_bypass_${var.environment}"
    description = "Allow Tailscale/Headscale client connections — disable bot challenge for ${var.environment} VPN"
    expression  = "(http.host eq \"vpn.familyshield${local.env_suffix}.${var.root_domain}\")"
    action      = "set_config"
    enabled     = true

    action_parameters {
      security_level = "essentially_off"
      bic            = false
    }
  }
}
