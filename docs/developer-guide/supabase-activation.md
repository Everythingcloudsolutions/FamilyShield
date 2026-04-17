# Supabase Activation Guide (2026)

Use this when the portal shows offline/degraded mode and Supabase is inactive.

## 1. Verify Supabase Project Status

1. Open Supabase dashboard for the FamilyShield project.
2. Confirm project state is Active (not paused).
3. If paused, resume the project and wait until API/DB are healthy.

## 2. Configure Environment Variables

Set these values in the deployment environment and local .env files:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Rules:

- NEXT_PUBLIC_* values are browser-safe and must use anon/publishable keys only.
- Never use service_role keys in NEXT_PUBLIC_* variables.

## 3. Validate Portal Connectivity

From apps/portal, run:

```bash
npm install
npm run typecheck
npm run dev
```

Then open dashboard and confirm:

- No "Supabase inactive" banner on dashboard.
- Devices list loads from database.
- Alerts page renders rows if alerts exist.

## 4. Validate API Connectivity

From apps/api, run:

```bash
npm install
npm run typecheck
npm run dev
```

Confirm API starts without SUPABASE_* missing-variable errors.

## 5. Smoke Test Data Flow

1. Insert a test row into devices table.
2. Confirm it appears on portal /devices.
3. Trigger one high-risk event through API worker.
4. Confirm row appears in alerts table and portal /alerts.

## 6. If Supabase Must Stay Inactive

The portal now runs in offline-safe mode:

- Dashboard and Alerts show a clear degraded/offline banner.
- Devices enrollment is blocked with an explicit message.
- Realtime subscriptions are skipped when Supabase is not configured.

This allows UI development to continue while backend data services are paused.
