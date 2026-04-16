variable "compartment_id" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "vcn_cidr" { type = string }
variable "tags" { type = map(string) }

variable "admin_ssh_cidrs" {
  description = "CIDR blocks allowed permanent SSH access to the VM (admin IPs)"
  type        = list(string)
  default     = []
}
