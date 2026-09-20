-- SignalWord V1: private alert data, created only through trusted Edge Functions.
-- No raw phrase, audio, viewer token, or contact destination is exposed publicly.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  channel text not null check (channel in ('email', 'sms')),
  destination_ciphertext text not null,
  destination_fingerprint text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disabled')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint one_contact_per_user unique (user_id),
  constraint confirmed_contact_has_timestamp check (
    (status = 'confirmed' and confirmed_at is not null) or status <> 'confirmed'
  )
);

create unique index trusted_contacts_user_destination_key
  on public.trusted_contacts (user_id, destination_fingerprint);

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trusted_contact_id uuid not null references public.trusted_contacts(id) on delete restrict,
  idempotency_key uuid not null,
  kind text not null check (kind in ('test', 'real')),
  state text not null default 'pending' check (state in ('pending', 'active', 'resolved', 'expired')),
  trigger_method text not null check (trigger_method in ('vocalShortcut', 'siri', 'actionButton', 'manual')),
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint alert_events_user_idempotency_key unique (user_id, idempotency_key),
  constraint resolved_alert_has_timestamp check (
    (state = 'resolved' and resolved_at is not null) or state <> 'resolved'
  )
);

create index alert_events_user_triggered_at_idx
  on public.alert_events (user_id, triggered_at desc);
create index alert_events_active_expiry_idx
  on public.alert_events (expires_at) where state <> 'resolved';

create table public.location_samples (
  id bigint generated always as identity primary key,
  alert_event_id uuid not null references public.alert_events(id) on delete cascade,
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  horizontal_accuracy_m double precision not null check (horizontal_accuracy_m >= 0 and horizontal_accuracy_m <= 100000),
  expires_at timestamptz not null
);

create index location_samples_event_received_at_idx
  on public.location_samples (alert_event_id, received_at desc);
create index location_samples_expiry_idx on public.location_samples (expires_at);

create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_event_id uuid not null references public.alert_events(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed')),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_provider_message_unique unique nulls not distinct (provider, provider_message_id)
);

create index alert_deliveries_event_idx on public.alert_deliveries (alert_event_id);

create table public.viewer_tokens (
  id uuid primary key default gen_random_uuid(),
  alert_event_id uuid not null references public.alert_events(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index viewer_tokens_expiry_idx on public.viewer_tokens (expires_at);

alter table public.profiles enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.alert_events enable row level security;
alter table public.location_samples enable row level security;
alter table public.alert_deliveries enable row level security;
alter table public.viewer_tokens enable row level security;

create policy "profiles are visible to their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles can be created by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles can be updated by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "contacts are visible to their owner"
  on public.trusted_contacts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "events are visible to their owner"
  on public.alert_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "locations are visible to their event owner"
  on public.location_samples for select to authenticated
  using (exists (
    select 1 from public.alert_events event
    where event.id = location_samples.alert_event_id
      and event.user_id = (select auth.uid())
  ));
create policy "delivery diagnostics are visible to their event owner"
  on public.alert_deliveries for select to authenticated
  using (exists (
    select 1 from public.alert_events event
    where event.id = alert_deliveries.alert_event_id
      and event.user_id = (select auth.uid())
  ));

-- Public links are resolved only by the public-event Edge Function. There is no
-- direct client policy for viewer_tokens.
revoke all on public.viewer_tokens from anon, authenticated;
revoke all on public.trusted_contacts from anon;
revoke all on public.alert_events from anon;
revoke all on public.location_samples from anon;
revoke all on public.alert_deliveries from anon;

create or replace function public.purge_expired_alert_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.location_samples where expires_at <= now();
  delete from public.viewer_tokens where expires_at <= now() or revoked_at is not null;
  delete from public.alert_deliveries
    where created_at <= now() - interval '7 days'
      and status in ('delivered', 'failed');
end;
$$;

revoke all on function public.purge_expired_alert_data() from public;
