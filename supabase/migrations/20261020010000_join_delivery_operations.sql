-- Minimal delivery evidence survives the 30-minute recipient-data purge. No
-- destination, owner, name, capability or payload is retained in this ledger.
create table public.contact_join_delivery_evidence (
  attempt_id uuid primary key,
  correlation text not null unique check(correlation ~ '^[a-f0-9]{64}$'),
  provider text not null check(provider in ('fake','resend')),
  state text not null check(state in ('queued','leased','sent','delivered','failed','bounced','complained','unknown','cancelled')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.contact_join_delivery_evidence enable row level security;
revoke all on public.contact_join_delivery_evidence from public,anon,authenticated,service_role;
create unique index contact_join_provider_receipt on public.contact_join_delivery_evidence(provider,provider_message_id) where provider_message_id is not null;

create function public.join_receipt_state(p_message_id text) returns text
language sql stable security definer set search_path='' as $$
 select coalesce(max(event_type) filter(where event_type in ('failed','bounced','complained')),
   case when bool_or(event_type='delivered') then 'delivered' else 'sent' end)
 from public.delivery_webhook_receipts where provider='resend' and provider_message_id=p_message_id;
$$;
revoke all on function public.join_receipt_state(text) from public,anon,authenticated,service_role;

create function public.record_join_delivery_evidence() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_state text; v_id uuid;
begin
 if TG_OP='DELETE' then
   update public.contact_join_delivery_evidence set state=case when state='queued' then 'cancelled' when state='leased' then 'unknown' else state end,updated_at=now() where attempt_id=old.id;
   return old;
 end if;
 if TG_OP='INSERT' and exists(select 1 from public.contact_join_delivery_evidence where attempt_id=new.id) then
   raise exception using errcode='22023',message='JOIN_REQUEST_RETIRED';
 end if;
 v_state:=new.delivery_state;
 if new.provider='resend' and new.provider_message_id is not null then v_state:=public.join_receipt_state(new.provider_message_id); end if;
 insert into public.contact_join_delivery_evidence(attempt_id,correlation,provider,state,provider_message_id,created_at,attempted_at)
 values(new.id,encode(extensions.digest('contact/join/'||new.id::text,'sha256'),'hex'),new.provider,v_state,
   new.provider_message_id,new.created_at,case when new.delivery_state='leased' then now() else null end)
 on conflict(attempt_id) do update set
   state=case when public.contact_join_delivery_evidence.state in ('failed','bounced','complained','delivered') then public.contact_join_delivery_evidence.state else excluded.state end,
   provider_message_id=coalesce(public.contact_join_delivery_evidence.provider_message_id,excluded.provider_message_id),
   attempted_at=coalesce(public.contact_join_delivery_evidence.attempted_at,excluded.attempted_at),updated_at=now();
 return new;
end $$;
revoke all on function public.record_join_delivery_evidence() from public,anon,authenticated,service_role;
create trigger record_join_delivery_evidence after insert or update or delete on public.contact_join_attempts
 for each row execute function public.record_join_delivery_evidence();

alter function public.reconcile_resend_webhook(text,text,text,text) rename to reconcile_resend_before_joins;
revoke all on function public.reconcile_resend_before_joins(text,text,text,text) from public,anon,authenticated,service_role;
create function public.reconcile_resend_webhook(p_provider_event_id text,p_provider_message_id text,p_event_type text,p_correlation text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_inserted boolean;
begin
 v_inserted:=public.reconcile_resend_before_joins(p_provider_event_id,p_provider_message_id,p_event_type,p_correlation);
 update public.contact_join_delivery_evidence set provider_message_id=p_provider_message_id,
   state=public.join_receipt_state(p_provider_message_id),updated_at=now()
 where provider='resend' and attempted_at is not null
   and (provider_message_id=p_provider_message_id or (provider_message_id is null and correlation=p_correlation));
 -- A callback may beat worker finalization. Clear the lease without requeueing.
 update public.contact_join_attempts a set provider_message_id=e.provider_message_id,
   delivery_state=case when e.state in ('failed','bounced','complained') then 'failed' else 'sent' end,
   lease_id=null,lease_expires_at=null,code_payload_ciphertext=null
 from public.contact_join_delivery_evidence e where a.id=e.attempt_id and e.provider_message_id=p_provider_message_id
   and e.state in ('sent','delivered','failed','bounced','complained');
 return v_inserted;
end $$;
revoke all on function public.reconcile_resend_webhook(text,text,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_resend_webhook(text,text,text,text) to service_role;

alter function public.signalword_operational_health() rename to signalword_operational_health_before_joins;
revoke all on function public.signalword_operational_health_before_joins() from public,anon,authenticated,service_role;
create function public.signalword_operational_health() returns jsonb
language sql stable security definer set search_path='' as $$
 select public.signalword_operational_health_before_joins() || jsonb_build_object('joinVerification',jsonb_build_object(
  'queued',(select count(*) from public.contact_join_attempts where delivery_state='queued' and code_hash is not null and code_expires_at>now()),
  'oldestQueuedSeconds',(select coalesce(greatest(0,extract(epoch from now()-min(created_at))),0) from public.contact_join_attempts where delivery_state='queued' and code_hash is not null and code_expires_at>now()),
  'unknown',(select count(*) from public.contact_join_delivery_evidence where state='unknown' or (state='leased' and attempted_at<now()-interval '30 seconds')),
  'callbackOverdue',(select count(*) from public.contact_join_delivery_evidence e where provider='resend' and state='sent' and attempted_at<now()-interval '2 minutes' and not exists(select 1 from public.delivery_webhook_receipts r where r.provider='resend' and r.provider_message_id=e.provider_message_id)),
  'deliveryReportOverdue',(select count(*) from public.contact_join_delivery_evidence where provider='resend' and state='sent' and attempted_at<now()-interval '15 minutes')));
$$;
revoke all on function public.signalword_operational_health() from public,anon,authenticated;
grant execute on function public.signalword_operational_health() to service_role;

-- The ordinary retention path also runs during restore/delete cleanup.
alter function public.purge_expired_contact_joins() rename to purge_contact_joins_before_evidence;
revoke all on function public.purge_contact_joins_before_evidence() from public,anon,authenticated,service_role;
create function public.purge_expired_contact_joins() returns bigint language plpgsql security definer set search_path='' as $$
declare v_count bigint;
begin
 v_count:=public.purge_contact_joins_before_evidence();
 delete from public.contact_join_delivery_evidence where created_at<now()-interval '7 days';
 return v_count;
end $$;
revoke all on function public.purge_expired_contact_joins() from public,anon,authenticated,service_role;

-- Recovery/closed accounts must not starve unrelated queued recipients.
create or replace function public.claim_contact_join_email(p_lease_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt public.contact_join_attempts%rowtype; v_invitation public.contact_invitations%rowtype; v_tries integer:=0;
begin
  if (select auth.role()) is distinct from 'service_role' or p_lease_id is null then
    raise exception using errcode='42501',message='NOT_AUTHORIZED';
  end if;
  loop
  v_tries:=v_tries+1; if v_tries>10 then return null; end if;
  select a.* into v_attempt from public.contact_join_attempts a
    join public.contact_invitations i on i.id=a.invitation_id
    where (a.delivery_state='queued' and a.code_hash is not null and a.code_expires_at>now()
      and i.revoked_at is null and i.expires_at>now()
      and exists(select 1 from public.profiles p where p.id=i.user_id and p.deleted_at is null)
      and not exists(select 1 from public.pending_deletions where user_id=i.user_id))
      or (a.delivery_state='leased' and a.lease_expires_at<=now())
    order by a.created_at,a.id limit 1;
  if not found then return null; end if;
  -- Keep owner -> attempt lock ordering consistent with begin/verify/revoke.
  perform pg_advisory_xact_lock(hashtextextended((select user_id::text from public.contact_invitations where id=v_attempt.invitation_id),1));
  if v_attempt.delivery_state='leased' then
    update public.contact_join_attempts set delivery_state='unknown',lease_id=null,lease_expires_at=null,
      code_payload_ciphertext=null where id=v_attempt.id and delivery_state='leased' and lease_expires_at<=now();
    continue;
  end if;
  v_invitation:=public.lock_open_contact_invitation((select token_hash from public.contact_invitations where id=v_attempt.invitation_id));
  if v_invitation.id is null then continue; end if;
  select * into v_attempt from public.contact_join_attempts
    where id=v_attempt.id and delivery_state='queued' and code_hash is not null and code_expires_at>now() for update skip locked;
  if not found then continue; end if;
  update public.contact_join_attempts set delivery_state='leased',lease_id=p_lease_id,
    lease_expires_at=now()+interval '30 seconds' where id=v_attempt.id;
  return jsonb_build_object('attemptId',v_attempt.id,'invitationHash',encode(v_invitation.token_hash,'hex'),
    'senderName',v_invitation.inviter_display_name,'provider',v_attempt.provider,
    'destinationCiphertext',v_attempt.destination_ciphertext,'destinationKeyVersion',v_attempt.destination_key_version,
    'payloadCiphertext',v_attempt.code_payload_ciphertext,'payloadKeyVersion',v_attempt.payload_key_version);
  end loop;
end $$;
