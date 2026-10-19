begin;
set local signalword.local_fixture='true';
select no_plan();
insert into auth.users(id) values('b1000000-0000-4000-8000-000000000001');
insert into public.profiles(id,display_name) values('b1000000-0000-4000-8000-000000000001','Consent sender');

select ok(not has_table_privilege('anon','public.contact_join_attempts','SELECT'),'public cannot read recipient data');
select ok(not has_table_privilege('authenticated','public.contact_join_attempts','SELECT'),'sender cannot read pending email/code data');
select ok(not has_table_privilege('service_role','public.contact_join_attempts','INSERT'),'service writes only through constrained RPC');
select ok((select relrowsecurity from pg_class where oid='public.contact_join_attempts'::regclass),'join table has RLS');
select ok(not has_function_privilege('anon','public.verify_contact_join(bytea,uuid,bytea)','EXECUTE'),'public cannot bypass the verification gateway');
select ok(not has_function_privilege('authenticated','public.claim_contact_join_email(uuid)','EXECUTE'),'sender cannot claim verification messages');
select ok(not has_function_privilege('service_role','public.lock_open_contact_invitation(bytea)','EXECUTE'),'internal lock helper is not a callable API');
select ok(not has_function_privilege('service_role','public.purge_expired_contact_joins()','EXECUTE'),'retention is maintenance-only');

-- Test-only helper: exact production RPC, no weakened authorization/guard logic.
create function public.test_begin_join(p_id integer,p_token text default 'join-one',p_destination text default 'address-one',p_consent boolean default true,p_version text default '2026-10-19')
returns jsonb language sql as $$
  select public.begin_contact_join(extensions.digest(p_token,'sha256'),
    ('b4000000-0000-4000-8000-'||lpad(p_id::text,12,'0'))::uuid,repeat('encrypted-email',4),
    extensions.digest(p_destination,'sha256'),1,extensions.digest('bound-code-'||p_id::text,'sha256'),
    repeat('encrypted-code',4),1,p_version,p_consent,'fake');
$$;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',extensions.digest('join-one','sha256'),repeat('x',48),1)->>'invitationId' as invitation_id \gset
select public.create_contact_invitation('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002',extensions.digest('join-two','sha256'),repeat('x',48),1);
select throws_ok($$select public.test_begin_join(1,'join-one','address-one',false)$$,'22023','INVALID_JOIN_REQUEST','explicit consent is mandatory');
select throws_ok($$select public.test_begin_join(1,'join-one','address-one',true,'old')$$,'22023','INVALID_JOIN_REQUEST','consent version must match invitation');
select is(public.test_begin_join(1,'unknown'),null::jsonb,'unknown link cannot collect email');
select is(public.test_begin_join(1)->>'attemptId','b4000000-0000-4000-8000-000000000001','valid self-submission creates an attempt');
select is(public.test_begin_join(1)->>'attemptId','b4000000-0000-4000-8000-000000000001','same request retries idempotently');
select is(public.test_begin_join(1,'join-one','different-address'),null::jsonb,'idempotency cannot switch email address');
select is(public.test_begin_join(1,'join-two'),null::jsonb,'attempt cannot move to a different invitation');
select throws_ok($$select public.test_begin_join(2)$$,'P0001','RATE_LIMITED','fresh resend respects cooldown');
select throws_ok($$select public.test_begin_join(2,'join-two')$$,'P0001','RATE_LIMITED','destination cooldown spans invitations');
reset role;
select is((select count(*) from public.contact_join_attempts),1::bigint,'retry queues exactly one message');
select is((select consent_version from public.contact_join_attempts),'2026-10-19','consent version is recorded');
select ok((select consent_accepted_at=created_at from public.contact_join_attempts),'consent time is recorded server-side');
select is((select count(*) from public.trusted_contacts),0::bigint,'self-submission creates no trusted contact');

