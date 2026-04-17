# iac/cloudflare/waf.tf
# WAF Configuration Rules — fix "cf-mitigated: challenge" on SSH endpoint
#
# Problem: Cloudflare Bot Protection fires BEFORE Access policy evaluation,
# returning HTTP 403 with "cf-mitigated: challenge" for GitHub Actions runner
# IPs (datacenter IPs flagged as bots). The service token headers are never
# even seen by Access.
#
# Fix: Set security_level = "essentially_off" for the SSH hostname.
# This disables bot scoring for that specific endpoint while leaving all
# other hostnames at normal protection levels.
#
# Available on Cloudflare free tier:
#   phase = "http_config_settings" with action = "set_config"
#
# Reference: https://developers.cloudflare.com/ruleset-engine/rules-language/

resource "cloudflare_ruleset" "ssh_bot_bypass" {
  zone_id     = var.cloudflare_zone_id
  name        = "FamilyShield SSH bot bypass ${var.environment}"
  description = "Disable bot scoring for SSH tunnel endpoint so service token auth reaches Access"
  kind        = "zone"
  phase       = "http_config_settings"

  rules {
    ref         = "ssh_bot_bypass_${var.environment}"
    description = "Allow cloudflared SSH connections — disable bot challenge for ${var.environment} SSH"
    expression  = "(http.host eq \"ssh-${var.environment}.${var.root_domain}\")"
    action      = "set_config"
    enabled     = true

    action_parameters {
      security_level = "essentially_off"
      # bic = false disables Browser Integrity Check for this endpoint
      # (BIC also challenges datacenter IPs before Access runs)
      bic = false
    }
  }
}
