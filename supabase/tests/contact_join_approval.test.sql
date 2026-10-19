begin;
set local signalword.local_fixture='true';
select no_plan();
insert into auth.users(id) values('c1000000-0000-4000-8000-000000000001'),('c1000000-0000-4000-8000-000000000002');
insert into public.profiles(id,display_name) values('c1000000-0000-4000-8000-000000000001','Sender one'),('c1000000-0000-4000-8000-000000000002','Sender two');
select ok(not has_table_privilege('anon','public.contact_consent_receipts','SELECT'),'public cannot read consent receipts');
select ok(not has_table_privilege('authenticated','public.contact_consent_receipts','UPDATE'),'sender cannot rewrite consent evidence');
select ok(not has_table_privilege('service_role','public.contact_consent_receipts','INSERT'),'backend must use constrained activation');
select ok((select relrowsecurity from pg_class where oid='public.contact_consent_receipts'::regclass),'consent receipts have RLS');
select ok(not has_function_privilege('service_role','public.approve_contact_join(uuid,uuid,uuid,text)','EXECUTE'),'approval cannot use a service JWT');
select ok(not has_function_privilege('anon','public.withdraw_contact_join(bytea)','EXECUTE'),'withdrawal requires the journal-aware gateway');
select ok(not has_function_privilege('authenticated','public.review_contact_joins(uuid,uuid)','EXECUTE'),'sender cannot receive encrypted candidate records directly');
select ok(not has_function_privilege('service_role','public.reconcile_restore_before_contact_joins(uuid,bigint,text,jsonb)','EXECUTE'),'old restore entry cannot bypass pending-proof invalidation');
select ok(not has_function_privilege('service_role','public.begin_contact_join_before_approval(bytea,uuid,text,bytea,integer,bytea,text,integer,text,boolean,text)','EXECUTE'),'old verification entry is internal');

create function public.approval_test_begin(p_id integer,p_token text,p_destination text)
returns jsonb language sql as $$
 select public.begin_contact_join(extensions.digest(p_token,'sha256'),
  ('c3000000-0000-4000-8000-'||lpad(p_id::text,12,'0'))::uuid,repeat('encrypted-email',4),extensions.digest(p_destination,'sha256'),
  1,extensions.digest('code-'||p_id::text,'sha256'),repeat('encrypted-code',4),1,'2026-10-19',true,'fake',extensions.digest('manage-'||p_id::text,'sha256'));
$$;
create function public.approval_test_verify(p_id integer,p_token text)
returns boolean language sql as $$
 select public.verify_contact_join(extensions.digest(p_token,'sha256'),
  ('c3000000-0000-4000-8000-'||lpad(p_id::text,12,'0'))::uuid,extensions.digest('code-'||p_id::text,'sha256'));
