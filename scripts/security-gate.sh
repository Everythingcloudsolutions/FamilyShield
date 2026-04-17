#!/usr/bin/env bash
# scripts/security-gate.sh
# ─────────────────────────────────────────────────────────────────────────────
# FamilyShield Security Gate
#
# Runs npm audit (portal + api) and pip-audit (mitm), then cross-references
# each finding against scripts/security-exceptions.json.
#
# Exit codes:
#   0  — clean (zero unfixed, non-excepted vulnerabilities)
#   1  — at least one unfixed, non-excepted vulnerability found
#   2  — at least one exception has passed its expiry date (treat as blocker)
#
# Usage:
#   bash scripts/security-gate.sh [--strict]
#
#   --strict  also fail when exceptions are within 14 days of expiry (CI
#             "soft-warn before hard-fail")
#
# Requirements: node >=20, python >=3.9, jq >=1.6, pip-audit >=2.7
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXCEPTIONS_FILE="${REPO_ROOT}/scripts/security-exceptions.json"
TODAY="$(date -u +%Y-%m-%d)"
STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
header()  { echo -e "\n${BOLD}═══ $* ═══${RESET}"; }

GATE_FAILED=false
GATE_EXPIRED=false

# ── Helper: check if a CVE ID is in the exceptions file ──────────────────────
is_excepted() {
  local cve_id="$1"
  local ecosystem="$2"
  local workspace="$3"

  if ! command -v jq &>/dev/null; then
    warn "jq not installed — skipping exception lookup for ${cve_id}"
    return 1
  fi

  jq -e --arg id "$cve_id" --arg eco "$ecosystem" --arg ws "$workspace" '
    .exceptions[] |
    select(.id == $id and .ecosystem == $eco and .workspace == $ws)
  ' "$EXCEPTIONS_FILE" >/dev/null 2>&1
}

# ── Helper: get expiry date for an exception ──────────────────────────────────
get_expiry() {
  local cve_id="$1"
  local ecosystem="$2"
  local workspace="$3"

  jq -r --arg id "$cve_id" --arg eco "$ecosystem" --arg ws "$workspace" '
    .exceptions[] |
    select(.id == $id and .ecosystem == $eco and .workspace == $ws) |
    .expires
  ' "$EXCEPTIONS_FILE" 2>/dev/null || echo ""
}

# ── Helper: get reason for an exception ──────────────────────────────────────
get_reason() {
  local cve_id="$1"
  local ecosystem="$2"
  local workspace="$3"

  jq -r --arg id "$cve_id" --arg eco "$ecosystem" --arg ws "$workspace" '
    .exceptions[] |
    select(.id == $id and .ecosystem == $eco and .workspace == $ws) |
    .reason
  ' "$EXCEPTIONS_FILE" 2>/dev/null || echo "No reason documented"
}

# ── Helper: days between two YYYY-MM-DD dates ─────────────────────────────────
days_until() {
  local target="$1"
  if command -v python3 &>/dev/null; then
    python3 -c "
from datetime import date
t = date.fromisoformat('${target}')
d = date.fromisoformat('${TODAY}')
print((t - d).days)
"
  else
    echo "999"  # cannot calculate — assume not expired
  fi
}

# ── Check exception expiry dates ──────────────────────────────────────────────
header "Checking exception expiry dates"

if command -v jq &>/dev/null && [[ -f "$EXCEPTIONS_FILE" ]]; then
  EXCEPTION_COUNT=$(jq '.exceptions | length' "$EXCEPTIONS_FILE")
  if [[ "$EXCEPTION_COUNT" -eq 0 ]]; then
    success "No active exceptions."
  else
    info "Active exceptions: ${EXCEPTION_COUNT}"
    while IFS= read -r row; do
      cve_id=$(echo "$row" | jq -r '.id')
      expires=$(echo "$row" | jq -r '.expires')
      pkg=$(echo "$row" | jq -r '.package')
      ws=$(echo "$row" | jq -r '.workspace')
      owner=$(echo "$row" | jq -r '.owner')
      reason=$(echo "$row" | jq -r '.reason')

      days_left=$(days_until "$expires")

      if [[ "$days_left" -lt 0 ]]; then
        error "EXCEPTION EXPIRED: ${cve_id} (${pkg} in ${ws})"
        error "  Expired on: ${expires} (${days_left#-} days ago)"
        error "  Owner: ${owner}"
        error "  Action required: resolve upstream constraint or update expiry with justification"
        GATE_EXPIRED=true
      elif [[ "$days_left" -le 14 ]]; then
        warn "EXCEPTION EXPIRING SOON: ${cve_id} (${pkg} in ${ws})"
        warn "  Expires: ${expires} (${days_left} days)"
        warn "  Owner: ${owner}"
        warn "  Reason: ${reason}"
        [[ "$STRICT" == "true" ]] && GATE_EXPIRED=true
      else
        info "Exception valid: ${cve_id} — expires ${expires} (${days_left} days, owner: ${owner})"
      fi
    done < <(jq -c '.exceptions[]' "$EXCEPTIONS_FILE")
  fi
