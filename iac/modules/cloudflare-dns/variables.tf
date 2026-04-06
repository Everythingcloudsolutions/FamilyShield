variable "cloudflare_zone_id" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "subdomain" {
  type = string
}

variable "root_domain" {
  type = string
}

variable "tunnel_secret" {
  type      = string
  sensitive = true
}

variable "environment" {
  type = string
}

variable "vm_public_ip" {
  type = string
}

variable "admin_emails" {
  type    = list(string)
  default = []
}

output "tunnel_id" {
  value     = cloudflare_tunnel.main.id
  sensitive = true
}

output "tunnel_token" {
  value     = cloudflare_tunnel.main.tunnel_token
  sensitive = true
}

output "portal_url" {
  value = "https://${var.subdomain}.${var.root_domain}"
}
