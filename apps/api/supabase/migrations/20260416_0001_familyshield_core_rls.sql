-- FamilyShield core tables + default-deny RLS
-- Year: 2026

create extension if not exists pgcrypto;

create table if not exists public.devices (
  device_ip text primary key,
  parent_user_id uuid,
  device_name text not null,
  profile text not null check (profile in ('strict', 'moderate', 'guided')),
  enrolled_at timestamptz not null default now(),
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_events (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid,
  device_ip text not null references public.devices(device_ip) on delete cascade,
  platform text not null,
  content_type text not null,
  content_id text not null,
  title text,
  category text,
  risk_level text,
  risk_categories text[] default '{}',
  risk_confidence double precision,
  ai_provider text,
  environment text not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid,
  device_ip text not null references public.devices(device_ip) on delete cascade,
  platform text not null,
  content_id text not null,
  title text not null,
  risk_level text not null,
  risk_categories text[] default '{}',
  risk_confidence double precision,
  ai_provider text,
  dispatched_via text[] default '{}',
  environment text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_events_captured_at on public.content_events (captured_at desc);
create index if not exists idx_alerts_created_at on public.alerts (created_at desc);
create index if not exists idx_alerts_device_ip on public.alerts (device_ip);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at
before update on public.devices
for each row
execute function public.set_updated_at_timestamp();

alter table public.devices enable row level security;
alter table public.content_events enable row level security;
alter table public.alerts enable row level security;

-- default deny remains in effect unless a policy below allows a row.

-- devices policies
create policy if not exists devices_select_own
on public.devices
for select
to authenticated
using (parent_user_id = auth.uid());

create policy if not exists devices_insert_own
on public.devices
for insert
to authenticated
with check (parent_user_id = auth.uid());

create policy if not exists devices_update_own
on public.devices
for update
to authenticated
using (parent_user_id = auth.uid())
with check (parent_user_id = auth.uid());

create policy if not exists devices_delete_own
on public.devices
for delete
to authenticated
using (parent_user_id = auth.uid());

-- content events policies
create policy if not exists content_events_select_own
on public.content_events
for select
to authenticated
using (parent_user_id = auth.uid());

create policy if not exists content_events_insert_own
on public.content_events
for insert
to authenticated
with check (parent_user_id = auth.uid());

create policy if not exists content_events_update_own
on public.content_events
for update
to authenticated
using (parent_user_id = auth.uid())
with check (parent_user_id = auth.uid());

create policy if not exists content_events_delete_own
on public.content_events
for delete
to authenticated
using (parent_user_id = auth.uid());

-- alerts policies
create policy if not exists alerts_select_own
on public.alerts
for select
to authenticated
using (parent_user_id = auth.uid());

create policy if not exists alerts_insert_own
on public.alerts
for insert
to authenticated
with check (parent_user_id = auth.uid());

create policy if not exists alerts_update_own
on public.alerts
for update
to authenticated
using (parent_user_id = auth.uid())
with check (parent_user_id = auth.uid());

create policy if not exists alerts_delete_own
on public.alerts
for delete
to authenticated
using (parent_user_id = auth.uid());
