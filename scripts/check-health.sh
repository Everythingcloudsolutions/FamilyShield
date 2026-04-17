#!/bin/bash
# FamilyShield Health Check Script
# Checks all 11 services across dev and prod environments
# Can be run standalone or from GitHub Actions
#
# Usage:
#   ./scripts/check-health.sh dev
#   ./scripts/check-health.sh prod
#   ./scripts/check-health.sh all (default: both)

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse environment argument
ENVIRONMENTS=()
if [[ $# -eq 0 ]] || [[ "$1" == "all" ]]; then
  ENVIRONMENTS=("dev" "prod")
else
  ENVIRONMENTS=("$1")
fi

# Output files
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TIMESTAMP_COMPACT=$(date -u +%Y%m%d_%H%M%S)
REPORT_JSON="/tmp/familyshield-health-${TIMESTAMP_COMPACT}.json"
REPORT_MD="/tmp/familyshield-health-${TIMESTAMP_COMPACT}.md"

# ──────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ──────────────────────────────────────────────────────────────────────────────

# Check HTTP endpoint and return JSON result
check_http() {
  local url="$1"
  local name="$2"
  local expected_code="${3:-200}"

  local start_time=$(date +%s%N)
  local http_code=$(curl -s -w "%{http_code}" -o /dev/null -m 10 "$url" 2>/dev/null || echo "000")
  local end_time=$(date +%s%N)
  local elapsed_ms=$(( (end_time - start_time) / 1000000 ))

  local status="unhealthy"
  if [[ "$http_code" == "$expected_code" ]] || [[ "$http_code" == "200" ]] || [[ "$http_code" == "302" ]]; then
    status="healthy"
  elif [[ "$http_code" == "401" ]] || [[ "$http_code" == "403" ]]; then
    status="degraded"  # Auth required but reachable
  fi

  echo '{"name":"'$name'","status":"'$status'","http_code":'$http_code',"response_time_ms":'$elapsed_ms'}'
}

# Check internal service via SSH
check_internal() {
  local env="$1"
  local service_name="$2"
  local docker_cmd="$3"

  # If SSH credentials not available, return unknown
  if [[ -z "${CF_ACCESS_CLIENT_ID:-}" ]] || [[ -z "${CF_ACCESS_CLIENT_SECRET:-}" ]] || [[ -z "${OCI_SSH_PRIVATE_KEY:-}" ]]; then
    echo '{"name":"'$service_name'","status":"unknown","error":"SSH credentials not available"}'
    return
  fi

  local ssh_host="ssh-${env}.everythingcloud.ca"

  # Prepare SSH key
  mkdir -p ~/.ssh
  echo "$OCI_SSH_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/familyshield 2>/dev/null || true
  chmod 600 ~/.ssh/familyshield 2>/dev/null || true

  local start_time=$(date +%s%N)

  local output=$(ssh -i ~/.ssh/familyshield \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o ProxyCommand="cloudflared access ssh --hostname $ssh_host --service-token-id ${CF_ACCESS_CLIENT_ID} --service-token-secret ${CF_ACCESS_CLIENT_SECRET}" \
    "ubuntu@$ssh_host" "$docker_cmd" 2>/dev/null || echo "FAILED")

  local end_time=$(date +%s%N)
  local elapsed_ms=$(( (end_time - start_time) / 1000000 ))

  local status="unhealthy"
  if [[ "$output" == "PONG" ]] || [[ "$output" == *"PONG"* ]] || [[ "$output" == "OK" ]] || [[ "$output" == *"OK"* ]]; then
    status="healthy"
  fi

  echo '{"name":"'$service_name'","status":"'$status'","response_time_ms":'$elapsed_ms',"output":"'$output'"}'
}

# ──────────────────────────────────────────────────────────────────────────────
# Initialize Reports
# ──────────────────────────────────────────────────────────────────────────────

echo '{"timestamp":"'$TIMESTAMP'","environments":{' > "$REPORT_JSON"
echo "# 🏥 FamilyShield Health Report" > "$REPORT_MD"
echo "" >> "$REPORT_MD"
echo "**Generated:** \`$TIMESTAMP\`" >> "$REPORT_MD"
echo "" >> "$REPORT_MD"

# ──────────────────────────────────────────────────────────────────────────────
# Main Health Check Loop
# ──────────────────────────────────────────────────────────────────────────────

FIRST_ENV=true

for ENV in "${ENVIRONMENTS[@]}"; do
  echo "🔍 Checking $ENV environment..."

  if [[ "$FIRST_ENV" == false ]]; then
    echo "," >> "$REPORT_JSON"
  fi
  FIRST_ENV=false

  # Initialize environment section
  echo "\"$ENV\":{\"services\":[" >> "$REPORT_JSON"
  echo "" >> "$REPORT_MD"
  echo "## Environment: \`$ENV\`" >> "$REPORT_MD"
  echo "" >> "$REPORT_MD"
  echo "| Service | Status | Response Time |" >> "$REPORT_MD"
  echo "|---------|--------|----------------|" >> "$REPORT_MD"

  # Define services
  declare -a HTTPS_SERVICES=(
    "Portal|https://familyshield-${ENV}.everythingcloud.ca/"
    "API|https://api-${ENV}.everythingcloud.ca/health"
    "AdGuard Home|https://adguard-${ENV}.everythingcloud.ca/"
    "Headscale|https://vpn.familyshield-${ENV}.everythingcloud.ca/"
    "mitmproxy|https://mitmproxy-${ENV}.everythingcloud.ca/"
    "Grafana|https://grafana-${ENV}.everythingcloud.ca/api/health"
    "Node-RED|https://nodered-${ENV}.everythingcloud.ca/"
    "ntfy|https://notify-${ENV}.everythingcloud.ca/"
  )

  FIRST_SERVICE=true

  # Check HTTPS services
  for service_spec in "${HTTPS_SERVICES[@]}"; do
    IFS='|' read -r service_name service_url <<< "$service_spec"

    if [[ "$FIRST_SERVICE" == false ]]; then
      echo "," >> "$REPORT_JSON"
    fi
    FIRST_SERVICE=false

    result=$(check_http "$service_url" "$service_name")
    echo "$result" >> "$REPORT_JSON"

    # Extract status for markdown
    status=$(echo "$result" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    response_time=$(echo "$result" | grep -o '"response_time_ms":[0-9]*' | cut -d':' -f2)
    http_code=$(echo "$result" | grep -o '"http_code":[0-9]*' | cut -d':' -f2)

    if [[ "$status" == "healthy" ]]; then
      status_icon="✅"
    elif [[ "$status" == "degraded" ]]; then
      status_icon="⚠️"
    else
      status_icon="❌"
    fi

    echo "| $service_name | $status_icon HTTP $http_code | ${response_time}ms |" >> "$REPORT_MD"
  done

  # Check internal services if SSH credentials available
  if [[ -n "${CF_ACCESS_CLIENT_ID:-}" ]] && [[ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]] && [[ -n "${OCI_SSH_PRIVATE_KEY:-}" ]]; then
    echo "," >> "$REPORT_JSON"
    redis_result=$(check_internal "$ENV" "Redis" "docker exec familyshield-redis redis-cli ping")
    echo "$redis_result" >> "$REPORT_JSON"

    redis_status=$(echo "$redis_result" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    redis_time=$(echo "$redis_result" | grep -o '"response_time_ms":[0-9]*' | cut -d':' -f2)
    redis_icon=$([ "$redis_status" == "healthy" ] && echo "✅" || echo "❌")
    echo "| Redis | $redis_icon $redis_status | ${redis_time}ms |" >> "$REPORT_MD"

    echo "," >> "$REPORT_JSON"
    influx_result=$(check_internal "$ENV" "InfluxDB" "docker exec familyshield-influxdb influx ping")
    echo "$influx_result" >> "$REPORT_JSON"

    influx_status=$(echo "$influx_result" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    influx_time=$(echo "$influx_result" | grep -o '"response_time_ms":[0-9]*' | cut -d':' -f2)
    influx_icon=$([ "$influx_status" == "healthy" ] && echo "✅" || echo "❌")
    echo "| InfluxDB | $influx_icon $influx_status | ${influx_time}ms |" >> "$REPORT_MD"
  fi

  echo "" >> "$REPORT_JSON"
  echo "]}" >> "$REPORT_JSON"
  echo "" >> "$REPORT_MD"
done

# Close JSON
echo "" >> "$REPORT_JSON"
echo "}}" >> "$REPORT_JSON"

# ──────────────────────────────────────────────────────────────────────────────
# Output Reports
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo "✅ Health check complete"
echo ""
echo "📄 Reports:"
echo "  JSON: $REPORT_JSON"
echo "  MD:   $REPORT_MD"
echo ""

# For GitHub Actions, output paths as environment variables
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "report_json=$REPORT_JSON" >> "$GITHUB_OUTPUT"
  echo "report_md=$REPORT_MD" >> "$GITHUB_OUTPUT"
  echo "timestamp=$TIMESTAMP" >> "$GITHUB_OUTPUT"
fi

# Print markdown report to stdout
cat "$REPORT_MD"
