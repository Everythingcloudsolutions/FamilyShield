# FamilyShield — Production Environment Variables
# Sensitive values injected by GitHub Actions as TF_VAR_* environment variables
# ⚠️  PRODUCTION — changes here affect live families — approval required

environment = "prod"
oci_region  = "ca-toronto-1"
vcn_cidr    = "10.2.0.0/16"

# Production VM sizing (2 OCPU / 6GB RAM)
# This is the largest allocation within Always Free tier limits
instance_ocpus  = 2
instance_memory = 6

# SSH access DURING DEPLOY: wide open (0.0.0.0/0) to avoid deployment failures.
# After deploy: tighten-ssh job restricts to admin IP only (173.33.214.49/32).
admin_ssh_cidrs = ["0.0.0.0/0"]
