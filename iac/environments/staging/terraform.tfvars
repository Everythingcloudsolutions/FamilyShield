# FamilyShield — Staging Environment Variables (EPHEMERAL)
# Sensitive values injected by GitHub Actions as TF_VAR_* environment variables
# NOTE: Staging is ephemeral — spun up for QA, torn down after testing.
# Do not store production data here.

environment = "staging"
oci_region  = "ca-toronto-1"
vcn_cidr    = "10.1.0.0/16"

# Staging VM sizing (1 OCPU / 6GB RAM) — same as dev for QA consistency
# This is ephemeral and torn down after QA testing
instance_ocpus  = 1
instance_memory = 6

# SSH access DURING DEPLOY: wide open (0.0.0.0/0) to avoid deployment failures.
# After deploy: tighten-ssh job restricts to admin IP only (173.33.214.49/32).
admin_ssh_cidrs = ["0.0.0.0/0"]
