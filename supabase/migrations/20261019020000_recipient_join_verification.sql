-- Recipient-owned verification foundation. No public write grants or HTTP routes
-- yet: CAPTCHA, provider dispatch and restore reconciliation must be integrated
-- before enrollment is enabled. A verified attempt is NOT an active contact.
create table public.contact_join_attempts (
  id uuid primary key,
  invitation_id uuid not null references public.contact_invitations(id) on delete cascade,
  destination_ciphertext text not null check (char_length(destination_ciphertext) >= 24),
  destination_fingerprint bytea not null check (octet_length(destination_fingerprint) = 32),
  destination_key_version integer not null check (destination_key_version between 1 and 32767),
  code_hash bytea check (octet_length(code_hash) = 32),
  code_payload_ciphertext text check (char_length(code_payload_ciphertext) >= 24),
  payload_key_version integer not null check (payload_key_version between 1 and 32767),
  consent_version text not null check (consent_version = '2026-10-19'),
  consent_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  code_expires_at timestamptz not null default (now() + interval '10 minutes'),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  failed_code_attempts integer not null default 0 check (failed_code_attempts between 0 and 5),
  verified_at timestamptz,
  superseded_at timestamptz,
  delivery_state text not null default 'queued'
    check (delivery_state in ('queued','leased','sent','failed','unknown','cancelled')),
  lease_id uuid,
  lease_expires_at timestamptz,
  provider text not null check (provider in ('fake','resend')),
  provider_message_id text check (char_length(provider_message_id) between 1 and 200),
  check (code_expires_at > created_at and expires_at >= code_expires_at),
  check ((delivery_state = 'leased') = (lease_id is not null and lease_expires_at is not null))
);
create index contact_join_attempts_invitation on public.contact_join_attempts(invitation_id, created_at desc);
create index contact_join_attempts_expiry on public.contact_join_attempts(expires_at);
alter table public.contact_join_attempts enable row level security;
revoke all on public.contact_join_attempts from public, anon, authenticated, service_role;

-- Internal guard. The owner lock also serializes invitation revocation/capacity.
create function public.lock_open_contact_invitation(p_token_hash bytea)
returns public.contact_invitations language plpgsql security definer set search_path = '' as $$
declare v_invitation public.contact_invitations%rowtype;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  select * into v_invitation from public.contact_invitations where token_hash=p_token_hash;
  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_invitation.user_id::text,1));
  -- Re-read after the lock: a concurrent revoke must win over a stale preview.
  select i.* into v_invitation from public.contact_invitations i
    join public.profiles p on p.id=i.user_id
    where i.token_hash=p_token_hash and octet_length(p_token_hash)=32
      and i.revoked_at is null and i.expires_at>now() and p.deleted_at is null
      and not exists(select 1 from public.pending_deletions where user_id=i.user_id);
  if not found then return null; end if;
  perform public.require_safety_authority(v_invitation.user_id);
  return v_invitation;
end $$;
revoke all on function public.lock_open_contact_invitation(bytea) from public,anon,authenticated,service_role;

