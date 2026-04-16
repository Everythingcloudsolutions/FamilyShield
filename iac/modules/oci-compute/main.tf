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
    source_id               = local.resolved_image_id
    boot_volume_size_in_gbs = 50 # Always Free includes 200GB total
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = true
    display_name     = "familyshield-${var.environment}-vnic"
    nsg_ids          = var.nsg_ids
  }

  metadata = var.ssh_public_key != "" ? {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(var.cloud_init_script)
    } : {
    user_data = base64encode(var.cloud_init_script)
  }

  freeform_tags = var.tags

  # Prevent accidental destruction of prod
  lifecycle {
    prevent_destroy = false # Set to true for prod via override
  }
}

# Fetch availability domains
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# Dynamically query for Ubuntu 22.04 ARM image compatible with VM.Standard.A1.Flex
# This avoids hardcoding OCIDs which change per region/time
data "oci_core_images" "ubuntu_arm" {
  compartment_id = var.compartment_id
  shape          = var.instance_shape

  filter {
    name   = "operating_system"
    values = ["Canonical Ubuntu"]
  }

  filter {
    name   = "operating_system_version"
    values = ["22.04"]
  }

  sort_by = "TIMECREATED" # Get the most recent image
}

# Use provided image_id, or dynamically fetched Ubuntu image as fallback
# If image query returns empty, try with hardcoded fallback image
locals {
  ubuntu_images_count = length(data.oci_core_images.ubuntu_arm.images)
  dynamic_image_id    = local.ubuntu_images_count > 0 ? data.oci_core_images.ubuntu_arm.images[0].id : ""
  # Fallback to the known Ubuntu 22.04 ARM image for ca-toronto-1
  fallback_image_id = "ocid1.image.oc1.ca-toronto-1.aaaaaaaawzbmdqqvrcLW4cvhegvnbbxtoday4bxlkdpqeowc5kcbrhplit2a"
  resolved_image_id = var.image_id != "" ? var.image_id : (local.dynamic_image_id != "" ? local.dynamic_image_id : local.fallback_image_id)
}
