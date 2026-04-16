variable "compartment_id" {
  type = string
}

variable "tenancy_ocid" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "ssh_public_key" {
  type      = string
  sensitive = true
}

variable "instance_shape" {
  type    = string
  default = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  type    = number
  default = 4
}

variable "memory_in_gbs" {
  type    = number
  default = 24
}

variable "image_id" {
  type        = string
  default     = "" # If empty, dynamically query for Ubuntu 22.04 ARM image
  description = "OCI image OCID. If empty, automatically queries for Ubuntu 22.04 ARM image compatible with instance shape."
}

variable "cloud_init_script" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "nsg_ids" {
  description = "List of NSG OCIDs to attach to the VM VNIC"
  type        = list(string)
  default     = []
}
