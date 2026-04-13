###############################################################################
# FamilyShield — Root IaC Orchestration
# Provider: Oracle Cloud (OCI) + Cloudflare + Supabase
# Region:   ca-toronto-1
# Author:   Everythingcloudsolutions
# Year:     2026
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket                      = "familyshield-tfstate"
    key                         = "root/terraform.tfstate"
    region                      = "ca-toronto-1"
    endpoint                    = "https://${OCI_NAMESPACE}.compat.objectstorage.ca-toronto-1.oraclecloud.com"
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

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

###############################################################################
# Compartments
###############################################################################

module "compartments" {
  source = "./modules/oci-compartments"

  tenancy_ocid            = var.oci_tenancy_ocid
  environment             = var.environment
  compartment_description = "FamilyShield ${var.environment} environment"
  tags                    = local.common_tags
}

###############################################################################
# Networking
###############################################################################

module "network" {
  source = "./modules/oci-network"

  compartment_id = module.compartments.compartment_id
  environment    = var.environment
  region         = var.oci_region
  vcn_cidr       = var.vcn_cidr
  tags           = local.common_tags
}

###############################################################################
# Object Storage (state + backups)
###############################################################################

module "storage" {
  source = "./modules/oci-storage"

  compartment_id = module.compartments.compartment_id
  namespace      = var.oci_namespace
  environment    = var.environment
  tags           = local.common_tags
}

###############################################################################
# Compute — ARM VM (Always Free: 4 OCPU / 24GB)
###############################################################################

module "compute" {
  source = "./modules/oci-compute"

  compartment_id = module.compartments.compartment_id
  subnet_id      = module.network.public_subnet_id
  environment    = var.environment
  ssh_public_key = var.ssh_public_key
  instance_shape = "VM.Standard.A1.Flex"
  ocpus          = 4
  memory_in_gbs  = 24
  image_id       = var.oci_ubuntu_arm_image_id
  cloud_init_script = templatefile("${path.module}/templates/cloud-init.yaml.tpl", {
    environment = var.environment
    docker_compose_b64 = base64encode(templatefile(
      "${path.module}/templates/docker-compose.yaml.tpl",
      local.docker_compose_vars
    ))
  })
  tags = local.common_tags
}

###############################################################################
# Cloudflare DNS + Tunnel + Zero Trust
###############################################################################

module "cloudflare" {
  source = "./modules/cloudflare-dns"

  cloudflare_zone_id    = var.cloudflare_zone_id
  cloudflare_account_id = var.cloudflare_account_id
  subdomain             = "familyshield-${var.environment}"
  root_domain           = "everythingcloud.ca"
  tunnel_secret         = random_password.tunnel_secret.result
  environment           = var.environment
  vm_public_ip          = module.compute.public_ip
  admin_emails          = var.admin_emails
}

###############################################################################
# Helpers
###############################################################################

resource "random_password" "tunnel_secret" {
  length  = 64
  special = false
}

locals {
  common_tags = {
    project     = "familyshield"
    environment = var.environment
    managed_by  = "opentofu"
    repo        = "github.com/Everythingcloudsolutions/FamilyShield"
    year        = "2026"
  }

  docker_compose_vars = {
    environment       = var.environment
    adguard_password  = var.adguard_admin_password
    tunnel_token      = module.cloudflare.tunnel_token
    headscale_domain  = "vpn.familyshield-${var.environment}.everythingcloud.ca"
    supabase_url      = var.supabase_url
    supabase_anon_key = var.supabase_anon_key
    groq_api_key      = var.groq_api_key
    anthropic_api_key = var.anthropic_api_key
  }
}
