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
  echo "ℹ️ $*" >&2
}

success() {
  echo "✅ $*" >&2
}

header() {
  echo "" >&2
  echo "─────────────────────────────────────────────────────────────────────────────" >&2
  echo "$*" >&2
  echo "─────────────────────────────────────────────────────────────────────────────" >&2
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

  # Debug: print full response if creation fails
  if ! echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
    echo "API Response:" >&2
    echo "$response" | jq '.' >&2
    die "Tunnel creation failed"
  fi

  local tunnel_id=$(echo "$response" | jq -r '.result.id // empty' 2>/dev/null)

  [ -n "$tunnel_id" ] || die "Failed to extract tunnel ID from response"

  success "Tunnel created: $tunnel_id"
  echo "$tunnel_id"
}

configure_tunnel_routes() {
  local tunnel_id=$1
  local environment=$2

  header "Configuring Tunnel Routes: $tunnel_id"

  # Validate tunnel_id
  if [ -z "$tunnel_id" ] || [ "$tunnel_id" = "null" ]; then
    die "Invalid tunnel_id: $tunnel_id (must be a valid UUID)"
  fi

  # Tunnel ingress configuration
  local payload=$(cat <<'CONFIG_EOF'
{
  "config": {
    "ingress": [
      {
        "hostname": "familyshield-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:3000"
      },
      {
        "hostname": "api-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:3001"
      },
      {
        "hostname": "adguard-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:3080"
      },
      {
        "hostname": "mitmproxy-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:8080"
      },
      {
        "hostname": "vpn.familyshield-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:8080"
      },
      {
        "hostname": "grafana-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:3000"
      },
      {
        "hostname": "nodered-ENVIRONMENT.everythingcloud.ca",
        "service": "http://localhost:1880"
      },
      {
        "hostname": "ssh-ENVIRONMENT.everythingcloud.ca",
        "service": "ssh://localhost:22"
      },
      {
        "service": "http_status:404"
      }
    ]
  }
}
CONFIG_EOF
)

  # Replace ENVIRONMENT placeholder with actual environment
  payload=$(echo "$payload" | sed "s/ENVIRONMENT/$environment/g")

  local response=$(cf_api PUT "/accounts/$ACCOUNT_ID/cfd_tunnel/$tunnel_id/configurations" "$payload")

  # Check if configuration succeeded
  if echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
    success "Tunnel routes configured"
    return 0
  fi

  # If not success, print response for debugging and continue (non-fatal warning)
  info "⚠️  Tunnel configuration warning:"
  echo "$response" | jq '.' >&2
  info "Continuing despite configuration warning..."
}

