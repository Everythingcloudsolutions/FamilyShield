# iac/cloudflare/environments/dev/terraform.tfvars
# Dev environment — Cloudflare resources
# Sensitive values are injected via TF_VAR_* GitHub Secrets (not hardcoded here)

environment = "dev"
root_domain = "everythingcloud.ca"

# Admin email — Cloudflare Access will send a one-time PIN to this address
# Set to your Cloudflare account email (or any email you want to use for OTP login)
admin_email = "mohit.goyal@everything.net.in"

# OCI public IP — for direct Headscale exposure (bypasses Cloudflare tunnel)
# This creates vpn-direct-dev.everythingcloud.ca DNS A record pointing to this IP
# Headscale can be tested with direct public IP + Caddy reverse proxy
oci_public_ip = "40.233.115.22"

# cloudflare_api_token    — set via TF_VAR_cloudflare_api_token GitHub Secret
# cloudflare_account_id   — set via TF_VAR_cloudflare_account_id GitHub Secret
# cloudflare_zone_id      — set via TF_VAR_cloudflare_zone_id GitHub Secret
