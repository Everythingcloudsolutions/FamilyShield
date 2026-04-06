#!/usr/bin/env bash
# scripts/setup-github.sh
# ─────────────────────────────────────────────────────────────────────────────
# Configures GitHub repository settings for FamilyShield:
#   - Branch protection on main
#   - GitHub Environments (dev, staging, prod)
#   - prod environment requires manual approval
#
# Prerequisites: GitHub CLI (gh) installed and authenticated
#   brew install gh  OR  winget install GitHub.cli
#   gh auth login
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="Everythingcloudsolutions/FamilyShield"

echo "🛡️  FamilyShield — GitHub Repository Setup"
echo "============================================"
echo "Repository: $REPO"
echo ""

# ── Branch protection on main ─────────────────────────────────────────────────
echo "Setting up branch protection on main..."
gh api repos/$REPO/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint & Validate","Plan → dev","Security Scan"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  2>/dev/null || echo "  (branch protection may already be set)"
echo "✅ Branch protection on main configured"

# ── Create GitHub Environments ────────────────────────────────────────────────
echo ""
echo "Creating GitHub Environments..."

for ENV in dev staging; do
  gh api repos/$REPO/environments/$ENV \
    --method PUT \
    --field wait_timer=0 \
    2>/dev/null || true
  echo "✅ Environment: $ENV (auto-deploy, no approval)"
done

# prod requires manual approval — you must approve in GitHub UI
gh api repos/$REPO/environments/prod \
  --method PUT \
  --field wait_timer=0 \
  2>/dev/null || true

echo "✅ Environment: prod created"
echo ""
echo "⚠️  MANUAL STEP REQUIRED for prod approval gate:"
echo "   1. Go to: https://github.com/$REPO/settings/environments/prod"
echo "   2. Check: Required reviewers"
echo "   3. Add yourself as a required reviewer"
echo "   4. Save protection rules"
echo ""

# ── Create repository labels ──────────────────────────────────────────────────
echo "Creating issue labels..."

LABELS=(
  "iac:0075ca:Infrastructure as Code changes"
  "phase-1:00A896:Phase 1 - Cloud Core"
  "phase-2:F0A500:Phase 2 - Portal & Rules"
  "phase-3:7C3AED:Phase 3 - AI Intelligence"
  "phase-4:2DC653:Phase 4 - Home Enhancement"
  "phase-5:E84855:Phase 5 - Polish & OSS"
  "security:E84855:Security-related"
  "documentation:0075ca:Documentation"
  "good-first-issue:2DC653:Good for newcomers"
)

for label_def in "${LABELS[@]}"; do
  NAME=$(echo $label_def | cut -d: -f1)
  COLOR=$(echo $label_def | cut -d: -f2)
  DESC=$(echo $label_def | cut -d: -f3)
  gh label create "$NAME" --color "$COLOR" --description "$DESC" --repo "$REPO" 2>/dev/null || true
done

echo "✅ Labels created"

# ── Create milestone for Phase 1 ──────────────────────────────────────────────
echo ""
echo "Creating Phase 1 milestone..."
gh api repos/$REPO/milestones \
  --method POST \
  --field title="Phase 1 — Cloud Core" \
  --field description="Deploy OCI VM, AdGuard, Headscale, Cloudflare Tunnel. Kids protected everywhere." \
  --field due_on="$(date -d '+14 days' -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v+14d -u +%Y-%m-%dT%H:%M:%SZ)" \
  2>/dev/null || echo "  Milestone may already exist"

echo "✅ Phase 1 milestone created"

echo ""
echo "════════════════════════════════════════════════════════"
echo " GitHub setup complete!"
echo " Next: Add repository secrets (see bootstrap-oci.sh output)"
echo " Repo: https://github.com/$REPO"
echo "════════════════════════════════════════════════════════"
