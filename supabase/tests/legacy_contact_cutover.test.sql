begin;
set local signalword.local_fixture='true';
select no_plan();
select ok(not has_table_privilege('authenticated','public.contact_setup_policy','UPDATE'),'senders cannot change cutover policy');
select ok(not has_function_privilege('service_role','public.retire_legacy_contact_setup()','EXECUTE'),'service API cannot retire legacy setup');
select ok(not has_function_privilege('authenticated','public.retire_legacy_contact_setup()','EXECUTE'),'sender cannot trigger global cleanup');
select is((select legacy_disabled from public.contact_setup_policy),false,'migration does not enable cutover');
insert into auth.users(id) values('d1000000-0000-4000-8000-000000000001');
insert into public.profiles(id,display_name) values('d1000000-0000-4000-8000-000000000001','Sender');
insert into public.trusted_contacts(id,user_id,name,channel,destination_ciphertext,destination_fingerprint,status,confirmed_at)
values('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Existing confirmed','email',repeat('cipher',8),repeat('1',64),'confirmed',now()),
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','Legacy pending','email',repeat('cipher',8),repeat('2',64),'pending',null);
-- Upgrade edge: the old primary was still pending, a secondary was proven.
update public.trusted_contacts set is_primary=false where id='d2000000-0000-4000-8000-000000000001';
update public.trusted_contacts set is_primary=true where id='d2000000-0000-4000-8000-000000000002';
select ok(not has_function_privilege('service_role','public.claim_contact_verification_before_cutover(uuid,integer)','EXECUTE'),'old claim entry cannot bypass cutover');
select ok(not has_function_privilege('authenticated','public.pause_legacy_contact_setup()','EXECUTE'),'clients cannot pause legacy setup');
insert into public.contact_verification_deliveries(trusted_contact_id,provider,provider_idempotency_key,payload_ciphertext,payload_key_version,lease_owner,lease_expires_at)
values('d2000000-0000-4000-8000-000000000002','fake','cutover-lease',repeat('payload',8),1,gen_random_uuid(),now()+interval '30 seconds');
select throws_ok('select public.retire_legacy_contact_setup()','P0001','LEGACY_DELIVERY_IN_FLIGHT','cleanup cannot discard a live send lease');
select lives_ok('select public.pause_legacy_contact_setup()','operator can pause legacy claims before cleanup');
select is((select count(*)::integer from public.claim_contact_verification_deliveries(gen_random_uuid(),1)),0,'paused legacy queue never claims new messages');
update public.contact_verification_deliveries set lease_expires_at=now()-interval '1 second' where provider_idempotency_key='cutover-lease';
select is((public.retire_legacy_contact_setup()->>'unconfirmedContactsRemoved')::integer,1,'cutover removes unconfirmed third-party data');
select is((select count(*)::integer from public.trusted_contacts),1,'confirmed contact survives');
select is((select is_primary from public.trusted_contacts where id='d2000000-0000-4000-8000-000000000001'),true,'confirmed secondary becomes primary when pending primary is removed');
select is((select status from public.trusted_contacts where id='d2000000-0000-4000-8000-000000000001'),'confirmed','confirmed consent unchanged');
select throws_ok($$insert into public.trusted_contacts(user_id,name,channel,destination_ciphertext,destination_fingerprint)
values('d1000000-0000-4000-8000-000000000001','Blocked','email',repeat('cipher',8),repeat('3',64))$$,'P0001','CONTACT_SETUP_CHANGED','database blocks direct legacy pending writes');
select throws_ok($$update public.trusted_contacts set status='pending',confirmed_at=null where id='d2000000-0000-4000-8000-000000000001'$$,'P0001','CONTACT_SETUP_CHANGED','legacy replacement cannot reset existing consent');
select lives_ok($$insert into public.trusted_contacts(user_id,name,channel,destination_ciphertext,destination_fingerprint,status,confirmed_at)
values('d1000000-0000-4000-8000-000000000001','Approved recipient','email',repeat('cipher',8),repeat('4',64),'confirmed',now())$$,'new atomic confirmed-contact activation remains possible');
select is((public.retire_legacy_contact_setup()->>'unconfirmedContactsRemoved')::integer,0,'cutover retry is idempotent');
select * from finish();
rollback;
