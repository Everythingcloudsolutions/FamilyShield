#!/bin/bash
###############################################################################
# Cloudflare API Helper
# Manages Cloudflare resources (tunnel, DNS, access) via API
# Depends on: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID
###############################################################################

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

API_BASE_URL="https://api.cloudflare.com/client/v4"
ROOT_DOMAIN="everythingcloud.ca"

# ─────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────────────────────────────────────

die() {
  echo "❌ $*" >&2
  exit 1
}

info() {
  echo "ℹ️ $*"
}

success() {
  echo "✅ $*"
}

header() {
  echo ""
  echo "─────────────────────────────────────────────────────────────────────────────"
  echo "$*"
  echo "─────────────────────────────────────────────────────────────────────────────"
}

validate_env() {
  [ -n "$ZONE_ID" ] || die "CLOUDFLARE_ZONE_ID not set"
  [ -n "$ACCOUNT_ID" ] || die "CLOUDFLARE_ACCOUNT_ID not set"
  [ -n "$API_TOKEN" ] || die "CLOUDFLARE_API_TOKEN not set"
}

cf_api() {
  local method=$1
  local endpoint=$2
  local data=${3:-}

  local args=(
    -X "$method"
    -H "Authorization: Bearer $API_TOKEN"
    -H "Content-Type: application/json"
  )

  if [ -n "$data" ]; then
    args+=(-d "$data")
  fi

  curl -s "${args[@]}" "$API_BASE_URL$endpoint"
}

# ─────────────────────────────────────────────────────────────────────────────
# Tunnel Management
# ─────────────────────────────────────────────────────────────────────────────