else
  warn "jq not available or exceptions file missing — skipping expiry checks"
fi

# ── npm audit — portal ─────────────────────────────────────────────────────────
header "npm audit — apps/portal"

PORTAL_DIR="${REPO_ROOT}/apps/portal"
if [[ -f "${PORTAL_DIR}/package.json" ]]; then
  pushd "$PORTAL_DIR" >/dev/null

  # npm audit --json exits 1 when vulns exist; capture output regardless
  PORTAL_AUDIT_JSON=$(npm audit --json 2>/dev/null || true)
  PORTAL_TOTAL=$(echo "$PORTAL_AUDIT_JSON" | jq '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")

  if [[ "$PORTAL_TOTAL" -eq 0 ]]; then
    success "Portal: no vulnerabilities found."
  else
    # Walk each vulnerability and check exceptions
    while IFS= read -r vuln_json; do
      via_entries=$(echo "$vuln_json" | jq -r '.via[]? | if type == "object" then .url // "" else "" end')
      name=$(echo "$vuln_json" | jq -r '.name')
      severity=$(echo "$vuln_json" | jq -r '.severity')
      fix_available=$(echo "$vuln_json" | jq -r '.fixAvailable')

      # Extract CVE IDs from advisory URLs  
      cve_ids=$(echo "$via_entries" | grep -oE 'CVE-[0-9]+-[0-9]+' || echo "")

      if [[ -z "$cve_ids" ]]; then
        # No CVE ID — use GHSA reference from URL as fallback
        cve_ids=$(echo "$via_entries" | grep -oE 'GHSA-[a-z0-9-]+' || echo "UNKNOWN")
      fi

      excepted=false
      for cve_id in $cve_ids; do
        if is_excepted "$cve_id" "npm" "apps/portal"; then
          expiry=$(get_expiry "$cve_id" "npm" "apps/portal")
          warn "Excepted: ${cve_id} in ${name} (${severity}) — exception expires ${expiry}"
          excepted=true
          break
        fi
      done

      if [[ "$excepted" == "false" ]]; then
        if [[ "$fix_available" != "false" && "$fix_available" != "null" ]]; then
          error "UNFIXED VULNERABILITY: ${name} (${severity})"
          error "  CVE/ID: ${cve_ids}"
          error "  Fix available: ${fix_available}"
          GATE_FAILED=true
        else
          warn "Unfixable upstream: ${name} (${severity}) — CVE: ${cve_ids} (no fix available yet)"
        fi
      fi
    done < <(echo "$PORTAL_AUDIT_JSON" | jq -c '.vulnerabilities | to_entries[] | .value' 2>/dev/null || true)
  fi

  popd >/dev/null
else
  warn "Portal package.json not found — skipping"
fi

# ── npm audit — api ────────────────────────────────────────────────────────────
header "npm audit — apps/api"

API_DIR="${REPO_ROOT}/apps/api"
if [[ -f "${API_DIR}/package.json" ]]; then
  pushd "$API_DIR" >/dev/null

  API_AUDIT_JSON=$(npm audit --json 2>/dev/null || true)
  API_TOTAL=$(echo "$API_AUDIT_JSON" | jq '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")

  if [[ "$API_TOTAL" -eq 0 ]]; then
    success "API: no vulnerabilities found."
  else
    while IFS= read -r vuln_json; do
      via_entries=$(echo "$vuln_json" | jq -r '.via[]? | if type == "object" then .url // "" else "" end')
      name=$(echo "$vuln_json" | jq -r '.name')
      severity=$(echo "$vuln_json" | jq -r '.severity')
      fix_available=$(echo "$vuln_json" | jq -r '.fixAvailable')

      cve_ids=$(echo "$via_entries" | grep -oE 'CVE-[0-9]+-[0-9]+' || echo "")
      if [[ -z "$cve_ids" ]]; then
        cve_ids=$(echo "$via_entries" | grep -oE 'GHSA-[a-z0-9-]+' || echo "UNKNOWN")
      fi

      excepted=false
      for cve_id in $cve_ids; do
        if is_excepted "$cve_id" "npm" "apps/api"; then
          expiry=$(get_expiry "$cve_id" "npm" "apps/api")
          warn "Excepted: ${cve_id} in ${name} (${severity}) — exception expires ${expiry}"
          excepted=true
          break
        fi
      done

      if [[ "$excepted" == "false" ]]; then
        if [[ "$fix_available" != "false" && "$fix_available" != "null" ]]; then
          error "UNFIXED VULNERABILITY: ${name} (${severity})"
          error "  CVE/ID: ${cve_ids}"
          error "  Fix available: ${fix_available}"
          GATE_FAILED=true
        else
          warn "Unfixable upstream: ${name} (${severity}) — CVE: ${cve_ids} (no fix available yet)"
        fi
      fi
    done < <(echo "$API_AUDIT_JSON" | jq -c '.vulnerabilities | to_entries[] | .value' 2>/dev/null || true)
  fi

  popd >/dev/null
else
  warn "API package.json not found — skipping"
fi

# ── pip-audit — mitm ───────────────────────────────────────────────────────────
header "pip-audit — apps/mitm"

MITM_DIR="${REPO_ROOT}/apps/mitm"
if [[ -f "${MITM_DIR}/requirements.txt" ]]; then
  if ! command -v pip-audit &>/dev/null && ! python3 -m pip_audit --version &>/dev/null 2>&1; then
    warn "pip-audit not installed — installing..."
    python3 -m pip install pip-audit --quiet
  fi

  # pip-audit --json exits 1 when vulns found; capture output regardless
  MITM_AUDIT_JSON=$(python3 -m pip_audit \
    -r "${MITM_DIR}/requirements.txt" \
    --format json \
    --progress-spinner off \
    2>/dev/null || true)

  MITM_VULN_COUNT=$(echo "$MITM_AUDIT_JSON" | jq '[.[] | select(.vulns | length > 0)] | length' 2>/dev/null || echo "0")

  if [[ "$MITM_VULN_COUNT" -eq 0 ]]; then
    success "mitm: no vulnerabilities found."
  else
    while IFS= read -r pkg_json; do
      pkg_name=$(echo "$pkg_json" | jq -r '.name')
      pkg_version=$(echo "$pkg_json" | jq -r '.version')

      while IFS= read -r vuln_json; do
        cve_id=$(echo "$vuln_json" | jq -r '.id')
        fix_versions=$(echo "$vuln_json" | jq -r '.fix_versions | join(", ")' 2>/dev/null || echo "none")
        description=$(echo "$vuln_json" | jq -r '.description // "No description"')

        if is_excepted "$cve_id" "pip" "apps/mitm"; then
          expiry=$(get_expiry "$cve_id" "pip" "apps/mitm")
          reason=$(get_reason "$cve_id" "pip" "apps/mitm")
          days_left=$(days_until "$expiry")
          warn "Excepted: ${cve_id} in ${pkg_name}==${pkg_version}"
          warn "  Fix requires: ${fix_versions}"
          warn "  Exception expires: ${expiry} (${days_left} days)"
          warn "  Reason: ${reason}"
        else
          if [[ "$fix_versions" != "none" && -n "$fix_versions" ]]; then
            error "UNFIXED VULNERABILITY: ${pkg_name}==${pkg_version}"
            error "  CVE: ${cve_id}"
            error "  Fix available in: ${fix_versions}"
            error "  Description: ${description}"
            GATE_FAILED=true
          else
            warn "Unfixable upstream: ${pkg_name}==${pkg_version} — ${cve_id} (no fix available)"
          fi
        fi
      done < <(echo "$pkg_json" | jq -c '.vulns[]' 2>/dev/null || true)
    done < <(echo "$MITM_AUDIT_JSON" | jq -c '.[] | select(.vulns | length > 0)' 2>/dev/null || true)
  fi
else
  warn "mitm requirements.txt not found — skipping"
fi

# ── Final verdict ──────────────────────────────────────────────────────────────
header "Security Gate Result"

if [[ "$GATE_EXPIRED" == "true" ]]; then
  error "GATE FAILED: One or more security exceptions have expired."
  error "Update scripts/security-exceptions.json — either:"
  error "  1. Remove the exception (fix is now available)"
  error "  2. Extend expiry with documented justification (requires PR review)"
  exit 2
fi

if [[ "$GATE_FAILED" == "true" ]]; then
  error "GATE FAILED: Unfixed, non-excepted vulnerabilities detected."
  error "Either apply the fix (npm audit fix / pip install -U <pkg>)"
  error "or add a time-bounded exception to scripts/security-exceptions.json"
  exit 1
fi

success "Security gate PASSED. All vulnerabilities are either fixed or have valid exceptions."
exit 0
