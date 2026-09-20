# Supabase backend

Use the Supabase CLI only after a project is linked locally. Keep schema changes in numbered migrations and test Row Level Security in `tests/`.

The initial migration establishes the six V1 tables, default-deny public access, owner-scoped Row Level Security, hashed viewer-token storage, idempotency, and bounded retention. Apply it only to the development/test project first, then run cross-user policy tests before production.

Edge Function names follow the API contract:

- `create-alert`
- `add-location`
- `resolve-alert`
- `public-event`
- `contact-verification`

Privileged server and delivery-provider secrets are configured with `supabase secrets set`; they must not appear in a repository file, iOS configuration, or web bundle.
