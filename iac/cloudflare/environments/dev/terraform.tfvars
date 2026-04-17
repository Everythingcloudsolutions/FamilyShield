# iac/cloudflare/environments/dev/terraform.tfvars
# Dev environment — Cloudflare resources
# Sensitive values are injected via TF_VAR_* GitHub Secrets (not hardcoded here)

environment = "dev"
root_domain = "everythingcloud.ca"

# cloudflare_api_token    — set via TF_VAR_cloudflare_api_token GitHub Secret
# cloudflare_account_id   — set via TF_VAR_cloudflare_account_id GitHub Secret
# cloudflare_zone_id      — set via TF_VAR_cloudflare_zone_id GitHub Secret
