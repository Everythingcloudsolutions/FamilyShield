# iac/cloudflare/access.tf
# Zero Trust: Access Applications, Service Token, and Access Policies
#
# Access Apps protect admin surfaces (AdGuard, Grafana) and SSH.
# The SERVICE AUTH policy (non_identity) allows GitHub Actions runner
# to authenticate using the service token instead of OIDC/email.
#
# Non-admin services (portal, API) are NOT protected here — they are
# publicly reachable via Cloudflare Tunnel without Access enforcement.

# ── Service Token (for GitHub Actions CI/CD) ─────────────────────────────────
# Outputs client_id and client_secret used by cloudflared --service-token-id/secret
resource "cloudflare_zero_trust_access_service_token" "github_actions" {
  account_id = var.cloudflare_account_id
  name       = "FamilyShield GitHub Actions ${var.environment}"

  # min_days_for_renewal: auto-renew when fewer than 30 days remain
  min_days_for_renewal = 30
}

# ── Access Application: AdGuard ───────────────────────────────────────────────
resource "cloudflare_zero_trust_access_application" "adguard" {
  account_id       = var.cloudflare_account_id
  name             = "FamilyShield AdGuard ${var.environment}"
  domain           = "adguard-${var.environment}.${var.root_domain}"
  type             = "self_hosted"
  session_duration = "8h"

  # Disable Cloudflare's browser SSH/VNC rendering — we use native SSH
  app_launcher_visible = false
}

resource "cloudflare_zero_trust_access_policy" "adguard_service_auth" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.adguard.id
  name           = "Allow GitHub Actions service token"
  decision       = "non_identity"
  precedence     = 1

  include {
    service_token = [cloudflare_zero_trust_access_service_token.github_actions.id]
  }
}

# ── Access Application: Grafana ───────────────────────────────────────────────
resource "cloudflare_zero_trust_access_application" "grafana" {
  account_id       = var.cloudflare_account_id
  name             = "FamilyShield Grafana ${var.environment}"
  domain           = "grafana-${var.environment}.${var.root_domain}"
  type             = "self_hosted"
  session_duration = "8h"

  app_launcher_visible = false
}

resource "cloudflare_zero_trust_access_policy" "grafana_service_auth" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.grafana.id
  name           = "Allow GitHub Actions service token"
  decision       = "non_identity"
  precedence     = 1

  include {
    service_token = [cloudflare_zero_trust_access_service_token.github_actions.id]
  }
}

# ── Access Application: SSH ───────────────────────────────────────────────────
# type = "self_hosted" (NOT "browser_ssh") — native SSH via cloudflared proxy
# browser_rendering must remain OFF for cloudflared access ssh to work
resource "cloudflare_zero_trust_access_application" "ssh" {
  account_id       = var.cloudflare_account_id
  name             = "FamilyShield SSH ${var.environment}"
  domain           = "ssh-${var.environment}.${var.root_domain}"
  type             = "self_hosted"
  session_duration = "8h"

  app_launcher_visible = false
}

resource "cloudflare_zero_trust_access_policy" "ssh_service_auth" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.ssh.id
  name           = "Allow GitHub Actions service token"
  decision       = "non_identity"
  precedence     = 1

  include {
    service_token = [cloudflare_zero_trust_access_service_token.github_actions.id]
  }
}
