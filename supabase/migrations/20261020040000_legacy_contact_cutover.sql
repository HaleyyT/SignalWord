-- Prepared, disabled-by-default cutover. Only the database owner may retire
-- legacy setup. No HTTP endpoint, client GUC or service-role RPC can enable it.
create table public.contact_setup_policy (
  singleton boolean primary key default true check(singleton),
  legacy_disabled boolean not null default false,
  retired_at timestamptz
);
insert into public.contact_setup_policy(singleton) values(true);
alter table public.contact_setup_policy enable row level security;
revoke all on public.contact_setup_policy from public,anon,authenticated,service_role;

create function public.guard_legacy_contact_setup() returns trigger
language plpgsql security definer set search_path='' as $$
declare disabled boolean;
begin
  select legacy_disabled into disabled from public.contact_setup_policy where singleton for share;
  if disabled and (new.status='pending' or (tg_op='UPDATE' and old.status='pending' and new.status='confirmed')) then
    raise exception using errcode='P0001',message='CONTACT_SETUP_CHANGED';
  end if;
  return new;
end $$;
revoke all on function public.guard_legacy_contact_setup() from public,anon,authenticated,service_role;
create trigger guard_legacy_contact_setup before insert or update on public.trusted_contacts
for each row execute function public.guard_legacy_contact_setup();

create function public.retire_legacy_contact_setup() returns jsonb
language plpgsql security definer set search_path='' as $$
declare removed bigint;
begin
  -- Serialize with existing creation, confirmation and approval transactions.
  -- Confirmed and disabled contacts, consent receipts and alerts are preserved.
  lock table public.trusted_contacts in access exclusive mode;
  update public.contact_setup_policy set legacy_disabled=true,retired_at=coalesce(retired_at,now()) where singleton;
  delete from public.trusted_contacts where status='pending';
  get diagnostics removed=row_count;
  return jsonb_build_object('legacyDisabled',true,'unconfirmedContactsRemoved',removed);
end $$;
revoke all on function public.retire_legacy_contact_setup() from public,anon,authenticated,service_role;
