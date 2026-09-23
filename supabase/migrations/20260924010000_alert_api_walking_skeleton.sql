-- Day 2 walking skeleton: transactional alert creation and token-scoped projection.
-- This migration is additive so the schema-hardening branch can be applied first
-- or reconciled independently. The RPCs deliberately expose no raw token data.

create or replace function public.create_or_reuse_alert(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_kind text,
  p_trigger_method text,
  p_viewer_token text,
  p_location jsonb default null
)
returns table (
  event_id uuid,
  event_state text,
  delivery_status text,
  server_triggered_at timestamptz,
  reused boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_contact_id uuid;
  v_event public.alert_events%rowtype;
  v_delivery_status text;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;

  -- Serializes both same-key retries and distinct invocations inside the cooldown.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into v_event
  from public.alert_events
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    select status into v_delivery_status
    from public.alert_deliveries
    where alert_event_id = v_event.id
    order by created_at asc
    limit 1;

    return query select v_event.id, v_event.state, coalesce(v_delivery_status, 'queued'),
      v_event.triggered_at, true;
    return;
  end if;

  select id into v_contact_id
  from public.trusted_contacts
  where user_id = p_user_id and status = 'confirmed'
  order by created_at desc
  limit 1;

  if v_contact_id is null then
    raise exception using errcode = 'P0001', message = 'CONTACT_NOT_CONFIRMED';
  end if;

  -- A rate-limit decision persists in the event ledger and cannot be bypassed by
  -- moving the request between Edge Function instances.
  if (
    select count(*) from public.alert_events
    where user_id = p_user_id and triggered_at >= now() - interval '1 minute'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  select * into v_event
  from public.alert_events
  where user_id = p_user_id
    and state in ('pending', 'active')
    and triggered_at >= now() - interval '60 seconds'
  order by triggered_at desc
  limit 1;

  if found then
    select status into v_delivery_status
    from public.alert_deliveries
    where alert_event_id = v_event.id
    order by created_at asc
    limit 1;

    return query select v_event.id, v_event.state, coalesce(v_delivery_status, 'queued'),
      v_event.triggered_at, true;
    return;
  end if;

  insert into public.alert_events (
    user_id, trusted_contact_id, idempotency_key, kind, state, trigger_method
  ) values (
    p_user_id, v_contact_id, p_idempotency_key, p_kind, 'active', p_trigger_method
  ) returning * into v_event;

  insert into public.viewer_tokens (alert_event_id, token_hash, expires_at)
  values (
    v_event.id,
    digest(convert_to(p_viewer_token, 'UTF8'), 'sha256'),
    least(v_event.expires_at, now() + interval '24 hours')
  );

  insert into public.alert_deliveries (alert_event_id, provider, status)
  values (v_event.id, 'fake', 'queued')
  returning status into v_delivery_status;

  if p_location is not null then
    insert into public.location_samples (
      alert_event_id, captured_at, latitude, longitude,
      horizontal_accuracy_m, expires_at
    ) values (
      v_event.id,
      (p_location->>'capturedAt')::timestamptz,
      (p_location->>'latitude')::double precision,
      (p_location->>'longitude')::double precision,
      (p_location->>'horizontalAccuracyM')::double precision,
      least(v_event.expires_at, now() + interval '24 hours')
    );
  end if;

  return query select v_event.id, v_event.state, v_delivery_status,
    v_event.triggered_at, false;
end;
$$;

revoke all on function public.create_or_reuse_alert(uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.create_or_reuse_alert(uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.get_public_event(p_token_hash bytea)
returns table (projection jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with matching_event as (
    select event.id, event.kind, event.state, event.triggered_at,
      event.resolved_at, profile.display_name
    from public.viewer_tokens token
    join public.alert_events event on event.id = token.alert_event_id
    join public.profiles profile on profile.id = event.user_id
    where token.token_hash = p_token_hash
      and token.revoked_at is null
      and token.expires_at > now()
      and event.expires_at > now()
    limit 1
  ), latest_location as (
    select sample.*
    from public.location_samples sample
    join matching_event event on event.id = sample.alert_event_id
    where sample.expires_at > now()
    order by sample.received_at desc
    limit 1
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'kind', event.kind,
    'displayName', event.display_name,
    'state', event.state,
    'triggeredAt', event.triggered_at,
    'lastUpdatedAt', greatest(event.triggered_at, coalesce(event.resolved_at, event.triggered_at),
      coalesce(location.received_at, event.triggered_at)),
    'location', case when location.id is null then null else jsonb_build_object(
      'latitude', location.latitude,
      'longitude', location.longitude,
      'horizontalAccuracyM', location.horizontal_accuracy_m,
      'capturedAt', location.captured_at,
      'freshness', case
        when location.received_at >= now() - interval '30 seconds' then 'live'
        when location.received_at >= now() - interval '2 minutes' then 'recent'
        else 'stale'
      end
    ) end,
    'guidance', jsonb_build_object(
      'summary', format(
        'Contact %s now. If you believe there is immediate danger, call the appropriate local emergency number.',
        event.display_name
      )
    )
  )) as projection
  from matching_event event
  left join latest_location location on true;
$$;

revoke all on function public.get_public_event(bytea) from public;
grant execute on function public.get_public_event(bytea) to anon, authenticated;