create_tunnel() {
  local environment=$1
  local tunnel_secret=$2

  header "Creating Cloudflare Tunnel: familyshield-$environment"

  # Check if tunnel already exists
  local existing=$(cf_api GET "/accounts/$ACCOUNT_ID/cfd_tunnel?name=familyshield-$environment" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  if [ -n "$existing" ]; then
    info "Tunnel already exists: $existing"
    echo "$existing"
    return 0
  fi

  # Create tunnel
  local payload=$(cat <<EOF
{
  "name": "familyshield-$environment",
  "tunnel_secret": "$(echo -n "$tunnel_secret" | base64)"
}
EOF
)

  local response=$(cf_api POST "/accounts/$ACCOUNT_ID/cfd_tunnel" "$payload")
  local tunnel_id=$(echo "$response" | jq -r '.result.id' 2>/dev/null || echo "")

  [ -n "$tunnel_id" ] || die "Failed to create tunnel: $(echo "$response" | jq -r '.errors[0].message // .errors // .' 2>/dev/null)"

  success "Tunnel created: $tunnel_id"
  echo "$tunnel_id"
}

get_tunnel_token() {
  local tunnel_id=$1

  header "Getting Tunnel Token: $tunnel_id"

  local response=$(cf_api GET "/accounts/$ACCOUNT_ID/cfd_tunnel/$tunnel_id/token")
  local token=$(echo "$response" | jq -r '.result // .errors // .' 2>/dev/null)

  [ -n "$token" ] && [ "$token" != "null" ] || die "Failed to get tunnel token"

  success "Tunnel token retrieved"
  echo "$token"
}

delete_tunnel() {
  local tunnel_id=$1

  header "Deleting Tunnel: $tunnel_id"

  # First, clean up any tunnel configs
  cf_api DELETE "/accounts/$ACCOUNT_ID/cfd_tunnel/$tunnel_id/configurations" "{}" || true

  # Delete tunnel
  local response=$(cf_api DELETE "/accounts/$ACCOUNT_ID/cfd_tunnel/$tunnel_id" "")

  if echo "$response" | jq -e '.success == false' >/dev/null 2>&1; then
    info "Tunnel already deleted or not found"
    return 0
  fi

  success "Tunnel deleted: $tunnel_id"
}

# ─────────────────────────────────────────────────────────────────────────────
# DNS Records
# ─────────────────────────────────────────────────────────────────────────────

create_dns_record() {
  local name=$1
  local tunnel_id=$2

  local fqdn="$name.$ROOT_DOMAIN"
  local target="${tunnel_id}.cfargotunnel.com"

  header "Creating DNS CNAME: $fqdn → $target"

  # Check if record exists
  local existing=$(cf_api GET "/zones/$ZONE_ID/dns_records?name=$fqdn&type=CNAME" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  if [ -n "$existing" ]; then
    info "DNS record already exists: $existing"
    echo "$existing"
    return 0
  fi

  local payload=$(cat <<EOF
{
  "type": "CNAME",
  "name": "$fqdn",
  "content": "$target",
  "ttl": 1,
  "proxied": true,
  "comment": "FamilyShield Cloudflare Tunnel"
}
EOF
)

  local response=$(cf_api POST "/zones/$ZONE_ID/dns_records" "$payload")
  local record_id=$(echo "$response" | jq -r '.result.id' 2>/dev/null || echo "")

  [ -n "$record_id" ] || die "Failed to create DNS record: $(echo "$response" | jq -r '.errors[0].message // .errors // .' 2>/dev/null)"

  success "DNS record created: $fqdn ($record_id)"
  echo "$record_id"
}

delete_dns_record() {
  local name=$1

  local fqdn="$name.$ROOT_DOMAIN"

  header "Deleting DNS record: $fqdn"

  local record_id=$(cf_api GET "/zones/$ZONE_ID/dns_records?name=$fqdn" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  [ -z "$record_id" ] && { info "DNS record not found: $fqdn"; return 0; }

  local response=$(cf_api DELETE "/zones/$ZONE_ID/dns_records/$record_id" "")

  if echo "$response" | jq -e '.success == false' >/dev/null 2>&1; then
    die "Failed to delete DNS record: $(echo "$response" | jq -r '.errors[0].message // .' 2>/dev/null)"
  fi

  success "DNS record deleted: $fqdn"
}

# ─────────────────────────────────────────────────────────────────────────────
# Access Applications (Zero Trust)
# ─────────────────────────────────────────────────────────────────────────────

create_access_application() {
  local app_name=$1
  local fqdn=$2

  header "Creating Access Application: $app_name ($fqdn)"

  # Check if already exists
  local existing=$(cf_api GET "/zones/$ZONE_ID/access/apps?name=$app_name" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  if [ -n "$existing" ]; then
    info "Access app already exists: $existing"
    echo "$existing"
    return 0
  fi

  local payload=$(cat <<EOF
{
    "name": "$app_name",
    "domain": "$fqdn",
    "type": "self_hosted",
    "session_duration": "8h",
    "tags": ["familyshield", "admin"]
  }
EOF
)

  local response=$(cf_api POST "/zones/$ZONE_ID/access/apps" "$payload")
  local app_id=$(echo "$response" | jq -r '.result.id' 2>/dev/null || echo "")

  [ -n "$app_id" ] || die "Failed to create access app: $(echo "$response" | jq -r '.errors[0].message // .errors // .' 2>/dev/null)"

  success "Access application created: $app_name ($app_id)"
  echo "$app_id"
}

delete_access_application() {
  local app_name=$1

  header "Deleting Access Application: $app_name"

  local app_id=$(cf_api GET "/zones/$ZONE_ID/access/apps?name=$app_name" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  [ -z "$app_id" ] && { info "Access app not found: $app_name"; return 0; }

  local response=$(cf_api DELETE "/zones/$ZONE_ID/access/apps/$app_id" "")

  if echo "$response" | jq -e '.success == false' >/dev/null 2>&1; then
    die "Failed to delete access app: $(echo "$response" | jq -r '.errors[0].message // .' 2>/dev/null)"
  fi

  success "Access application deleted: $app_name"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Orchestration
# ─────────────────────────────────────────────────────────────────────────────

setup_cloudflare() {
  local environment=$1
  local tunnel_secret=$2
  local admin_emails=$3

  header "CLOUDFLARE SETUP — $environment"

  validate_env

  # 1. Create tunnel
  local tunnel_id=$(create_tunnel "$environment" "$tunnel_secret")

  # 2. Get tunnel token (will be used by mitmproxy)
  local tunnel_token=$(get_tunnel_token "$tunnel_id")

  # 3. Create DNS records
  create_dns_record "familyshield-$environment" "$tunnel_id"
  create_dns_record "adguard-$environment" "$tunnel_id"
  create_dns_record "grafana-$environment" "$tunnel_id"
  create_dns_record "vpn.familyshield-$environment" "$tunnel_id"

  # 4. Create Access Applications
  create_access_application \
    "FamilyShield AdGuard $environment" \
    "adguard-$environment.$ROOT_DOMAIN"

  create_access_application \
    "FamilyShield Grafana $environment" \
    "grafana-$environment.$ROOT_DOMAIN"

  # 5. Output for workflow
  echo "TUNNEL_ID=$tunnel_id" >> "$GITHUB_OUTPUT" 2>/dev/null || true
  echo "TUNNEL_TOKEN=$tunnel_token" >> "$GITHUB_OUTPUT" 2>/dev/null || true

  header "✅ CLOUDFLARE SETUP COMPLETE"
  echo ""
  echo "Tunnel ID:    $tunnel_id"
  echo "Tunnel Token: $(echo "$tunnel_token" | cut -c1-20)..."
  echo "DNS Records:  4 CNAME records created"
  echo "Access Apps:  AdGuard + Grafana (Zero Trust)"
}

cleanup_cloudflare() {
  local environment=$1

  header "CLOUDFLARE CLEANUP — $environment"

  validate_env

  # Find tunnel by name
  local tunnel_id=$(cf_api GET "/accounts/$ACCOUNT_ID/cfd_tunnel?name=familyshield-$environment" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  if [ -z "$tunnel_id" ]; then
    info "Tunnel not found: familyshield-$environment"
  else
    delete_tunnel "$tunnel_id"
  fi

  # Delete DNS records
  delete_dns_record "familyshield-$environment"
  delete_dns_record "adguard-$environment"
  delete_dns_record "grafana-$environment"
  delete_dns_record "vpn.familyshield-$environment"

  # Delete Access Applications
  delete_access_application "FamilyShield AdGuard $environment"
  delete_access_application "FamilyShield Grafana $environment"

  header "✅ CLOUDFLARE CLEANUP COMPLETE"
}

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local command=${1:-}

  case "$command" in
    setup)
      setup_cloudflare "${2:-}" "${3:-}" "${4:-}"
      ;;
    cleanup)
      cleanup_cloudflare "${2:-}"
      ;;
    *)
      cat <<EOF
Usage: $0 <command> [args]

Commands:
  setup <environment> <tunnel_secret> <admin_emails>    Create Cloudflare resources
  cleanup <environment>                                  Delete Cloudflare resources

Examples:
  $0 setup dev "my-secret-12345" "admin@example.com"
  $0 cleanup dev

Environment variables required:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_ZONE_ID
EOF
      exit 1
      ;;
  esac
}

main "$@"
