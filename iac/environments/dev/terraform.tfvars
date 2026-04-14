environment             = "dev"
oci_region              = "ca-toronto-1"
oci_ubuntu_arm_image_id = "ocid1.image.oc1.ca-toronto-1.aaaaaaaa5ytyuxnjzwlsx5irpxakrbyswzxqsunvx6dhx3ky2v2pxdhlc4q"
vcn_cidr                = "10.0.0.0/16"
ssh_public_key          = "PLACEHOLDER_SSH_PUBLIC_KEY"

# Development VM sizing (1 OCPU / 6GB RAM)
# Total Always Free: 4 OCPU / 24GB, so dev (1C/6GB) + staging ephemeral (1C/6GB) + prod (2C/6GB) = 4C/18GB
instance_ocpus  = 1
instance_memory = 6
