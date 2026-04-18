###############################################################################
# FamilyShield — Root IaC Orchestration
# Provider: Oracle Cloud (OCI)
# Region:   ca-toronto-1
# Author:   Everythingcloudsolutions
# Year:     2026
# Note: Cloudflare resources are now managed by deploy-cloudflare.yml workflow
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket = "familyshield-tfstate"
    key    = "root/terraform.tfstate"
    region = "ca-toronto-1"
    # endpoint is passed via -backend-config flag in GitHub Actions workflow
    # (requires dynamic OCI_NAMESPACE value from environment)
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    use_path_style              = true
  }
}

###############################################################################
# Providers
###############################################################################

provider "oci" {
  region       = var.oci_region
  tenancy_ocid = var.oci_tenancy_ocid
  # Auth via OCI OIDC from GitHub Actions — no API key stored in GitHub
  # For local dev: auth via ~/.oci/config
  auth = var.oci_auth_type # "InstancePrincipal" in CI, "APIKey" locally
}

###############################################################################
# Compartments — Bootstrap-driven (Phase 2)
# Bootstrap script Step 7 creates: familyshield-dev, familyshield-staging, familyshield-prod
# IaC queries for existing compartments (no creation here)
###############################################################################

module "compartments" {
  source = "./modules/oci-compartments"

  tenancy_ocid            = var.oci_tenancy_ocid
  environment             = var.environment
  compartment_description = "FamilyShield ${var.environment} environment"
  tags                    = local.common_tags
}

###############################################################################
# Networking — Depends on: Compartments
###############################################################################

module "network" {
  source = "./modules/oci-network"

  compartment_id  = module.compartments.compartment_id
  environment     = var.environment
  region          = var.oci_region
  vcn_cidr        = var.vcn_cidr
  admin_ssh_cidrs = var.admin_ssh_cidrs
  tags            = local.common_tags
}

###############################################################################
# Object Storage (state + backups) — Depends on: Compartments
###############################################################################

module "storage" {
  source = "./modules/oci-storage"

  namespace = var.oci_namespace # bucket is read-only; created once by bootstrap-oci.sh
}

###############################################################################
# Compute — Environment-specific VM sizing
# Depends on: Compartments, Network, Storage
# Resource allocation per environment:
#   - dev:     1 OCPU / 6GB RAM (always on)
#   - staging: 1 OCPU / 6GB RAM (ephemeral, torn down after QA)
#   - prod:    2 OCPU / 6GB RAM (always on)
# Total within OCI Always Free: 4 OCPU / 24GB RAM max
###############################################################################

module "compute" {
  source = "./modules/oci-compute"

  compartment_id = module.compartments.compartment_id
  tenancy_ocid   = var.oci_tenancy_ocid
  subnet_id      = module.network.public_subnet_id
  environment    = var.environment
  ssh_public_key = var.ssh_public_key
  instance_shape = "VM.Standard.A1.Flex"
  ocpus          = var.instance_ocpus
  memory_in_gbs  = var.instance_memory
  nsg_ids        = [module.network.nsg_vm_id]
  # image_id intentionally NOT set — compute module dynamically queries for Ubuntu 22.04 ARM image
  cloud_init_script = templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
    environment = var.environment
    # docker_compose_b64 intentionally NOT passed here.
    # The real docker-compose.yml is written by the infra workflow via SSH after tofu apply.
    # This keeps cloud-init user_data static so app config changes do NOT recreate the VM.
  })
  tags = local.common_tags
}

###############################################################################
# Cloudflare DNS + Tunnel + Zero Trust
# NOTE: Cloudflare resources are now managed via separate deploy-cloudflare.yml
# workflow using the Cloudflare API directly (not Terraform).
# This avoids state management conflicts and allows for independent updates.
###############################################################################

# module "cloudflare" {
#   source = "./modules/cloudflare-dns"
#
#   cloudflare_zone_id    = var.cloudflare_zone_id
#   cloudflare_account_id = var.cloudflare_account_id
#   subdomain             = "familyshield-${var.environment}"
#   root_domain           = "everythingcloud.ca"
#   tunnel_secret         = random_password.tunnel_secret.result
#   environment           = var.environment
#   vm_public_ip          = module.compute.public_ip
#   admin_emails          = var.admin_emails
# }

###############################################################################
# Helpers
###############################################################################

resource "random_password" "tunnel_secret" {
  length  = 64
  special = false
}

###############################################################################
# Persistent Data Volume — OCI Block Storage (Always Free tier)
# Survives VM recreation — all service data (AdGuard, Headscale, InfluxDB, etc.)
# lives here, not on the boot volume which is wiped on every VM recreate.
#
# OCI Always Free storage limit: 200 GB total across all block + boot volumes.
# boot volume (50 GB) + data volume (50 GB) = 100 GB — well within the free limit.
#
# Device path on VM: /dev/oracleoci/oraclevdb (paravirtualized OCI symlink)
# Mount point: /opt/familyshield-data
# File system: ext4, labelled "familyshield-data"
# fstab: UUID-based, _netdev,nofail — survives reboots safely
###############################################################################

resource "oci_core_volume" "data" {
  compartment_id      = module.compartments.compartment_id
  availability_domain = module.compute.availability_domain
  display_name        = "familyshield-data-${var.environment}"
  size_in_gbs         = 50

  freeform_tags = local.common_tags

  lifecycle {
    # CRITICAL: Never delete the data volume. All service configs live here.
    # AdGuard setup, Headscale users/keys, ntfy users, InfluxDB data, Grafana dashboards.
    # To intentionally delete: remove this block, run tofu apply, then destroy manually.
    prevent_destroy = true
  }
}

resource "oci_core_volume_attachment" "data" {
  attachment_type = "paravirtualized"
  instance_id     = module.compute.instance_id
  volume_id       = oci_core_volume.data.id
  display_name    = "familyshield-data-attachment-${var.environment}"
  device          = "/dev/oracleoci/oraclevdb"

  # Note: is_pv_encryption_in_transit_enabled is NOT supported on VM.Standard.A1.Flex (Always Free ARM).
  # OCI error 400-InvalidParameter if set to true on this shape.

  timeouts {
    create = "15m"
  }
}

locals {
  # Production uses clean URLs (no suffix); lower envs get -dev / -staging.
  env_suffix = var.environment == "prod" ? "" : "-${var.environment}"

  common_tags = {
    project     = "familyshield"
    environment = var.environment
    managed_by  = "opentofu"
    repo        = "github.com/Everythingcloudsolutions/FamilyShield"
    year        = "2026"
  }
}
