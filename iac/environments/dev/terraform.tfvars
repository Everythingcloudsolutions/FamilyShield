environment            = "dev"
oci_region             = "ca-toronto-1"
oci_ubuntu_arm_image_id = "ocid1.image.oc1.ca-toronto-1.aaaaaaaa5ytyuxnjzwlsx5irpxakrbyswzxqsunvx6dhx3ky2v2pxdhlc4q"
vcn_cidr              = "10.0.0.0/16"
ssh_public_key        = "PLACEHOLDER_SSH_PUBLIC_KEY"

# CORRECTED: 2 OCPU / 6GB RAM (actual Always Free limit)
instance_ocpus = 2
instance_memory = 6

tags = {
  Project     = "FamilyShield"
  Environment = "dev"
  ManagedBy   = "OpenTofu"
  CreatedDate = "2026-04-13"
}
