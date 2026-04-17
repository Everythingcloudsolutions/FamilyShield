# iac/cloudflare/variables.tf

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Tunnel + DNS + Access scopes"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for everythingcloud.ca"
  type        = string
}

variable "environment" {
  description = "Target environment: dev | staging | prod"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "root_domain" {
  description = "Root domain managed in Cloudflare"
  type        = string
  default     = "everythingcloud.ca"
}

variable "admin_email" {
  description = "Admin email address allowed to access protected services (AdGuard, Grafana) via Cloudflare Access OTP"
  type        = string
}
