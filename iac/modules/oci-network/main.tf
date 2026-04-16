###############################################################################
# Module: oci-network
# Creates VCN, subnets, Internet Gateway, route tables, NSGs
###############################################################################

# VCN
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "familyshield-${var.environment}-vcn"
  dns_label      = "familyshield${var.environment}"
  freeform_tags  = var.tags
}

# Internet Gateway
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "familyshield-${var.environment}-igw"
  enabled        = true
  freeform_tags  = var.tags
}

# Route Table
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "familyshield-${var.environment}-rt-public"
  freeform_tags  = var.tags

  route_rules {
    network_entity_id = oci_core_internet_gateway.main.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

# Public Subnet
resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = cidrsubnet(var.vcn_cidr, 8, 1)
  display_name      = "familyshield-${var.environment}-subnet-public"
  dns_label         = "public"
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.main.id]
  freeform_tags     = var.tags
}

# Security List — minimal ingress, all egress
resource "oci_core_security_list" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "familyshield-${var.environment}-sl"
  freeform_tags  = var.tags

  # Allow all egress (OCI default)
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH — restricted via admin_ssh_cidrs variable (static IPs in security list)
  # Dynamic CI rules are managed via NSG in workflows
  dynamic "ingress_security_rules" {
    for_each = var.admin_ssh_cidrs
    content {
      protocol = "6" # TCP
      source   = ingress_security_rules.value
      tcp_options {
        min = 22
        max = 22
      }
    }
  }

  # WireGuard VPN (UDP 51820)
  ingress_security_rules {
    protocol = "17" # UDP
    source   = "0.0.0.0/0"
    udp_options {
      min = 51820
      max = 51820
    }
  }

  # AdGuard DNS over HTTPS (TCP/UDP 443) — Cloudflare Tunnel handles this
  # Cloudflare Tunnel is outbound-only — NO inbound HTTP/HTTPS needed

  # ICMP ping (optional, useful for troubleshooting)
  ingress_security_rules {
    protocol = "1" # ICMP
    source   = "0.0.0.0/0"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

# Network Security Group for VM
resource "oci_core_network_security_group" "vm" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "familyshield-${var.environment}-nsg-vm"
  freeform_tags  = var.tags
}

# NSG Rules — SSH from admin IPs (static, permanent access)
# Dynamic CI rules are added/removed per workflow run via OCI CLI
resource "oci_core_network_security_group_security_rule" "ssh_admin" {
  for_each                  = toset(var.admin_ssh_cidrs)
  network_security_group_id = oci_core_network_security_group.vm.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = each.value
  source_type               = "CIDR_BLOCK"
  stateless                 = false
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}
