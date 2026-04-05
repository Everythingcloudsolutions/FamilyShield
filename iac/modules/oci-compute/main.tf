###############################################################################
# Module: oci-compute
# Always Free ARM VM: VM.Standard.A1.Flex — 4 OCPU / 24GB RAM
###############################################################################

resource "oci_core_instance" "familyshield" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "familyshield-${var.environment}-vm"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_in_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = var.image_id
    boot_volume_size_in_gbs = 50 # Always Free includes 200GB total
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = true
    display_name     = "familyshield-${var.environment}-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(var.cloud_init_script)
  }

  freeform_tags = var.tags

  # Prevent accidental destruction of prod
  lifecycle {
    prevent_destroy = false # Set to true for prod via override
  }
}

# Fetch availability domains
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}
