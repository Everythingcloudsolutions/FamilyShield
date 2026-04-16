# iac/cloudflare/terraform.tf
# Separate Cloudflare state — stored in the same OCI bucket as main IaC
# but under key: cloudflare/{env}/terraform.tfstate
#
# Init command (example for dev):
#   cd iac/cloudflare
#   tofu init \
#     -backend-config="bucket=familyshield-tfstate" \
#     -backend-config="key=cloudflare/dev/terraform.tfstate" \
#     -backend-config="endpoint=https://${OCI_NAMESPACE}.compat.objectstorage.ca-toronto-1.oraclecloud.com" \
#     -backend-config="region=ca-toronto-1" \
#     -backend-config="skip_region_validation=true" \
#     -backend-config="skip_credentials_validation=true" \
#     -backend-config="skip_metadata_api_check=true" \
#     -backend-config="use_path_style=true" \
#     -reconfigure

terraform {
  required_version = ">= 1.6"

  backend "s3" {
    # All backend-config values are injected via -backend-config flags at init time
    # (same pattern as iac/main.tf — see .github/actions/tofu-apply/action.yml)
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    use_path_style              = true
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
