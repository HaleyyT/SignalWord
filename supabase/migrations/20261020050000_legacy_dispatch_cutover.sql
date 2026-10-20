-- Pause legacy claims before deleting unconfirmed destinations. Existing
-- delivery/receipt reconciliation and consenting users' alerts keep working.
alter function public.claim_contact_verification_deliveries(uuid,integer)
rename to claim_contact_verification_before_cutover;
revoke all on function public.claim_contact_verification_before_cutover(uuid,integer) from public,anon,authenticated,service_role;
create function public.claim_contact_verification_deliveries(p_worker_id uuid,p_limit integer default 1)
returns table(delivery_id uuid,contact_id uuid,provider text,provider_idempotency_key text,
 payload_ciphertext text,payload_key_version smallint,destination_ciphertext text,destination_key_version smallint,attempt_count integer)
language plpgsql security definer set search_path='' as $$
begin
  if (select legacy_disabled from public.contact_setup_policy where singleton) then return; end if;
  return query select * from public.claim_contact_verification_before_cutover(p_worker_id,p_limit);
end $$;
revoke all on function public.claim_contact_verification_deliveries(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_contact_verification_deliveries(uuid,integer) to service_role;

create function public.pause_legacy_contact_setup() returns void
language sql security definer set search_path='' as $$
 update public.contact_setup_policy set legacy_disabled=true where singleton;
$$;
revoke all on function public.pause_legacy_contact_setup() from public,anon,authenticated,service_role;

alter function public.retire_legacy_contact_setup() rename to retire_legacy_contact_setup_before_dispatch_guard;
revoke all on function public.retire_legacy_contact_setup_before_dispatch_guard() from public,anon,authenticated,service_role;
create function public.retire_legacy_contact_setup() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  lock table public.trusted_contacts in access exclusive mode;
  lock table public.contact_verification_deliveries in access exclusive mode;
  if exists(select 1 from public.contact_verification_deliveries where lease_owner is not null and lease_expires_at>now()) then
    raise exception using errcode='P0001',message='LEGACY_DELIVERY_IN_FLIGHT';
  end if;
  result:=public.retire_legacy_contact_setup_before_dispatch_guard();
  -- Removing an unconfirmed primary must not strand an already confirmed
  -- secondary contact. Preserve existing primary choices; never revive consent.
  update public.trusted_contacts c set is_primary=true
  from (select distinct on (user_id) id from public.trusted_contacts t
    where status='confirmed' and not exists(select 1 from public.trusted_contacts p where p.user_id=t.user_id and p.is_primary)
    order by user_id,created_at,id) replacement where c.id=replacement.id;
  return result;
end $$;
revoke all on function public.retire_legacy_contact_setup() from public,anon,authenticated,service_role;
