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
