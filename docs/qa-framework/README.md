# FamilyShield — QA Framework

---

## Test Strategy

| Layer | Tool | What Is Tested | When |
|---|---|---|---|
| IaC lint | tflint + tofu validate | Terraform syntax, deprecated resources | Every PR |
| IaC security | Checkov + Trivy | Misconfigurations, CVEs | Every PR |
| Unit — API | Jest | Enrichment logic, LLM router, rule engine | Every PR + dev deploy |
| Unit — Portal | Jest + React Testing Library | Components, hooks, API calls | Every PR + dev deploy |
| Unit — mitm | pytest | Addon URL parsing, event extraction | Every PR |
| Integration | Jest supertest | API endpoints with Redis + Supabase | Dev deploy |
| E2E | Playwright | Full parent portal user journeys | Staging deploy |
| Smoke | curl | Portal + API health checks | Every deploy |
| Security | OWASP ZAP | OWASP Top 10 against staging | Weekly |

---

## Test Coverage Targets

| App | Unit | Integration | E2E |
|---|---|---|---|
| API Worker | ≥ 80% | ≥ 70% | N/A |
| Portal | ≥ 75% | ≥ 60% | Critical paths |
| mitmproxy addon | ≥ 85% | N/A | N/A |

---

## Critical E2E User Journeys (Playwright)

These must pass before every staging → prod promotion:

1. **Parent login** — sign in, see family dashboard, all devices shown
2. **Block a domain** — rule builder, add block, verify DNS query blocked in AdGuard
3. **Receive alert** — simulate risk event, verify ntfy notification received
4. **Child portal** — child logs in, sees own screen time only
5. **Appeal flow** — child requests access, parent approves, domain unblocked
6. **Weekly digest** — trigger digest generation, verify email content

---

## Ephemeral Staging Environment

The **staging environment is ephemeral** — it spins up for QA testing, then tears down to conserve OCI Always Free tier resources.

### Resource Allocation

| Environment | Sizing | Duration |
| --- | --- | --- |
| **Dev** | 1 OCPU / 6GB RAM | Always on |
| **Staging (QA)** | 1 OCPU / 6GB RAM | Spun up for testing, torn down after |
| **Prod** | 2 OCPU / 6GB RAM | Always on |

**Total:** Baseline 3 OCPU / 12GB (dev + prod) + staging ephemeral = 4 OCPU / 18GB (within Always Free 4C/24GB limit)

### Ephemeral Staging Workflow

#### Step 1: Spin Up Staging (QA Trigger)

Manually trigger staging deployment when dev passes:

```bash
gh workflow run deploy-staging.yml
gh run list --workflow deploy-staging.yml   # Monitor: takes ~5-10 minutes
```

#### Step 2: Run QA Tests

E2E + smoke tests in staging environment. Run Playwright tests or manually test critical journeys:

```bash
cd apps/portal
BASE_URL=https://familyshield-staging.everythingcloud.ca npx playwright test
```

Manual testing: Visit <https://familyshield-staging.everythingcloud.ca> and test:

- Parent login
- Block a domain
- Receive alerts
- Child portal access

#### Step 3: Tear Down Staging (Manual)

After QA completes, destroy staging to free Always Free tier resources:

```bash
cd iac
tofu init -backend-config="key=staging/terraform.tfstate" -reconfigure
tofu destroy -var-file="environments/staging/terraform.tfvars" -auto-approve
```

This destroys: familyshield-staging VM (1 OCPU / 6GB), buckets, networks. Frees 1 OCPU / 6GB for next staging run.

#### Step 4: Manual Alternative (if tofu destroy fails)

```bash
oci compute instance terminate --instance-id <staging-vm-ocid> --force
# Then clean up buckets, networks manually via OCI Console
```

---

## Running Tests Locally

```bash
# API unit tests
cd apps/api
npm test
npm run test:coverage

# Portal unit tests
cd apps/portal
npm test
npm run test:coverage

# mitmproxy addon tests
cd apps/mitm
pytest tests/ -v --cov=. --cov-report=term

# E2E (requires staging URL or local tunnel)
cd apps/portal
BASE_URL=https://familyshield-staging.everythingcloud.ca npx playwright test

# IaC validation
cd iac
tofu validate
tflint --recursive
```

---

## Test Data Management

- Unit tests use mocked external services (YouTube API, Groq, etc.)
- Integration tests use a dedicated Supabase test project
- E2E tests use dedicated test parent/child accounts (`test-parent@everythingcloud.ca`)
- Never use real child data in tests
- Seed data lives in `docs/testing/fixtures/`

---

## Defect Severity Classification

| Severity | Definition | SLA |
|---|---|---|
| P0 — Critical | Child device unprotected (DNS/VPN down) | Fix in 2 hours |
| P1 — High | Feature broken in prod (alerts not sending, portal down) | Fix in 24 hours |
| P2 — Medium | Degraded function (AI scoring slow, chart wrong) | Fix in 1 week |
| P3 — Low | Minor UI issue, wrong label, cosmetic | Fix in next sprint |