set local role service_role;
select is(public.verify_contact_join(extensions.digest('join-two','sha256'),'b4000000-0000-4000-8000-000000000001',extensions.digest('bound-code-1','sha256')),false,'cross-invitation code is rejected');
select is(public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000001',extensions.digest('wrong','sha256')),false,'wrong code is rejected');
reset role;
select is((select failed_code_attempts from public.contact_join_attempts),1,'wrong attempt persists instead of rolling back');
select is((select verified_at from public.contact_join_attempts),null::timestamptz,'wrong code cannot verify recipient');

set local role service_role;
select is(public.claim_contact_join_email('b5000000-0000-4000-8000-000000000001')->>'attemptId','b4000000-0000-4000-8000-000000000001','worker claims encrypted email');
select is(public.claim_contact_join_email('b5000000-0000-4000-8000-000000000002'),null::jsonb,'leased message is not claimed twice');
select is(public.finish_contact_join_email('b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002','sent','receipt'),false,'wrong lease cannot finalize');
select is(public.finish_contact_join_email('b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','sent','receipt'),true,'lease owner finalizes accepted email');
select is(public.finish_contact_join_email('b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','sent','receipt'),false,'duplicate finish cannot alter completed message');
select is(public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000001',extensions.digest('bound-code-1','sha256')),true,'correct bound proof verifies email');
select is(public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000001',extensions.digest('bound-code-1','sha256')),false,'proof is single-use');
reset role;
select ok((select verified_at is not null and code_hash is null and code_payload_ciphertext is null from public.contact_join_attempts),'verification erases code material');
select is((select count(*) from public.trusted_contacts),0::bigint,'email verification alone cannot activate contact');
select is((select count(*) from public.alert_deliveries),0::bigint,'no alert exists before sender approval');

-- Time travel only in disposable test data, not production code.
update public.contact_join_attempts set created_at=now()-interval '61 seconds' where id='b4000000-0000-4000-8000-000000000001';
update public.rate_limit_buckets set updated_at=now()-interval '61 seconds' where subject_hash=extensions.digest('contact_join:destination:'||encode(extensions.digest('address-one','sha256'),'hex'),'sha256');
set local role service_role;
select public.test_begin_join(2);
reset role;
select ok((select superseded_at is not null from public.contact_join_attempts where id='b4000000-0000-4000-8000-000000000001'),'resend invalidates earlier verified attempt for future approval');
set local role service_role;
select public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000002',extensions.digest('wrong','sha256')) from generate_series(1,5);
select is(public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000002',extensions.digest('bound-code-2','sha256')),false,'five wrong codes lock even the correct proof');
reset role;
select is((select failed_code_attempts from public.contact_join_attempts where id='b4000000-0000-4000-8000-000000000002'),5,'failed-code budget cannot exceed five');
select ok((select code_hash is null and code_payload_ciphertext is null from public.contact_join_attempts where id='b4000000-0000-4000-8000-000000000002'),'locked code material is erased');
update public.contact_join_attempts set created_at=now()-interval '61 seconds' where id='b4000000-0000-4000-8000-000000000002';
update public.rate_limit_buckets set updated_at=now()-interval '61 seconds' where subject_hash=extensions.digest('contact_join:destination:'||encode(extensions.digest('address-one','sha256'),'hex'),'sha256');
set local role service_role;
select public.test_begin_join(3);
select public.claim_contact_join_email('b5000000-0000-4000-8000-000000000003');
reset role;
update public.contact_join_attempts set lease_expires_at=now()-interval '1 second' where id='b4000000-0000-4000-8000-000000000003';
set local role service_role;
select is(public.claim_contact_join_email('b5000000-0000-4000-8000-000000000004'),null::jsonb,'expired lease cannot be resent automatically');
select is(public.finish_contact_join_email('b4000000-0000-4000-8000-000000000003','b5000000-0000-4000-8000-000000000003','sent','late-receipt'),false,'stale worker cannot overwrite uncertainty');
reset role;
select is((select delivery_state from public.contact_join_attempts where id='b4000000-0000-4000-8000-000000000003'),'unknown','expired lease is explicitly uncertain');
update public.contact_join_attempts set created_at=now()-interval '61 seconds' where id='b4000000-0000-4000-8000-000000000003';
update public.rate_limit_buckets set updated_at=now()-interval '61 seconds' where subject_hash=extensions.digest('contact_join:destination:'||encode(extensions.digest('address-one','sha256'),'hex'),'sha256');
set local role service_role;
select throws_ok($$select public.test_begin_join(4)$$,'P0001','RATE_LIMITED','destination is capped at three requests per hour');
select public.test_begin_join(4,'join-two','address-two');
reset role;
update public.contact_join_attempts set created_at=now()-interval '20 minutes',code_expires_at=now()-interval '1 minute' where id='b4000000-0000-4000-8000-000000000004';
set local role service_role;
select is(public.verify_contact_join(extensions.digest('join-two','sha256'),'b4000000-0000-4000-8000-000000000004',extensions.digest('bound-code-4','sha256')),false,'expired code cannot verify email');
reset role;

-- Revocation, deletion and restore quarantine guards apply to pending joins.
set local signalword.local_fixture='false';
set local role service_role;
select throws_ok($$select public.test_begin_join(5,'join-two','address-three')$$,'P0001','SAFETY_AUTHORITY_UNAVAILABLE','new enrollment cannot bypass restore authority');
reset role;
set local signalword.local_fixture='true';
insert into public.pending_deletions(user_id,receipt_hash) values('b1000000-0000-4000-8000-000000000001',extensions.digest('delete','sha256'));
set local role service_role;
select is(public.test_begin_join(5,'join-two','address-three'),null::jsonb,'pending deletion prevents email collection');
reset role;
delete from public.pending_deletions where user_id='b1000000-0000-4000-8000-000000000001';
set local role service_role;
select public.test_begin_join(5,'join-two','address-three');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select public.revoke_contact_invitation('b1000000-0000-4000-8000-000000000001',:'invitation_id'::uuid);
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(public.verify_contact_join(extensions.digest('join-one','sha256'),'b4000000-0000-4000-8000-000000000003',extensions.digest('bound-code-3','sha256')),false,'revocation blocks correct unexpired code');
reset role;
select is(public.purge_expired_contact_joins(),3::bigint,'retention removes revoked invitation recipient data');
set local role service_role;
select public.claim_contact_join_email('b5000000-0000-4000-8000-000000000005');
select is(public.finish_contact_join_email('b4000000-0000-4000-8000-000000000005','b5000000-0000-4000-8000-000000000005','unknown'),true,'ambiguous provider result is terminal');
select is(public.claim_contact_join_email('b5000000-0000-4000-8000-000000000006'),null::jsonb,'unknown result is never claimed again');
reset role;
update public.contact_join_attempts set created_at=now()-interval '1 hour',code_expires_at=now()-interval '50 minutes',expires_at=now()-interval '30 minutes' where id='b4000000-0000-4000-8000-000000000004';
select is(public.purge_expired_contact_joins(),1::bigint,'expired incomplete recipient data is purged');
delete from public.contact_join_attempts where id='b4000000-0000-4000-8000-000000000005';
set local role service_role;
select throws_ok($$select public.test_begin_join(6,'join-two','address-three')$$,'P0001','RATE_LIMITED','recipient-data removal cannot reset destination cooldown');
reset role;
delete from auth.users where id='b1000000-0000-4000-8000-000000000001';
select is((select count(*) from public.contact_join_attempts),0::bigint,'account deletion cascades to pending recipient data');
select * from finish();
rollback;
