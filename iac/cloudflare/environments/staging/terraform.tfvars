# iac/cloudflare/environments/staging/terraform.tfvars
# Staging environment — Cloudflare resources
# Sensitive values are injected via TF_VAR_* GitHub Secrets (not hardcoded here)

environment = "staging"
root_domain = "everythingcloud.ca"

# Admin email — Cloudflare Access will send a one-time PIN to this address
admin_email = "mohit.goyal@everything.net.in"

# oci_public_ip is NOT set here — injected dynamically by deploy-staging.yml via TF_VAR_oci_public_ip
# (captured from tofu output vm_public_ip after OCI compute module runs)

# cloudflare_api_token    — set via TF_VAR_cloudflare_api_token GitHub Secret
# cloudflare_account_id   — set via TF_VAR_cloudflare_account_id GitHub Secret
# cloudflare_zone_id      — set via TF_VAR_cloudflare_zone_id GitHub Secret
