# Shared API contract fixtures

These fixtures are the machine-checked examples for the frozen Day-2 API contract. They are deliberately fictional and contain no credentials, recipient destination, viewer token, or precise real-world location.

When an intentional P0/P1 contract change is necessary, update the relevant fixture, its matching client/server implementation, tests, and `docs/API_CONTRACTS.md` in the same pull request. Do not create silent optional fields to avoid documenting a breaking change.

## Current lifecycle contracts

The lifecycle additions supersede the original Day-2-only fixture scope. Run
`npm run check` to validate all authenticated response examples. The live user API
calls `parseUserResponse` before returning success; it checks required fields,
allowed states, UUIDs, and timestamps and removes unspecified fields. Public-event
responses have a separate privacy projection validator.

| Endpoint | Request validation | Success response contract |
|---|---|---|
| GET /v1/profile | Authenticated identity | profile |
| PUT /v1/profile | Nonempty trimmed displayName, maximum 80 characters | profile |
| POST /v1/alerts | parseCreateAlert + UUID idempotency header | createAlert |
| GET /v1/alerts/recovery | Optional UUID command key | recovery array |
| GET /v1/alerts/:id | UUID event ID + ownership | alertStatus |
| POST /v1/alerts/:id/locations | UUID + validated location | appendLocation |
| POST /v1/alerts/:id/resolve | UUID + ownership | resolveAlert |
| POST /v1/contacts | Bounded name and email; unknown fields rejected | contact |
| GET /v1/contact | Authenticated identity | contact, or unavailable error |
| DELETE /v1/contacts/:id | UUID + ownership | disableContact |
| DELETE /v1/data | 43-character deletion receipt capability | deleteData |
| GET /v1/deletions/status | Deletion receipt header | deleted boolean |
| GET /v1/public/events/:token | 43-character scoped capability | public-event privacy projection |
| POST /v1/public/events/:token | Capability + explicit acknowledge header | acknowledged boolean |
| POST /v1/contacts/confirm/:token | Capability + optional withdraw action | confirmed or withdrawn boolean |

The Swift package now contains the same lifecycle wire models used by the live
client. XCTest decodes profile, contact, status, recovery, and resolution fixtures;
viewer tests decode the public-event fixture. Missing/invalid response fields are
also exercised in Node tests. There is not yet a generated, exhaustive OpenAPI or
JSON Schema specification for all request, error, webhook, and response variants.
