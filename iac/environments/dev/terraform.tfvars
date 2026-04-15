environment = "dev"
oci_region  = "ca-toronto-1"
vcn_cidr    = "10.0.0.0/16"
# Development VM sizing (1 OCPU / 6GB RAM)
# Total Always Free: 4 OCPU / 24GB, so dev (1C/6GB) + staging ephemeral (1C/6GB) + prod (2C/6GB) = 4C/18GB
instance_ocpus  = 1
instance_memory = 6

# Note: Ubuntu 22.04 ARM image OCID is automatically queried by the compute module
# based on region and VM shape (VM.Standard.A1.Flex), so no need to hardcode it here