create function public.begin_contact_join(
  p_token_hash bytea,p_attempt_id uuid,p_destination_ciphertext text,
  p_destination_fingerprint bytea,p_destination_key_version integer,
  p_code_hash bytea,p_code_payload_ciphertext text,p_payload_key_version integer,
  p_consent_version text,p_consent_accepted boolean,p_provider text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.contact_invitations%rowtype;
  v_attempt public.contact_join_attempts%rowtype;
  v_subject bytea;
  v_window timestamptz:=date_trunc('hour',now());
  v_scope text;
  v_count integer;
begin
  v_invitation:=public.lock_open_contact_invitation(p_token_hash);
  if v_invitation.id is null then return null; end if;
  if p_consent_accepted is distinct from true or p_consent_version is distinct from v_invitation.consent_version
    or p_attempt_id is null or p_destination_ciphertext is null or char_length(p_destination_ciphertext)<24
    or p_destination_fingerprint is null or octet_length(p_destination_fingerprint)<>32
    or p_destination_key_version is null or p_destination_key_version not between 1 and 32767
    or p_code_hash is null or octet_length(p_code_hash)<>32 or p_code_payload_ciphertext is null
    or char_length(p_code_payload_ciphertext)<24 or p_payload_key_version is null
    or p_payload_key_version not between 1 and 32767 or p_provider is null or p_provider not in ('fake','resend') then
    raise exception using errcode='22023',message='INVALID_JOIN_REQUEST';
  end if;
  select * into v_attempt from public.contact_join_attempts where id=p_attempt_id;
  if found then
    if v_attempt.invitation_id<>v_invitation.id or v_attempt.destination_fingerprint<>p_destination_fingerprint
      or v_attempt.expires_at<=now() then return null; end if;
    -- Replay never replaces a code, extends expiry or creates a second email.
    return jsonb_build_object('attemptId',v_attempt.id,'expiresAt',v_attempt.code_expires_at);
  end if;
  -- Global destination lock prevents simultaneous requests through different
  -- senders from bypassing cooldowns or the per-address budget.
  perform pg_advisory_xact_lock(hashtextextended(encode(p_destination_fingerprint,'hex'),2));
  v_subject:=extensions.digest('contact_join:destination:'||encode(p_destination_fingerprint,'hex'),'sha256');
  if exists(select 1 from public.rate_limit_buckets where scope='user' and subject_hash=v_subject
    and updated_at>now()-interval '60 seconds') then
    raise exception using errcode='P0001',message='RATE_LIMITED';
  end if;
  -- Fingerprinted destination, sender and invitation each get an independent
  -- budget. Revocation/purge cannot reset the hour's counters.
  foreach v_scope in array array['destination','sender','invitation'] loop
    v_subject:=extensions.digest('contact_join:'||v_scope||':'||case v_scope
      when 'destination' then encode(p_destination_fingerprint,'hex')
      when 'sender' then v_invitation.user_id::text else v_invitation.id::text end,'sha256');
    insert into public.rate_limit_buckets(scope,subject_hash,window_started_at,request_count,expires_at)
      values('user',v_subject,v_window,1,v_window+interval '61 minutes')
      on conflict(scope,subject_hash,window_started_at) do update
      set request_count=public.rate_limit_buckets.request_count+1,updated_at=now()
      returning request_count into strict v_count;
    if v_count>(case when v_scope='sender' then 10 else 3 end) then
      raise exception using errcode='P0001',message='RATE_LIMITED';
    end if;
  end loop;
  -- A fresh request invalidates all earlier codes for this invitation/address.
  update public.contact_join_attempts set code_hash=null,code_payload_ciphertext=null,superseded_at=now(),
    delivery_state=case when delivery_state='queued' then 'cancelled' else delivery_state end
    where invitation_id=v_invitation.id and destination_fingerprint=p_destination_fingerprint;
  insert into public.contact_join_attempts(id,invitation_id,destination_ciphertext,destination_fingerprint,
    destination_key_version,code_hash,code_payload_ciphertext,payload_key_version,consent_version,provider)
    values(p_attempt_id,v_invitation.id,p_destination_ciphertext,p_destination_fingerprint,p_destination_key_version,
      p_code_hash,p_code_payload_ciphertext,p_payload_key_version,p_consent_version,p_provider)
    returning * into v_attempt;
  return jsonb_build_object('attemptId',v_attempt.id,'expiresAt',v_attempt.code_expires_at);
end $$;

create function public.verify_contact_join(p_token_hash bytea,p_attempt_id uuid,p_code_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_invitation public.contact_invitations%rowtype; v_attempt public.contact_join_attempts%rowtype;
begin
  v_invitation:=public.lock_open_contact_invitation(p_token_hash);
  if v_invitation.id is null then return false; end if;
  select * into v_attempt from public.contact_join_attempts
    where id=p_attempt_id and invitation_id=v_invitation.id for update;
  if not found or v_attempt.code_expires_at<=now() or v_attempt.expires_at<=now()
    or v_attempt.failed_code_attempts>=5 or v_attempt.code_hash is null then return false; end if;
  if p_code_hash is null or octet_length(p_code_hash)<>32 or v_attempt.code_hash<>p_code_hash then
    -- Return false rather than throw: rolling back would erase brute-force counts.
    update public.contact_join_attempts set failed_code_attempts=failed_code_attempts+1,
      code_hash=case when failed_code_attempts=4 then null else code_hash end,
      code_payload_ciphertext=case when failed_code_attempts=4 then null else code_payload_ciphertext end
      where id=p_attempt_id;
    return false;
  end if;
  update public.contact_join_attempts set verified_at=now(),code_hash=null,code_payload_ciphertext=null,
    delivery_state=case when delivery_state='queued' then 'cancelled' else delivery_state end
    where id=p_attempt_id;
  -- Deliberately no trusted_contacts insert here. Sender approval is a separate
  -- gate and must be implemented with withdrawal/restore protection.
  return true;
end $$;

create function public.claim_contact_join_email(p_lease_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt public.contact_join_attempts%rowtype; v_invitation public.contact_invitations%rowtype;
begin
  if (select auth.role()) is distinct from 'service_role' or p_lease_id is null then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  select a.* into v_attempt from public.contact_join_attempts a
    join public.contact_invitations i on i.id=a.invitation_id
    where (a.delivery_state='queued' and a.code_hash is not null and a.code_expires_at>now()
      and i.revoked_at is null and i.expires_at>now())
      or (a.delivery_state='leased' and a.lease_expires_at<=now())
    order by a.created_at,a.id limit 1;
  if not found then return null; end if;
  -- Keep owner -> attempt lock ordering consistent with begin/verify/revoke.
  perform pg_advisory_xact_lock(hashtextextended((select user_id::text from public.contact_invitations where id=v_attempt.invitation_id),1));
  if v_attempt.delivery_state='leased' then
    update public.contact_join_attempts set delivery_state='unknown',lease_id=null,lease_expires_at=null,
      code_payload_ciphertext=null where id=v_attempt.id and delivery_state='leased' and lease_expires_at<=now();
    return null;
  end if;
  v_invitation:=public.lock_open_contact_invitation((select token_hash from public.contact_invitations where id=v_attempt.invitation_id));
  if v_invitation.id is null then return null; end if;
  select * into v_attempt from public.contact_join_attempts
    where id=v_attempt.id and delivery_state='queued' and code_hash is not null and code_expires_at>now() for update skip locked;
  if not found then return null; end if;
  update public.contact_join_attempts set delivery_state='leased',lease_id=p_lease_id,
    lease_expires_at=now()+interval '30 seconds' where id=v_attempt.id;
  return jsonb_build_object('attemptId',v_attempt.id,'invitationHash',encode(v_invitation.token_hash,'hex'),
    'senderName',v_invitation.inviter_display_name,'provider',v_attempt.provider,
    'destinationCiphertext',v_attempt.destination_ciphertext,'destinationKeyVersion',v_attempt.destination_key_version,
    'payloadCiphertext',v_attempt.code_payload_ciphertext,'payloadKeyVersion',v_attempt.payload_key_version);
end $$;

create function public.finish_contact_join_email(p_attempt_id uuid,p_lease_id uuid,p_outcome text,p_provider_message_id text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  if p_outcome is null or p_outcome not in ('sent','failed','unknown')
    or (p_outcome='sent' and (p_provider_message_id is null or char_length(p_provider_message_id) not between 1 and 200)) then
    raise exception using errcode='22023',message='INVALID_DELIVERY_RESULT';
  end if;
  update public.contact_join_attempts set delivery_state=p_outcome,lease_id=null,lease_expires_at=null,
    provider_message_id=case when p_outcome='sent' then p_provider_message_id else null end,code_payload_ciphertext=null
    where id=p_attempt_id and delivery_state='leased' and lease_id=p_lease_id and lease_expires_at>now();
  return found;
end $$;

create function public.purge_expired_contact_joins()
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_count bigint;
begin
  -- Purge short-lived recipient data; independent rate buckets retain abuse limits.
  delete from public.contact_join_attempts a using public.contact_invitations i
    where a.invitation_id=i.id and (a.expires_at<=now() or i.revoked_at is not null or i.expires_at<=now());
  get diagnostics v_count=row_count;
  return v_count;
end $$;

revoke all on function public.begin_contact_join(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text) from public,anon,authenticated;
revoke all on function public.verify_contact_join(bytea,uuid,bytea) from public,anon,authenticated;
revoke all on function public.claim_contact_join_email(uuid) from public,anon,authenticated;
revoke all on function public.finish_contact_join_email(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.purge_expired_contact_joins() from public,anon,authenticated,service_role;
grant execute on function public.begin_contact_join(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text) to service_role;
grant execute on function public.verify_contact_join(bytea,uuid,bytea) to service_role;
grant execute on function public.claim_contact_join_email(uuid) to service_role;
grant execute on function public.finish_contact_join_email(uuid,uuid,text,text) to service_role;
-- Extend the existing retention job rather than registering another cron job.
select cron.schedule('signalword-invitation-retention','* * * * *',
  $$select public.purge_expired_contact_joins(); select public.purge_expired_contact_invitations();$$);
