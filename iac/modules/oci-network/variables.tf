variable "compartment_id" { type = string }
variable "environment"    { type = string }
variable "region"         { type = string }
variable "vcn_cidr"       { type = string }
variable "tags"           { type = map(string) }

output "vcn_id"           { value = oci_core_vcn.main.id }
output "public_subnet_id" { value = oci_core_subnet.public.id }
output "nsg_vm_id"        { value = oci_core_network_security_group.vm.id }
