-- Backend-only activation milestone. Public/browser/native routes remain gated.
alter table public.contact_join_attempts add column withdrawal_hash bytea unique
  check (octet_length(withdrawal_hash)=32);
alter table public.contact_invitations add column consumed_at timestamptz;

-- Survives the short pending-data retention window, but cascades on account or
-- contact deletion. Never stores recipient email, a raw capability, or a code.
create table public.contact_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.trusted_contacts(id) on delete cascade,
  invitation_id uuid not null unique,
  attempt_id uuid not null unique,
  consent_version text not null check (consent_version='2026-10-19'),
  recipient_accepted_at timestamptz not null,
  recipient_verified_at timestamptz not null,
  sender_approved_at timestamptz not null default now(),
  generation bigint not null check (generation>0),
  withdrawal_hash bytea not null unique check (octet_length(withdrawal_hash)=32),
  withdrawn_at timestamptz,
  unique(contact_id,generation),
  check (recipient_accepted_at<=recipient_verified_at and recipient_verified_at<=sender_approved_at)
);
alter table public.contact_consent_receipts enable row level security;
revoke all on public.contact_consent_receipts from public,anon,authenticated,service_role;

-- Preserve the established bounded verification transaction. Only this wrapper
-- is callable by the backend; legacy callers without withdrawal proof cannot
-- activate a contact and remain compatible during the disabled rollout.
alter function public.begin_contact_join(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text)
  rename to begin_contact_join_before_approval;
revoke all on function public.begin_contact_join_before_approval(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text)
  from public,anon,authenticated,service_role;
