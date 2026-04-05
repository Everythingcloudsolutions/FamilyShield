# FamilyShield — Dev Environment Variables
# Copy to: iac/environments/dev/terraform.tfvars
# Sensitive values injected by GitHub Actions as TF_VAR_* environment variables
# DO NOT commit actual secrets to this file

environment = "dev"
oci_region  = "ca-toronto-1"
vcn_cidr    = "10.0.0.0/16"

# OCI — fill from OCI Console
# oci_tenancy_ocid        = set via TF_VAR_oci_tenancy_ocid in GitHub Actions
# oci_namespace           = set via TF_VAR_oci_namespace
# oci_ubuntu_arm_image_id = "ocid1.image.oc1.ca-toronto-1.xxxx"  # See scripts/find-arm-image.sh
# ssh_public_key          = set via TF_VAR_ssh_public_key

# Cloudflare — fill from Cloudflare Dashboard
# cloudflare_zone_id    = set via TF_VAR_cloudflare_zone_id
# cloudflare_account_id = set via TF_VAR_cloudflare_account_id
# cloudflare_api_token  = set via TF_VAR_cloudflare_api_token

# Application secrets — set via GitHub Actions secrets
# adguard_admin_password = set via TF_VAR_adguard_admin_password
# supabase_url           = set via TF_VAR_supabase_url
# supabase_anon_key      = set via TF_VAR_supabase_anon_key
# groq_api_key           = set via TF_VAR_groq_api_key
# anthropic_api_key      = set via TF_VAR_anthropic_api_key