$$;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',extensions.digest('approval-one','sha256'),repeat('x',48),1)->>'invitationId' as invite_one \gset
select public.create_contact_invitation('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002',extensions.digest('approval-two','sha256'),repeat('x',48),1)->>'invitationId' as invite_two \gset
select public.approval_test_begin(1,'approval-one','address-one');
select is(public.review_contact_joins('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid),'[]'::jsonb,'unverified email is not offered for approval');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid,'c3000000-0000-4000-8000-000000000001'),null::jsonb,'sender cannot approve before email verification');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(public.approval_test_verify(1,'approval-one'),true,'recipient verifies own address');
select is(jsonb_array_length(public.review_contact_joins('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid)),1,'verified candidate is offered to correct sender');
select is(public.review_contact_joins('c1000000-0000-4000-8000-000000000002',:'invite_one'::uuid),'[]'::jsonb,'cross-owner review reveals no candidate');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
select throws_ok(format('select public.approve_contact_join(%L,%L,%L)','c1000000-0000-4000-8000-000000000001',:'invite_one','c3000000-0000-4000-8000-000000000001'),'42501','NOT_AUTHORIZED','cross-owner identity injection is rejected');
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_one'::uuid,'c3000000-0000-4000-8000-000000000001'),null::jsonb,'own identity cannot approve someone else invitation');
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_two'::uuid,'c3000000-0000-4000-8000-000000000001'),null::jsonb,'cross-invitation proof is rejected');
select public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid,'c3000000-0000-4000-8000-000000000001','Travel buddy')->>'contactId' as contact_one \gset
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid,'c3000000-0000-4000-8000-000000000001')->>'contactId',:'contact_one','lost-response retry recovers same contact');
reset role;
select is((select count(*) from public.trusted_contacts),1::bigint,'approval creates exactly one contact');
select is((select status from public.trusted_contacts where id=:'contact_one'::uuid),'confirmed','approved contact is active');
select is((select count(*) from public.contact_consent_receipts),1::bigint,'approval atomically stores consent evidence');
select is((select consent_version from public.contact_consent_receipts),'2026-10-19','receipt preserves accepted consent version');
select ok((select recipient_accepted_at<=recipient_verified_at and recipient_verified_at<=sender_approved_at from public.contact_consent_receipts),'receipt preserves both parties chronological actions');
select ok((select consumed_at is not null and revoked_at is not null and token_ciphertext is null from public.contact_invitations where id=:'invite_one'::uuid),'consumed invitation closes and erases share recovery');
select is((select count(*) from public.contact_verification_deliveries),0::bigint,'approval sends no legacy invitation email');
select is((select count(*) from public.alert_deliveries),0::bigint,'approval sends no safety alert');
select is(public.purge_expired_contact_joins(),1::bigint,'closed invitation pending data is purged');
select is((select count(*) from public.contact_consent_receipts),1::bigint,'consent evidence survives short-lived pending data purge');
delete from public.contact_invitations where id=:'invite_one'::uuid;
select is((select count(*) from public.contact_consent_receipts),1::bigint,'consent evidence survives invitation retention');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(public.withdraw_contact_join(extensions.digest('unknown','sha256')),null::jsonb,'unknown management capability reveals nothing');
select is(public.withdraw_contact_join(extensions.digest('manage-1','sha256'))->>'withdrawn','true','recipient can withdraw after pending data was purged');
select is(public.withdraw_contact_join(extensions.digest('manage-1','sha256'))->>'withdrawn','true','recipient withdrawal retries idempotently');
reset role;
select is((select status from public.trusted_contacts where id=:'contact_one'::uuid),'disabled','withdrawal disables contact');
select ok((select withdrawn_at is not null from public.contact_consent_receipts where contact_id=:'contact_one'::uuid),'receipt records withdrawal');
select is((select count(*) from public.safety_journal_outbox where contact_id=:'contact_one'::uuid and kind='withdraw'),1::bigint,'withdrawal emits one independent journal entry');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_one'::uuid,'c3000000-0000-4000-8000-000000000001'),null::jsonb,'approval retry cannot revive withdrawn consent');
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.approval_test_begin(2,'approval-two','address-two');
select is(public.begin_contact_join(extensions.digest('approval-two','sha256'),'c3000000-0000-4000-8000-000000000002',
 repeat('encrypted-email',4),extensions.digest('address-two','sha256'),1,extensions.digest('code-2','sha256'),
 repeat('encrypted-code',4),1,'2026-10-19',true,'fake',extensions.digest('replace-management','sha256')),null::jsonb,'retry cannot replace recipient management capability');
select public.approval_test_verify(2,'approval-two');
select public.withdraw_contact_join(extensions.digest('manage-2','sha256'));
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_two'::uuid,'c3000000-0000-4000-8000-000000000002'),null::jsonb,'recipient withdrawal before approval prevents activation');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.begin_contact_join(extensions.digest('approval-two','sha256'),'c3000000-0000-4000-8000-000000000007',
 repeat('encrypted-email',4),extensions.digest('address-seven','sha256'),1,extensions.digest('code-7','sha256'),
 repeat('encrypted-code',4),1,'2026-10-19',true,'fake');
select public.approval_test_verify(7,'approval-two');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000001',:'invite_two'::uuid,'c3000000-0000-4000-8000-000000000007'),null::jsonb,'verification without recipient withdrawal capability cannot activate');
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000003',extensions.digest('approval-three','sha256'),repeat('x',48),1)->>'invitationId' as invite_three \gset
select public.approval_test_begin(3,'approval-three','address-three');
select public.approval_test_verify(3,'approval-three');
reset role;
update public.contact_join_attempts set created_at=now()-interval '1 hour',code_expires_at=now()-interval '50 minutes',expires_at=now()-interval '30 minutes' where id='c3000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_three'::uuid,'c3000000-0000-4000-8000-000000000003'),null::jsonb,'expired recipient proof cannot be approved');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.approval_test_begin(4,'approval-three','address-four');
select public.approval_test_verify(4,'approval-three');
reset role;
update public.contact_join_attempts set superseded_at=now() where id='c3000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_three'::uuid,'c3000000-0000-4000-8000-000000000004'),null::jsonb,'superseded verified proof cannot be approved');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.approval_test_begin(5,'approval-three','address-five');
select public.approval_test_verify(5,'approval-three');
reset role;
insert into public.pending_deletions(user_id,receipt_hash) values('c1000000-0000-4000-8000-000000000002',extensions.digest('pending-delete','sha256'));
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_three'::uuid,'c3000000-0000-4000-8000-000000000005'),null::jsonb,'pending account deletion prevents activation');
reset role;
delete from public.pending_deletions where user_id='c1000000-0000-4000-8000-000000000002';
set local signalword.local_fixture='false';
set local role authenticated;
select throws_ok(format('select public.approve_contact_join(%L,%L,%L)','c1000000-0000-4000-8000-000000000002',:'invite_three','c3000000-0000-4000-8000-000000000005'),'P0001','SAFETY_AUTHORITY_UNAVAILABLE','activation fails closed during restore quarantine');
reset role;
set local signalword.local_fixture='true';
set local role authenticated;
select public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_three'::uuid,'c3000000-0000-4000-8000-000000000005')->>'contactId' as contact_two \gset
reset role;