create function public.begin_contact_join(
  p_token_hash bytea,p_attempt_id uuid,p_destination_ciphertext text,
  p_destination_fingerprint bytea,p_destination_key_version integer,
  p_code_hash bytea,p_code_payload_ciphertext text,p_payload_key_version integer,
  p_consent_version text,p_consent_accepted boolean,p_provider text,p_withdrawal_hash bytea default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if p_withdrawal_hash is not null and octet_length(p_withdrawal_hash)<>32 then
    raise exception using errcode='22023',message='INVALID_JOIN_REQUEST';
  end if;
  v_result:=public.begin_contact_join_before_approval(p_token_hash,p_attempt_id,p_destination_ciphertext,
    p_destination_fingerprint,p_destination_key_version,p_code_hash,p_code_payload_ciphertext,
    p_payload_key_version,p_consent_version,p_consent_accepted,p_provider);
  if v_result is null then return null; end if;
  if exists(select 1 from public.contact_join_attempts where id=p_attempt_id
    and withdrawal_hash is not null and withdrawal_hash is distinct from p_withdrawal_hash) then return null; end if;
  update public.contact_join_attempts set withdrawal_hash=p_withdrawal_hash
    where id=p_attempt_id and withdrawal_hash is null;
  return v_result;
end $$;
revoke all on function public.begin_contact_join(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text,bytea) from public,anon,authenticated;
grant execute on function public.begin_contact_join(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text,bytea) to service_role;

-- Only the Edge gateway, after verifying the owner's current session, can see
-- encrypted candidate destinations. It decrypts and returns a masked address.
create function public.review_contact_joins(p_user_id uuid,p_invitation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if (select auth.role()) is distinct from 'service_role'
    or not exists(select 1 from public.profiles where id=p_user_id and deleted_at is null)
    or exists(select 1 from public.pending_deletions where user_id=p_user_id) then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  perform public.require_safety_authority(p_user_id);
  return coalesce((select jsonb_agg(item order by verified_at) from (
    select a.verified_at,jsonb_build_object('attemptId',a.id,'verifiedAt',a.verified_at,'expiresAt',a.expires_at,
      'destinationCiphertext',a.destination_ciphertext,'destinationKeyVersion',a.destination_key_version) item
    from public.contact_join_attempts a join public.contact_invitations i on i.id=a.invitation_id
    where i.id=p_invitation_id and i.user_id=p_user_id and i.revoked_at is null and i.expires_at>now()
      and a.verified_at is not null and a.superseded_at is null and a.expires_at>now()
      and a.withdrawal_hash is not null and a.consent_version=i.consent_version
    order by a.verified_at,a.id limit 3
  ) candidates),'[]'::jsonb);
end $$;
revoke all on function public.review_contact_joins(uuid,uuid) from public,anon,authenticated;
grant execute on function public.review_contact_joins(uuid,uuid) to service_role;

create function public.approve_contact_join(p_user_id uuid,p_invitation_id uuid,p_attempt_id uuid,p_name text default 'Trusted person')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_invitation public.contact_invitations%rowtype;
  v_attempt public.contact_join_attempts%rowtype;
  v_receipt public.contact_consent_receipts%rowtype;
  v_contact public.trusted_contacts%rowtype;
begin
  if (select auth.uid()) is distinct from p_user_id or p_user_id is null
    or p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  -- Same ordering as deletion/alert creation, then contact capacity/revocation.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,1));
  if not exists(select 1 from public.profiles where id=p_user_id and deleted_at is null)
    or exists(select 1 from public.pending_deletions where user_id=p_user_id) then return null; end if;
  perform public.require_safety_authority(p_user_id);
  select * into v_receipt from public.contact_consent_receipts
    where user_id=p_user_id and invitation_id=p_invitation_id and attempt_id=p_attempt_id;
  if found then
    -- A lost-response retry can recover approval, never revive later withdrawal.
    select * into v_contact from public.trusted_contacts where id=v_receipt.contact_id and user_id=p_user_id
      and status='confirmed' and consent_generation=v_receipt.generation and v_receipt.withdrawn_at is null;
    if not found then return null; end if;
    return jsonb_build_object('contactId',v_contact.id,'status','confirmed');
  end if;
  select * into v_invitation from public.contact_invitations where id=p_invitation_id and user_id=p_user_id
    and revoked_at is null and expires_at>now();
  if not found then return null; end if;
  select * into v_attempt from public.contact_join_attempts where id=p_attempt_id and invitation_id=p_invitation_id
    and verified_at is not null and superseded_at is null and expires_at>now()
    and withdrawal_hash is not null and consent_version=v_invitation.consent_version for update;
  if not found then return null; end if;
  -- Do not silently replace a proven contact or revive a disabled one.
  if exists(select 1 from public.trusted_contacts where user_id=p_user_id
    and destination_fingerprint=encode(v_attempt.destination_fingerprint,'hex')) then return null; end if;
  insert into public.trusted_contacts(user_id,name,channel,destination_ciphertext,destination_fingerprint,
    destination_key_version,status,confirmed_at)
    values(p_user_id,btrim(p_name),'email',v_attempt.destination_ciphertext,encode(v_attempt.destination_fingerprint,'hex'),
      v_attempt.destination_key_version::smallint,'confirmed',now()) returning * into v_contact;
  insert into public.contact_consent_receipts(user_id,contact_id,invitation_id,attempt_id,consent_version,
    recipient_accepted_at,recipient_verified_at,generation,withdrawal_hash)
    values(p_user_id,v_contact.id,p_invitation_id,p_attempt_id,v_attempt.consent_version,
      v_attempt.consent_accepted_at,v_attempt.verified_at,v_contact.consent_generation,v_attempt.withdrawal_hash);
  -- A consumed link is closed; other candidates cannot be approved with it.
  update public.contact_invitations set consumed_at=now(),revoked_at=now(),token_ciphertext=null where id=p_invitation_id;
  update public.contact_join_attempts set superseded_at=now(),code_hash=null,code_payload_ciphertext=null,
    delivery_state=case when delivery_state='queued' then 'cancelled' else delivery_state end
    where invitation_id=p_invitation_id;
  return jsonb_build_object('contactId',v_contact.id,'status','confirmed');
