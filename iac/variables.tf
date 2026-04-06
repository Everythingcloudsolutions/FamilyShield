###############################################################################
# FamilyShield — Root Variables
###############################################################################

# ── OCI ───────────────────────────────────────────────────────────────────────

variable "oci_region" {
  description = "OCI region — Toronto for Canadian deployment"
  type        = string
  default     = "ca-toronto-1"
}

variable "oci_tenancy_ocid" {
  description = "OCI tenancy OCID — from OCI Console > Profile > Tenancy"
  type        = string
  sensitive   = true
}

variable "oci_namespace" {
  description = "OCI Object Storage namespace — from OCI Console > Object Storage"
  type        = string
}

variable "oci_auth_type" {
  description = "OCI auth: 'APIKey' for local dev, 'InstancePrincipal' in GitHub Actions"
  type        = string
  default     = "APIKey"
}

variable "oci_ubuntu_arm_image_id" {
  description = "OCI ARM Ubuntu 22.04 image OCID for ca-toronto-1"
  type        = string
  # Find via: oci compute image list --compartment-id <tenancy-ocid> --operating-system "Canonical Ubuntu" --shape VM.Standard.A1.Flex
  # Current ca-toronto-1 Ubuntu 22.04 ARM image (update periodically):
  default = "ocid1.image.oc1.ca-toronto-1.aaaaaaaawzbmdqqyvrctw4cvhegvnbbxtoday4bxlkdpqeowc5kcbrhplt2aocid1.image.oc1.ca-toronto-1.aaaaaaaaxxx" # Replace with actual OCID
}

variable "ssh_public_key" {
  description = "SSH public key to install on OCI VMs for VS Code Remote SSH"
  type        = string
  sensitive   = true
}

# ── Network ───────────────────────────────────────────────────────────────────

variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

# ── Environment ───────────────────────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment: dev | staging | prod"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# ── Cloudflare ────────────────────────────────────────────────────────────────

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS:Edit and Tunnel permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for everythingcloud.ca"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

# ── Application Secrets ───────────────────────────────────────────────────────

variable "adguard_admin_password" {
  description = "AdGuard Home admin panel password"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key (public)"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key for primary LLM"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key for fallback LLM"
  type        = string
  sensitive   = true
}
