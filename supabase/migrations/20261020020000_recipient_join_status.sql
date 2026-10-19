create function public.contact_join_status(p_withdrawal_hash bytea) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.contact_consent_receipts%rowtype; a public.contact_join_attempts%rowtype; i public.contact_invitations%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
 select * into r from public.contact_consent_receipts where withdrawal_hash=p_withdrawal_hash;
 if found then
   perform public.require_safety_authority(r.user_id);
   if exists(select 1 from public.pending_deletions where user_id=r.user_id)
     or not exists(select 1 from public.profiles where id=r.user_id and deleted_at is null) then return null; end if;
   return jsonb_build_object('status',case when r.withdrawn_at is not null or not exists(
     select 1 from public.trusted_contacts where id=r.contact_id and status='confirmed' and consent_generation=r.generation
   ) then case when exists(select 1 from public.safety_journal_outbox where contact_id=r.contact_id
       and generation=r.generation and kind='withdraw' and durable_at is null) then 'withdrawal_pending' else 'withdrawn' end
     else 'approved' end);
 end if;
 select * into a from public.contact_join_attempts where withdrawal_hash=p_withdrawal_hash;
 if not found then return null; end if;
 select * into i from public.contact_invitations where id=a.invitation_id;
 if not found then return null; end if;
 perform public.require_safety_authority(i.user_id);
 if exists(select 1 from public.pending_deletions where user_id=i.user_id)
   or not exists(select 1 from public.profiles where id=i.user_id and deleted_at is null) then return null; end if;
 return jsonb_build_object('status',case when a.superseded_at is not null or a.expires_at<=now() or i.revoked_at is not null or i.expires_at<=now() then 'expired'
   when a.verified_at is not null then 'pending_approval' when a.code_hash is null or a.code_expires_at<=now() then 'expired' else 'pending_email' end);
end $$;
revoke all on function public.contact_join_status(bytea) from public,anon,authenticated;
grant execute on function public.contact_join_status(bytea) to service_role;
