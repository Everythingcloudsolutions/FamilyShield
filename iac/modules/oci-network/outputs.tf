###############################################################################
# Module: oci-network — Outputs
###############################################################################

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.main.id
}

output "public_subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.public.id
}

output "nsg_vm_id" {
  description = "OCID of the VM network security group"
  value       = oci_core_network_security_group.vm.id
}
