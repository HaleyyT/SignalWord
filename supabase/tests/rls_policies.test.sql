begin;

select plan(17);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'trusted_contacts', 'trusted contacts table exists');
select has_table('public', 'alert_events', 'alert events table exists');
select has_table('public', 'location_samples', 'location samples table exists');
select has_table('public', 'alert_deliveries', 'alert deliveries table exists');
select has_table('public', 'viewer_tokens', 'viewer tokens table exists');

select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles has row-level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.trusted_contacts'::regclass),
  true,
  'trusted contacts has row-level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.alert_events'::regclass),
  true,
  'alert events has row-level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.location_samples'::regclass),
  true,
  'location samples has row-level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.alert_deliveries'::regclass),
  true,
  'alert deliveries has row-level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.viewer_tokens'::regclass),
  true,
  'viewer tokens has row-level security enabled'
);

select table_privs_are(
  'public',
  'trusted_contacts',
  'anon',
  array[]::text[],
  'anonymous users have no direct trusted-contact privileges'
);
select table_privs_are(
  'public',
  'alert_events',
  'anon',
  array[]::text[],
  'anonymous users have no direct alert-event privileges'
);
select table_privs_are(
  'public',
  'location_samples',
  'anon',
  array[]::text[],
  'anonymous users have no direct location privileges'
);
select table_privs_are(
  'public',
  'alert_deliveries',
  'anon',
  array[]::text[],
  'anonymous users have no direct delivery-diagnostic privileges'
);
select table_privs_are(
  'public',
  'viewer_tokens',
  'anon',
  array[]::text[],
  'anonymous users have no direct viewer-token privileges'
);

select * from finish();

rollback;
