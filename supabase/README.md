# Supabase backend

Use the Supabase CLI only after a project is linked locally. Keep schema changes in numbered migrations and test Row Level Security in `tests/`.

Edge Function names follow the API contract:

- `create-alert`
- `add-location`
- `resolve-alert`
- `public-event`
- `contact-verification`

Privileged server and delivery-provider secrets are configured with `supabase secrets set`; they must not appear in a repository file, iOS configuration, or web bundle.
