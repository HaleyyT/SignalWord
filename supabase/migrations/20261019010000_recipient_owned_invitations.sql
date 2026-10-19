-- Phase 1 of recipient-owned enrollment. These invitations contain no recipient
-- information and cannot create contacts, consent, or email deliveries.
create table public.contact_invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_key uuid not null,
  inviter_display_name text not null check (char_length(btrim(inviter_display_name)) between 1 and 80),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  token_ciphertext text check (char_length(token_ciphertext) >= 24),
  token_key_version integer not null check (token_key_version between 1 and 32767),
  consent_version text not null default '2026-10-19',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  revoked_at timestamptz,
  unique (user_id, request_key),
  check (expires_at > created_at),
  check (revoked_at is not null or token_ciphertext is not null)
);
create index contact_invitations_owner_created on public.contact_invitations(user_id, created_at desc);
create index contact_invitations_expiry on public.contact_invitations(expires_at);
alter table public.contact_invitations enable row level security;
revoke all on public.contact_invitations from public, anon, authenticated, service_role;

create function public.create_contact_invitation(
  p_user_id uuid, p_request_key uuid, p_token_hash bytea,
  p_token_ciphertext text, p_token_key_version integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.contact_invitations%rowtype;
  v_name text;
  v_subject bytea;
  v_window timestamptz := date_trunc('hour', now());
begin
  -- Only the Edge API may mint capabilities, after validating the sender JWT.
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  if p_user_id is null or p_request_key is null or p_token_hash is null
    or octet_length(p_token_hash) <> 32 or p_token_ciphertext is null
    or char_length(p_token_ciphertext) < 24 or p_token_key_version is null
    or p_token_key_version not between 1 and 32767 then
    raise exception using errcode = '22023', message = 'INVALID_INVITATION';
  end if;
  -- Same lock as contact capacity: concurrent invitations cannot overbook slots.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  select display_name into v_name from public.profiles
    where id = p_user_id and deleted_at is null
      and not exists (select 1 from public.pending_deletions where user_id = p_user_id);
  if not found then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  perform public.require_safety_authority(p_user_id);

  select * into v_invitation from public.contact_invitations
    where user_id = p_user_id and request_key = p_request_key;
  if not found then
    if (select count(*) from public.trusted_contacts where user_id = p_user_id)
      + (select count(*) from public.contact_invitations
        where user_id = p_user_id and revoked_at is null and expires_at > now()) >= 3 then
      raise exception using errcode = '23514', message = 'CONTACT_LIMIT';
    end if;
    v_subject := extensions.digest('contact_invitation:' || p_user_id::text, 'sha256');
    if coalesce((select request_count from public.rate_limit_buckets
      where scope = 'user' and subject_hash = v_subject and window_started_at = v_window), 0) >= 5 then
      raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
    end if;
    insert into public.rate_limit_buckets(scope, subject_hash, window_started_at, request_count, expires_at)
      values ('user', v_subject, v_window, 1, v_window + interval '1 hour')
      on conflict (scope, subject_hash, window_started_at) do update
      set request_count = public.rate_limit_buckets.request_count + 1, updated_at = now();
    insert into public.contact_invitations(user_id, request_key, inviter_display_name,
      token_hash, token_ciphertext, token_key_version)
      values (p_user_id, p_request_key, v_name, p_token_hash, p_token_ciphertext, p_token_key_version)
      returning * into v_invitation;
  end if;
  -- The ciphertext is returned only to the privileged gateway for idempotent
  -- response recovery. It is never part of the sender or public projection.
  return jsonb_build_object('invitationId', v_invitation.id,
    'displayName', v_invitation.inviter_display_name, 'expiresAt', v_invitation.expires_at,
    'status', case when v_invitation.revoked_at is not null then 'revoked'
      when v_invitation.expires_at <= now() then 'expired' else 'open' end,
    'tokenCiphertext', v_invitation.token_ciphertext, 'tokenKeyVersion', v_invitation.token_key_version,
    'tokenHash', encode(v_invitation.token_hash, 'hex'));
end $$;

create function public.list_contact_invitations(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is distinct from p_user_id or p_user_id is null
    or not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null)
    or exists (select 1 from public.pending_deletions where user_id = p_user_id) then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  perform public.require_safety_authority(p_user_id);
  return coalesce((select jsonb_agg(item order by created_at desc) from (
    select created_at, jsonb_build_object('invitationId', id, 'displayName', inviter_display_name,
      'expiresAt', expires_at, 'status', case when revoked_at is not null then 'revoked'
        when expires_at <= now() then 'expired' else 'open' end) as item
    from public.contact_invitations where user_id = p_user_id
    order by created_at desc, id limit 20
  ) invitations), '[]'::jsonb);
end $$;

create function public.revoke_contact_invitation(p_user_id uuid, p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is distinct from p_user_id or p_user_id is null
    or not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null)
    or exists (select 1 from public.pending_deletions where user_id = p_user_id) then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  perform public.require_safety_authority(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  update public.contact_invitations set revoked_at = coalesce(revoked_at, now()), token_ciphertext = null
    where id = p_invitation_id and user_id = p_user_id;
  return found;
end $$;

create function public.preview_contact_invitation(p_token_hash bytea)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_invitation public.contact_invitations%rowtype;
begin
  select i.* into v_invitation from public.contact_invitations i
    join public.profiles p on p.id = i.user_id
    where i.token_hash = p_token_hash and octet_length(p_token_hash) = 32
      and i.revoked_at is null and i.expires_at > now() and p.deleted_at is null
      and not exists (select 1 from public.pending_deletions where user_id = i.user_id);
  if not found then return null; end if;
  perform public.require_safety_authority(v_invitation.user_id);
  return jsonb_build_object('displayName', v_invitation.inviter_display_name,
    'expiresAt', v_invitation.expires_at, 'consentVersion', v_invitation.consent_version);
end;
$$;

create function public.purge_expired_contact_invitations()
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_deleted bigint;
begin
  delete from public.contact_invitations where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $$;

revoke all on function public.create_contact_invitation(uuid,uuid,bytea,text,integer) from public, anon, authenticated;
grant execute on function public.create_contact_invitation(uuid,uuid,bytea,text,integer) to service_role;
revoke all on function public.list_contact_invitations(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_contact_invitations(uuid) to authenticated;
revoke all on function public.revoke_contact_invitation(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.revoke_contact_invitation(uuid,uuid) to authenticated;
revoke all on function public.preview_contact_invitation(bytea) from public, anon, authenticated, service_role;
grant execute on function public.preview_contact_invitation(bytea) to anon;
revoke all on function public.purge_expired_contact_invitations() from public, anon, authenticated, service_role;
select cron.schedule('signalword-invitation-retention', '17 * * * *',
  $$select public.purge_expired_contact_invitations()$$);
