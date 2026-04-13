variable "compartment_id" {
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
  type = string
}

variable "cloud_init_script" {
  type = string
}

variable "tags" {
  type = map(string)
}
