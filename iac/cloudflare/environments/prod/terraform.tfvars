# iac/cloudflare/environments/prod/terraform.tfvars
# Prod environment — Cloudflare resources
# Sensitive values are injected via TF_VAR_* GitHub Secrets (not hardcoded here)

environment = "prod"
root_domain = "everythingcloud.ca"

# Admin email — Cloudflare Access will send a one-time PIN to this address
admin_email = "mohit.goyal@everything.net.in"

# cloudflare_api_token    — set via TF_VAR_cloudflare_api_token GitHub Secret
# cloudflare_account_id   — set via TF_VAR_cloudflare_account_id GitHub Secret
# cloudflare_zone_id      — set via TF_VAR_cloudflare_zone_id GitHub Secret