-- Simulate restoring an old snapshot with valid, unfinished recipient proof.
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000004',extensions.digest('restore-pending','sha256'),repeat('x',48),1)->>'invitationId' as invite_restore \gset
select public.approval_test_begin(6,'restore-pending','address-six');
select public.approval_test_verify(6,'restore-pending');
reset role;
select public.reconcile_restore_journal('c5000000-0000-4000-8000-000000000001',1,repeat('a',64),'[]');
select is((select count(*) from public.contact_join_attempts),0::bigint,'restore erases all unfinished recipient data and queued code messages');
select is((select count(*) from public.contact_invitations where revoked_at is null),0::bigint,'restore invalidates all prior invitation capabilities');
select is((select status from public.trusted_contacts where id=:'contact_two'::uuid),'confirmed','restore preserves existing proven consent absent withdrawal');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.approve_contact_join('c1000000-0000-4000-8000-000000000002',:'invite_restore'::uuid,'c3000000-0000-4000-8000-000000000006'),null::jsonb,'restored verified proof cannot activate');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(public.claim_contact_join_email('c6000000-0000-4000-8000-000000000001'),null::jsonb,'restored code queue cannot send');
select is(public.withdraw_contact_join(extensions.digest('manage-5','sha256'))->>'withdrawn','true','recipient management capability survives restore for active consent');
reset role;
select is((select status from public.trusted_contacts where id=:'contact_two'::uuid),'disabled','post-restore recipient withdrawal still disables contact');
-- Model a backup taken before withdrawal, then replay the external journal.
update public.contact_consent_receipts set withdrawn_at=null where contact_id=:'contact_two'::uuid;
update public.trusted_contacts set status='confirmed',confirmed_at=now() where id=:'contact_two'::uuid;
select public.reconcile_restore_journal('c5000000-0000-4000-8000-000000000002',2,repeat('b',64),
 jsonb_build_array(jsonb_build_object('input',jsonb_build_object('kind','withdraw','userId','c1000000-0000-4000-8000-000000000002','contactId',:'contact_two','generation',1))));
select is((select status from public.trusted_contacts where id=:'contact_two'::uuid),'disabled','external withdrawal journal prevents restored consent from reviving');
select ok((select withdrawn_at is not null from public.contact_consent_receipts where contact_id=:'contact_two'::uuid),'restore replay marks associated consent evidence withdrawn');
-- A later explicitly proven generation must not be disabled by the old capability.
update public.trusted_contacts set consent_generation=2,status='confirmed',confirmed_at=now() where id=:'contact_two'::uuid;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.withdraw_contact_join(extensions.digest('manage-5','sha256'));
reset role;
select is((select status from public.trusted_contacts where id=:'contact_two'::uuid),'confirmed','old withdrawal capability cannot disable newer consent generation');
delete from auth.users where id='c1000000-0000-4000-8000-000000000002';
select is((select count(*) from public.contact_consent_receipts where user_id='c1000000-0000-4000-8000-000000000002'),0::bigint,'account deletion removes durable consent receipt');
select * from finish();
rollback;
