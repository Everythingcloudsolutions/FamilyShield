# Portal Auth Scaffold (2026)

The portal now includes route protection middleware for sensitive pages.

## Protected routes

- /
- /alerts
- /devices

## How it works

- Uses HTTP Basic auth at the app edge (Next.js middleware).
- Enabled when:
  - PORTAL_BASIC_AUTH_ENABLED=true, or
  - NODE_ENV=production and PORTAL_BASIC_AUTH_ENABLED is unset.
- Disabled when PORTAL_BASIC_AUTH_ENABLED=false.

## Required variables (when enabled)

- PORTAL_BASIC_AUTH_USERNAME
- PORTAL_BASIC_AUTH_PASSWORD

If auth is enabled without credentials, middleware returns HTTP 503 to fail safe.

## Why this is a scaffold

This is an interim authn gate to reduce accidental public exposure.
For production maturity, move to full session-based auth with explicit user authorization and row ownership mapping.

## Test mode

Security E2E tests are opt-in in:

- apps/portal/tests/e2e/security-auth.spec.ts

Enable with:

- PLAYWRIGHT_TEST_AUTH_ENABLED=true
- PLAYWRIGHT_TEST_AUTH_USER=<user>
- PLAYWRIGHT_TEST_AUTH_PASS=<pass>
