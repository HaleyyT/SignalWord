# Supabase backend

Use the Supabase CLI only after a project is linked locally. Keep schema changes in numbered migrations and test Row Level Security in `tests/`.

The initial migration establishes the V1 alert tables plus private confirmation-token and rate-limit storage. It enforces default-deny public access, owner-scoped Row Level Security, contact/event ownership, 256-bit token hashes, delivery idempotency and retry state, and bounded retention.

Retention runs hourly inside PostgreSQL through `pg_cron`; it calls the locked-down `purge_expired_alert_data()` function directly and therefore requires no URL or stored bearer secret. Apply migrations only to the development/test project first, then run `npm run test:db`. The pgTAP suite exercises authenticated user A/user B isolation, anonymous denial, ownership constraints, nullable provider IDs, lifecycle checks, retention, and cascade deletion.

Edge Function names follow the API contract:

- `create-alert`
- `add-location`
- `resolve-alert`
- `public-event`
- `contact-verification`

Privileged server and delivery-provider secrets are configured with `supabase secrets set`; they must not appear in a repository file, iOS configuration, or web bundle.