end $$;
revoke all on function public.approve_contact_join(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.approve_contact_join(uuid,uuid,uuid,text) to authenticated;

-- Existing sender disable/deletion/legacy changes and journal replay must mark
-- the matching receipt withdrawn as well. Receipt evidence is otherwise immutable.
create function public.record_contact_receipt_withdrawal()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status='confirmed' and (new.status<>'confirmed' or new.destination_fingerprint<>old.destination_fingerprint) then
    update public.contact_consent_receipts set withdrawn_at=coalesce(withdrawn_at,now())
      where contact_id=old.id and generation=old.consent_generation;
  end if;
  return new;
end $$;
revoke all on function public.record_contact_receipt_withdrawal() from public,anon,authenticated,service_role;
create trigger record_contact_receipt_withdrawal after update on public.trusted_contacts
  for each row execute function public.record_contact_receipt_withdrawal();

create function public.withdraw_contact_join(p_withdrawal_hash bytea)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_receipt public.contact_consent_receipts%rowtype; v_owner uuid; v_attempt uuid;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  if p_withdrawal_hash is null or octet_length(p_withdrawal_hash)<>32 then return null; end if;
  select user_id into v_owner from public.contact_consent_receipts where withdrawal_hash=p_withdrawal_hash;
  if not found then
    select i.user_id,a.id into v_owner,v_attempt from public.contact_join_attempts a
      join public.contact_invitations i on i.id=a.invitation_id where a.withdrawal_hash=p_withdrawal_hash;
  end if;
  if v_owner is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text,0));
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text,1));
  perform public.require_safety_authority(v_owner);
  -- Re-read after locking: approval may have consumed/purged the attempt.
  select * into v_receipt from public.contact_consent_receipts where withdrawal_hash=p_withdrawal_hash for update;
  if found then
    update public.trusted_contacts set status='disabled',confirmed_at=null
      where id=v_receipt.contact_id and user_id=v_owner and status='confirmed' and consent_generation=v_receipt.generation;
    update public.contact_consent_receipts set withdrawn_at=coalesce(withdrawn_at,now()) where id=v_receipt.id;
    update public.viewer_tokens set revoked_at=coalesce(revoked_at,now()) where trusted_contact_id=v_receipt.contact_id
      and exists(select 1 from public.trusted_contacts c where c.id=v_receipt.contact_id and c.consent_generation=v_receipt.generation);
  else
    update public.contact_join_attempts set superseded_at=coalesce(superseded_at,now()),code_hash=null,code_payload_ciphertext=null,
      delivery_state=case when delivery_state='queued' then 'cancelled' else delivery_state end
      where id=v_attempt and withdrawal_hash=p_withdrawal_hash;
    if not found then return null; end if;
  end if;
  -- The gateway must flush this owner's independent journal before confirming.
  return jsonb_build_object('withdrawn',true,'userId',v_owner);
end $$;
revoke all on function public.withdraw_contact_join(bytea) from public,anon,authenticated;
grant execute on function public.withdraw_contact_join(bytea) to service_role;

-- Extend the existing restore transaction. Its former entry point is private,
-- so service callers cannot bypass new invitation/proof invalidation.
alter function public.reconcile_restore_journal(uuid,bigint,text,jsonb) rename to reconcile_restore_before_contact_joins;
revoke all on function public.reconcile_restore_before_contact_joins(uuid,bigint,text,jsonb) from public,anon,authenticated,service_role;
create function public.reconcile_restore_journal(p_restore_id uuid,p_version bigint,p_digest text,p_entries jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.reconcile_restore_before_contact_joins(p_restore_id,p_version,p_digest,p_entries);
  -- Revoking ALL restored links means neither restored pending verification nor
  -- pre-backup revocation needs to be guessed from an old database snapshot.
  update public.contact_invitations set revoked_at=coalesce(revoked_at,now()),token_ciphertext=null where id is not null;
  delete from public.contact_join_attempts where id is not null;
  update public.contact_consent_receipts r set withdrawn_at=coalesce(r.withdrawn_at,now())
    from public.trusted_contacts c where c.id=r.contact_id and (c.status<>'confirmed' or c.consent_generation<>r.generation);
end $$;
revoke all on function public.reconcile_restore_journal(uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.reconcile_restore_journal(uuid,bigint,text,jsonb) to service_role;
