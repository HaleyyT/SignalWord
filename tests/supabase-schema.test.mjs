import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260921000000_initial_alerts.sql', 'utf8');

test('schema protects each private table with row-level security', () => {
  for (const table of ['profiles', 'trusted_contacts', 'alert_events', 'location_samples', 'alert_deliveries', 'viewer_tokens']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
});

test('schema guarantees one canonical alert for an idempotency key', () => {
  assert.match(migration, /constraint alert_events_user_idempotency_key unique \(user_id, idempotency_key\)/i);
  assert.match(migration, /token_hash bytea not null unique/i);
});

test('schema blocks anonymous direct access to sensitive data', () => {
  for (const table of ['viewer_tokens', 'trusted_contacts', 'alert_events', 'location_samples', 'alert_deliveries']) {
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`, 'i'));
  }
  assert.doesNotMatch(migration, /grant all .* to anon/i);
});

test('schema has bounded retention for locations, tokens, and delivery diagnostics', () => {
  assert.match(migration, /delete from public\.location_samples where expires_at <= now\(\)/i);
  assert.match(migration, /delete from public\.viewer_tokens where expires_at <= now\(\) or revoked_at is not null/i);
  assert.match(migration, /interval '7 days'/i);
});
