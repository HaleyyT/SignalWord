begin;
set local signalword.local_fixture = 'true';
select no_plan();

insert into auth.users(id) values
  ('a1000000-0000-4000-8000-000000000001'), ('a1000000-0000-4000-8000-000000000002');
insert into public.profiles(id,display_name) values
  ('a1000000-0000-4000-8000-000000000001','Sender one'),
  ('a1000000-0000-4000-8000-000000000002','Sender two');

select ok(not has_table_privilege('anon','public.contact_invitations','SELECT'), 'public cannot read invitation rows');
select ok(not has_table_privilege('authenticated','public.contact_invitations','SELECT'), 'even owners must use the safe projection');
select ok(not has_table_privilege('service_role','public.contact_invitations','INSERT'), 'service uses constrained RPC rather than arbitrary writes');
select ok(not has_function_privilege('authenticated','public.create_contact_invitation(uuid,uuid,bytea,text,integer)','EXECUTE'), 'senders cannot choose their own capability hashes');
select ok(not has_function_privilege('anon','public.purge_expired_contact_invitations()','EXECUTE'), 'public cannot invoke retention');
select ok((select relrowsecurity from pg_class where oid='public.contact_invitations'::regclass), 'RLS is enabled');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001', extensions.digest('invitation-one','sha256'),repeat('x',48),1)
  ->> 'invitationId' as first_id \gset
select is(public.create_contact_invitation('a1000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001', extensions.digest('retry-unused-token','sha256'),repeat('y',48),1)
  ->> 'invitationId', :'first_id', 'lost-response retry returns original invitation');
reset role;
select is((select count(*) from public.contact_invitations),1::bigint,'retry creates no duplicate');
select is((select token_hash from public.contact_invitations),extensions.digest('invitation-one','sha256'),'retry does not replace capability');
select is((select count(*) from public.trusted_contacts),0::bigint,'invitation creates no trusted contact');
select is((select count(*) from public.contact_verification_deliveries),0::bigint,'invitation queues no email');
select is((select count(*) from public.alert_deliveries),0::bigint,'invitation queues no alert');
select is((select request_count from public.rate_limit_buckets where subject_hash=extensions.digest('contact_invitation:a1000000-0000-4000-8000-000000000001','sha256')),1,'retry consumes no additional rate capacity');

