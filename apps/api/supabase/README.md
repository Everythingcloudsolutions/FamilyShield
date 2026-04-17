# Supabase Schema Migrations

This folder contains app-owned SQL migrations for FamilyShield data tables.

## Current migration

- 20260416_0001_familyshield_core_rls.sql

What it does:

- Creates core tables: devices, content_events, alerts.
- Enables RLS on all three tables.
- Applies default-deny posture.
- Adds least-privilege policies for authenticated users scoped by parent_user_id = auth.uid().

## Notes

- API worker should use a server-side key (SUPABASE_SERVICE_ROLE_KEY) for privileged writes.
- Browser clients must continue to use NEXT_PUBLIC_SUPABASE_ANON_KEY only.
- Production rollout should include a user mapping strategy so parent_user_id is populated consistently.
