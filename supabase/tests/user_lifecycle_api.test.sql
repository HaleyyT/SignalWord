begin;

select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'lifecycle-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'lifecycle-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.profiles (id, display_name) values
  ('41000000-0000-4000-8000-000000000001', 'Lifecycle A'),
  ('42000000-0000-4000-8000-000000000002', 'Lifecycle B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);

select lives_ok($$
  select * from public.create_or_replace_contact(
    '41000000-0000-4000-8000-000000000001', 'Trusted A', 'email',
    repeat('d', 48), repeat('f', 64), 1,
    extensions.digest('confirm-a', 'sha256'), repeat('c', 48), 1, 'fake'
  )
$$, 'user A can create an encrypted pending contact');

select is((select status from public.trusted_contacts where user_id = '41000000-0000-4000-8000-000000000001'),
  'pending', 'new contact is pending');
reset role;
select ok((select expires_at <= now() + interval '31 minutes' from public.contact_confirmation_tokens limit 1),
  'confirmation expires within thirty minutes');
set local role anon;
select is(public.confirm_contact(extensions.digest('confirm-a', 'sha256')), true,
  'valid confirmation is consumed');
reset role;
select is((select status from public.trusted_contacts where user_id = '41000000-0000-4000-8000-000000000001'),
  'confirmed', 'contact becomes confirmed');
set local role anon;
select is(public.confirm_contact(extensions.digest('confirm-a', 'sha256')), false,
  'confirmation token is single use');
reset role;

select set_config('request.jwt.claim.sub', '42000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*) from public.get_my_contact('41000000-0000-4000-8000-000000000001')),
  0::bigint, 'user B cannot read user A contact through the RPC');
select throws_ok($$select public.disable_contact(
    '41000000-0000-4000-8000-000000000001',
    (select id from public.trusted_contacts where user_id = '41000000-0000-4000-8000-000000000001'))$$,
  '42501', 'NOT_AUTHORIZED', 'user B cannot disable user A contact');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
select lives_ok($$
  select * from public.create_or_reuse_alert(
    '41000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000003',
    'real', 'manual', repeat('v', 43), 'fake', repeat('p', 48), 1, null
  )
$$, 'confirmed user can create an alert');
select is((select count(*) from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'),
  1::bigint, 'one alert exists');

select is((select accepted from public.append_alert_location(
  '41000000-0000-4000-8000-000000000001',
  (select id from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'),
  jsonb_build_object('capturedAt', now() - interval '2 days', 'latitude', -33.8,
    'longitude', 151.2, 'horizontalAccuracyM', 10)
)), false, 'implausibly old location is rejected without failing the alert');

select is((select accepted from public.append_alert_location(
  '41000000-0000-4000-8000-000000000001',
  (select id from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'),
  jsonb_build_object('capturedAt', now(), 'latitude', -33.8,
    'longitude', 151.2, 'horizontalAccuracyM', 10)
)), true, 'current valid location is accepted');
select is((select count(*) from public.location_samples), 1::bigint, 'only valid location is stored');

select lives_ok($$select * from public.resolve_alert(
  '41000000-0000-4000-8000-000000000001',
  (select id from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'))$$,
  'owner can resolve active alert');
select is((select state from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'),
  'resolved', 'alert is resolved');
reset role;
select is((select count(*) from public.viewer_tokens where revoked_at is null), 1::bigint,
  'resolved viewer remains available during bounded resolution window');
select is((select count(*) from public.alert_deliveries where message_type = 'resolved'), 1::bigint,
  'resolution queues exactly one status delivery');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok($$select * from public.resolve_alert(
  '41000000-0000-4000-8000-000000000001',
  (select id from public.alert_events where user_id = '41000000-0000-4000-8000-000000000001'))$$,
  'resolution is idempotent');
reset role;
select is((select count(*) from public.alert_deliveries where message_type = 'resolved'), 1::bigint,
  'idempotent resolution does not duplicate delivery');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select isnt(public.delete_my_account('41000000-0000-4000-8000-000000000001'), null,
  'delete data returns a deletion receipt');
reset role;
select is((select count(*) from auth.users where id = '41000000-0000-4000-8000-000000000001'),
  0::bigint, 'auth identity is deleted');

select * from finish();
rollback;