get_tunnel_token() {
  local tunnel_id=$1

  header "Getting Tunnel Token: $tunnel_id"

  # Validate tunnel_id is a proper UUID
  if [ -z "$tunnel_id" ] || [ "$tunnel_id" = "null" ]; then
    die "Invalid tunnel_id: $tunnel_id (must be a valid UUID)"
  fi

  local response
  response=$(cf_api GET "/accounts/$ACCOUNT_ID/cfd_tunnel/$tunnel_id/token")

  # Debug: print full response if token retrieval fails
  if ! echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
    echo "API Response:" >&2
    echo "$response" | jq '.' >&2
    die "Failed to get tunnel token"
  fi

  local token
  token=$(echo "$response" | jq -r '.result // empty' 2>/dev/null)

  [ -n "$token" ] || die "Failed to extract token from response"

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

create_ssh_access_app() {
  local environment=$1
  local fqdn="ssh-$environment.$ROOT_DOMAIN"
  local app_name="FamilyShield SSH $environment"

  header "Creating SSH Access Application: $app_name"

  # Check if already exists
  local existing=$(cf_api GET "/zones/$ZONE_ID/access/apps?name=$app_name" | jq -r '.result[0].id // empty' 2>/dev/null || echo "")

  if [ -n "$existing" ]; then
    info "SSH Access app already exists: $existing"
    echo "$existing"
    return 0
  fi

  local payload=$(cat <<EOF
{
  "name": "$app_name",
  "domain": "$fqdn",
  "type": "ssh",
  "session_duration": "8h",
  "tags": ["familyshield", "ssh"]
}
EOF
)

  local response=$(cf_api POST "/zones/$ZONE_ID/access/apps" "$payload")
  local app_id=$(echo "$response" | jq -r '.result.id' 2>/dev/null || echo "")

  [ -n "$app_id" ] || die "Failed to create SSH access app: $(echo "$response" | jq -r '.errors[0].message // .errors // .' 2>/dev/null)"

  success "SSH Access app created: $app_name ($app_id)"
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
  local tunnel_id
  tunnel_id=$(create_tunnel "$environment" "$tunnel_secret")

  # 2. Configure tunnel routes (ingress rules)
  configure_tunnel_routes "$tunnel_id" "$environment"

  # 3. Get tunnel token (will be used by mitmproxy)
  local tunnel_token
  tunnel_token=$(get_tunnel_token "$tunnel_id")

  # 4. Create DNS records
  create_dns_record "ssh-$environment" "$tunnel_id"
  create_dns_record "familyshield-$environment" "$tunnel_id"
  create_dns_record "api-$environment" "$tunnel_id"
  create_dns_record "adguard-$environment" "$tunnel_id"
  create_dns_record "mitmproxy-$environment" "$tunnel_id"
  create_dns_record "grafana-$environment" "$tunnel_id"
  create_dns_record "vpn.familyshield-$environment" "$tunnel_id"
  create_dns_record "nodered-$environment" "$tunnel_id"

  # 5. Create Access Applications (Zero Trust)
  create_access_application \
    "FamilyShield AdGuard $environment" \
    "adguard-$environment.$ROOT_DOMAIN"

  create_access_application \
    "FamilyShield Grafana $environment" \
    "grafana-$environment.$ROOT_DOMAIN"

  create_ssh_access_app "$environment"

  # 6. Output for workflow
  echo "TUNNEL_ID=$tunnel_id" >> "$GITHUB_OUTPUT" 2>/dev/null || true
  echo "TUNNEL_TOKEN=$tunnel_token" >> "$GITHUB_OUTPUT" 2>/dev/null || true

  header "✅ CLOUDFLARE SETUP COMPLETE"
  echo ""
  echo "Tunnel ID:    $tunnel_id"
  echo "Tunnel Token: $(echo "$tunnel_token" | cut -c1-20)..."
  echo "DNS Records:  8 CNAME records created"
  echo "Access Apps:  AdGuard + Grafana + SSH (Zero Trust)"
  echo ""
  echo "Routes configured for:"
  echo "  - familyshield-$environment.everythingcloud.ca → Portal (port 3000)"
  echo "  - api-$environment.everythingcloud.ca → API (port 3001)"
  echo "  - adguard-$environment.everythingcloud.ca → AdGuard (port 3080)"
  echo "  - mitmproxy-$environment.everythingcloud.ca → mitmproxy (port 8080)"
  echo "  - vpn.familyshield-$environment.everythingcloud.ca → Headscale (port 8080)"
  echo "  - grafana-$environment.everythingcloud.ca → Grafana (port 3000)"
  echo "  - nodered-$environment.everythingcloud.ca → Node-RED (port 1880)"
  echo "  - ssh-$environment.everythingcloud.ca → SSH (port 22)"
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
  delete_dns_record "ssh-$environment"
  delete_dns_record "familyshield-$environment"
  delete_dns_record "api-$environment"
  delete_dns_record "adguard-$environment"
  delete_dns_record "mitmproxy-$environment"
  delete_dns_record "grafana-$environment"
  delete_dns_record "vpn.familyshield-$environment"
  delete_dns_record "nodered-$environment"

  # Delete Access Applications
  delete_access_application "FamilyShield AdGuard $environment"
  delete_access_application "FamilyShield Grafana $environment"
  delete_access_application "FamilyShield SSH $environment"

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