set local role anon;
select is(public.preview_contact_invitation(extensions.digest('invitation-one','sha256'))->>'displayName','Sender one','valid capability previews inviter');
select is((select count(*) from jsonb_object_keys(public.preview_contact_invitation(extensions.digest('invitation-one','sha256')))),3::bigint,'preview contains exactly three safe fields');
select is(public.preview_contact_invitation(extensions.digest('unissued','sha256')),null::jsonb,'unknown capability is unavailable');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select is(public.list_contact_invitations('a1000000-0000-4000-8000-000000000002'),'[]'::jsonb,'second account sees no invitation');
select throws_ok($$select public.list_contact_invitations('a1000000-0000-4000-8000-000000000001')$$,'42501','NOT_AUTHORIZED','cross-owner list is denied');
select is(public.revoke_contact_invitation('a1000000-0000-4000-8000-000000000002',:'first_id'::uuid),false,'other-owner revoke reveals no existence');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is((public.list_contact_invitations('a1000000-0000-4000-8000-000000000001')->0->>'invitationId'),:'first_id','owner can list own invitation');
select is((select count(*) from jsonb_object_keys(public.list_contact_invitations('a1000000-0000-4000-8000-000000000001')->0)),4::bigint,'owner summary hides capability and ciphertext');
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002',extensions.digest('two','sha256'),repeat('x',48),1);
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000003',extensions.digest('three','sha256'),repeat('x',48),1);
select throws_ok($$select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000004',extensions.digest('four','sha256'),repeat('x',48),1)$$,'23514','CONTACT_LIMIT','fourth concurrent slot is denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.revoke_contact_invitation('a1000000-0000-4000-8000-000000000001',:'first_id'::uuid),true,'owner revokes invitation');
select is(public.revoke_contact_invitation('a1000000-0000-4000-8000-000000000001',:'first_id'::uuid),true,'revocation retry succeeds');
reset role;
select is((select token_ciphertext from public.contact_invitations where id=:'first_id'::uuid),null::text,'revocation erases recovery material');
set local role anon;
select is(public.preview_contact_invitation(extensions.digest('invitation-one','sha256')),null::jsonb,'revoked capability cannot preview');
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',extensions.digest('do-not-revive','sha256'),repeat('x',48),1)->>'status','revoked','retry cannot revive a revoked invitation');
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000004',extensions.digest('four','sha256'),repeat('x',48),1);
reset role;
update public.contact_invitations set revoked_at=now(),token_ciphertext=null where user_id='a1000000-0000-4000-8000-000000000001';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000005',extensions.digest('five','sha256'),repeat('x',48),1);
reset role;
update public.contact_invitations set revoked_at=now(),token_ciphertext=null where user_id='a1000000-0000-4000-8000-000000000001';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok($$select public.create_contact_invitation('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000006',extensions.digest('six','sha256'),repeat('x',48),1)$$,'P0001','RATE_LIMITED','revocation does not reset the hourly budget');
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000007',extensions.digest('expiry','sha256'),repeat('x',48),1);
reset role;
update public.contact_invitations set created_at=now()-interval '2 days',expires_at=now()-interval '1 second' where user_id='a1000000-0000-4000-8000-000000000002';
set local role anon;
select is(public.preview_contact_invitation(extensions.digest('expiry','sha256')),null::jsonb,'expired link cannot preview');
reset role;
select is(public.purge_expired_contact_invitations(),1::bigint,'retention removes expired invitation');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.create_contact_invitation('a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000008',extensions.digest('deletion','sha256'),repeat('x',48),1);
reset role;
set local signalword.local_fixture='false';
set local role anon;
select throws_ok($$select public.preview_contact_invitation(extensions.digest('deletion','sha256'))$$,'P0001','SAFETY_AUTHORITY_UNAVAILABLE','preview cannot bypass the independent restore authority');
reset role;
set local signalword.local_fixture='true';
update public.profiles set deleted_at=now() where id='a1000000-0000-4000-8000-000000000002';
set local role anon;
select is(public.preview_contact_invitation(extensions.digest('deletion','sha256')),null::jsonb,'soft-deleted sender is not exposed by a link');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok($$select public.create_contact_invitation('a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000009',extensions.digest('blocked-deletion','sha256'),repeat('x',48),1)$$,'42501','NOT_AUTHORIZED','soft-deleted account cannot create links');
reset role;
update public.profiles set deleted_at=null where id='a1000000-0000-4000-8000-000000000002';
insert into public.pending_deletions(user_id,receipt_hash) values('a1000000-0000-4000-8000-000000000002',extensions.digest('pending-deletion-receipt','sha256'));
set local role anon;
select is(public.preview_contact_invitation(extensions.digest('deletion','sha256')),null::jsonb,'pending deletion immediately hides invitation preview');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.list_contact_invitations('a1000000-0000-4000-8000-000000000002')$$,'42501','NOT_AUTHORIZED','pending deletion cannot read enrollment state');
reset role;
delete from auth.users where id='a1000000-0000-4000-8000-000000000002';
select is((select count(*) from public.contact_invitations where user_id='a1000000-0000-4000-8000-000000000002'),0::bigint,'account deletion cascades to invitation data');
select is((select count(*) from public.trusted_contacts),0::bigint,'entire lifecycle has created no consent or contact');
select is((select count(*) from public.contact_verification_deliveries),0::bigint,'entire lifecycle sent no invitation email');
select * from finish();
rollback;
