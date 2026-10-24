import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateBetaTarget } from '../scripts/beta-target.mjs';
import { prepareBetaEnvironment } from '../scripts/prepare-beta-environment.mjs';
import { proxyEnrollment } from '../apps/viewer/api/enrollment/[token].mjs';

const target = { environment: 'beta', status: 'configured', projectRef: 'abcdefghijklmnopqrst',
  viewerOrigin: 'https://signalword-beta.vercel.app', turnstileSiteKey: 'BETA_WIDGET_TEST_ONLY',
  vercelProjectId: 'prj_PgsRJyPYMJmpMUULlAS5jnMrAmv2', authorityName: 'signalword-beta-safety-authority',
  journalBucket: 'signalword-beta-deletion-journal', monitorName: 'signalword-beta-monitor' };
const envFile = path => Object.fromEntries(readFileSync(path, 'utf8').trim().split('\n').map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));

test('unprovisioned and mixed production targets cannot create a beta package', () => {
  const directory = mkdtempSync(join(tmpdir(), 'signalword-beta-guard-'));
  try {
    const output = join(directory, 'package');
    const pending = { ...target, status: 'unprovisioned', projectRef: null };
    assert.throws(() => prepareBetaEnvironment({ target: pending, output }), /BETA_TARGET_NOT_CONFIGURED/);
    for (const overrides of [
      { projectRef: 'voepalyamwgenceawdvl' }, { viewerOrigin: 'https://www.signalword.app' },
      { viewerOrigin: 'http://localhost:5173' }, { viewerOrigin: target.viewerOrigin + '/path' },
      { viewerOrigin: 'https://user:password@signalword-beta.vercel.app' },
      { journalBucket: 'signalword-dev-deletion-journal' }, { authorityName: 'signalword-dev-safety-authority' },
      { monitorName: 'signalword-dev-monitor' }, { vercelProjectId: 'production-project' },
      { turnstileSiteKey: '0x4AAAAAAFFb3ETKlwBxFCNF' },
    ]) assert.throws(() => prepareBetaEnvironment({ target: { ...target, ...overrides }, output }));
    for (const publicKey of ['sb_secret_DO_NOT_PRINT', 'placeholder', '$(KEY)']) {
      assert.throws(() => prepareBetaEnvironment({ target, output, publicKey }), /BETA_PUBLIC_KEY_INVALID/);
    }
    assert.equal(existsSync(output), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('packages use independent keys, separate resources and disabled delivery/enrollment/schedules', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'signalword-beta-environment-'));
  try {
    const output = join(directory, 'first'), second = join(directory, 'second');
    const manifest = prepareBetaEnvironment({ target, output });
    prepareBetaEnvironment({ target, output: second });
    const backend = envFile(join(output, 'private/.env.backend'));
    const authority = envFile(join(output, 'private/.env.authority'));
    const vault = envFile(join(output, 'private/.env.vault'));
    const viewer = envFile(join(output, 'private/.env.viewer'));
    assert.equal(backend.APP_ENV, 'production'); // Beta is a target label, not a supported runtime mode.
    assert.equal(backend.DELIVERY_PROVIDER, 'none');
    assert.equal(backend.CONTACT_ENROLLMENT_ENABLED, 'false');
    assert.equal(viewer.CONTACT_ENROLLMENT_ENABLED, 'false');
    assert.equal(viewer.SIGNALWORD_ENROLLMENT_ORIGIN, `https://${target.projectRef}.supabase.co/functions/v1/contact-invitation-preview`);
    assert.equal(backend.SAFETY_CONTROL_WRITER, authority.WRITER_SECRET);
    assert.equal(vault.signalword_control_reader, authority.READER_SECRET);
    assert.equal(vault.signalword_dispatch_secret, backend.DISPATCH_SECRET);
    const sensitive = [authority.READER_SECRET, authority.WRITER_SECRET, authority.ADMIN_SECRET,
      backend.DISPATCH_SECRET, backend.MONITOR_SECRET, backend.DELIVERY_PAYLOAD_KEY,
      backend.DESTINATION_ENCRYPTION_KEY, backend.DESTINATION_FINGERPRINT_KEY];
    assert.equal(new Set(sensitive).size, sensitive.length);
    for (const value of sensitive) assert.equal(Buffer.from(value, 'base64url').length, 32);
    assert.notEqual(envFile(join(second, 'private/.env.backend')).DISPATCH_SECRET, backend.DISPATCH_SECRET);
    assert.equal(statSync(join(output, 'private/.env.backend')).mode & 0o777, 0o600);
    assert.equal(statSync(join(output, 'private')).mode & 0o777, 0o700);
    for (const name of ['authority', 'backend', 'vault', 'monitor', 'viewer']) {
      const ignored = spawnSync('git', ['check-ignore', '--no-index', `beta-package/private/.env.${name}`], { encoding: 'utf8' });
      assert.equal(ignored.status, 0);
    }
    assert.equal(existsSync(join(output, 'private/SignalWord-Beta.xcconfig.local')), false);
    const control = JSON.parse(readFileSync(join(output, 'authority/wrangler.jsonc'), 'utf8'));
    const monitor = JSON.parse(readFileSync(join(output, 'monitor/wrangler.jsonc'), 'utf8'));
    assert.equal(control.name, target.authorityName);
    assert.equal(control.r2_buckets[0].bucket_name, target.journalBucket);
    assert.equal(control.workers_dev, false);
    assert.deepEqual(monitor.triggers.crons, []);
    assert.equal(monitor.name, target.monitorName);
    // Import the generated artifact: source-string checks missed its broken relative path.
    const packagedMonitor = await import(pathToFileURL(join(output, 'monitor/worker.mjs')).href);
    assert.equal(typeof packagedMonitor.Monitor, 'function');
    assert.equal((await packagedMonitor.default.fetch()).status, 404);
    assert.equal(backend.SIGNALWORD_DEPLOYMENT_TARGET, 'beta');
    assert.equal(backend.RESEND_EXPECTED_SENDER, 'beta-alerts@mail.signalword.app');
    for (const { path } of manifest.files) {
      assert.doesNotMatch(path, /(?:^|\/)(?:docs|draft|\.git|\.env[^/]*|\.temp)(?:\/|$)/);
      const contents = readFileSync(join(output, path), 'utf8');
      assert.doesNotMatch(contents, /voepalyamwgenceawdvl|signalword-dev|https:\/\/www.signalword.app/);
      for (const value of sensitive) assert.ok(!contents.includes(value));
    }
    const summary = readFileSync(join(output, 'package-manifest.json'), 'utf8');
    for (const value of sensitive) assert.ok(!summary.includes(value));
    assert.equal(manifest.deployed, false);
    assert.ok(manifest.pending.includes('HOSTED_ACCEPTANCE'));
    const supabaseConfig = readFileSync(join(output, 'backend/supabase/config.toml'), 'utf8');
    assert.ok(supabaseConfig.includes(`site_url = "${target.viewerOrigin}"`));
    assert.match(supabaseConfig, /\[db\.seed\][\s\S]*?enabled = false/);
    assert.equal(existsSync(join(output, 'backend/supabase/.temp/project-ref')), false);
    assert.throws(() => prepareBetaEnvironment({ target, output }), /BETA_OUTPUT_ALREADY_EXISTS/);
    // Even a fully formed beta proxy stays closed until deliberate activation.
    const result = await proxyEnrollment({ token: 'config', method: 'GET', enabled: false,
      publicOrigin: target.viewerOrigin, upstreamOrigin: viewer.SIGNALWORD_ENROLLMENT_ORIGIN,
      fetchImpl: () => { throw Error('NETWORK_MUST_NOT_RUN'); } });
    assert.equal(result.status, 503);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('generated native beta settings validate their bundled target and reject crossover', () => {
  const directory = mkdtempSync(join(tmpdir(), 'signalword-beta-native-'));
  try {
    const output = join(directory, 'package');
    const publicKey = 'sb_publishable_' + 'a'.repeat(24);
    prepareBetaEnvironment({ target, output, publicKey });
    const settings = Object.fromEntries(readFileSync(join(output, 'private/SignalWord-Beta.xcconfig.local'), 'utf8').trim().split('\n')
      .map(line => { const [key, value] = line.split(' = '); return [key, value.replaceAll('$()', '')]; }));
    // Copy the real validator into a disposable tree; its target remains a repository file, never an env override.
    const script = join(directory, 'apps/ios/Config/validate-build-environment.py');
    mkdirSync(join(directory, 'apps/ios/Config'), { recursive: true });
    mkdirSync(join(directory, 'config'));
    copyFileSync('apps/ios/Config/validate-build-environment.py', script);
    const targetPath = join(directory, 'config/beta-target.json');
    writeFileSync(targetPath, JSON.stringify(target));
    const run = (overrides = {}, args = []) => spawnSync('/usr/bin/python3', [script, ...args], {
      encoding: 'utf8', env: { PATH: process.env.PATH, ...settings, ...overrides } });
    assert.equal(run().status, 0);
    for (const overrides of [
      { SIGNALWORD_SUPABASE_URL: 'https://voepalyamwgenceawdvl.supabase.co' },
      { SIGNALWORD_USER_API_URL: 'https://voepalyamwgenceawdvl.supabase.co/functions/v1/user-api' },
      { SIGNALWORD_BUILD_ENVIRONMENT: 'production' }, { SIGNALWORD_BUILD_ENVIRONMENT: 'typo' },
      { SIGNALWORD_VERIFICATION_URL: 'https://www.signalword.app/onboarding/verify.html' },
      { SIGNALWORD_TURNSTILE_SITE_KEY: '0x4AAAAAAFFb3ETKlwBxFCNF' },
    ]) { const result = run(overrides); assert.equal(result.status, 1); assert.ok(!result.stderr.includes(publicKey)); }
    const jwt = (role, ref) => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role, ref })).toString('base64url') + '.signature';
    assert.equal(run({ SIGNALWORD_SUPABASE_PUBLISHABLE_KEY: jwt('anon', target.projectRef) }).status, 0);
    assert.equal(run({ SIGNALWORD_SUPABASE_PUBLISHABLE_KEY: jwt('anon', 'voepalyamwgenceawdvl') }).status, 1);
    assert.equal(run({ SIGNALWORD_SUPABASE_PUBLISHABLE_KEY: jwt('service_role', target.projectRef) }).status, 1);
    const plist = join(directory, 'Info.plist');
    const fields = { SignalWordSupabaseURL: settings.SIGNALWORD_SUPABASE_URL, SignalWordUserAPIURL: settings.SIGNALWORD_USER_API_URL,
      SignalWordSupabasePublishableKey: publicKey, SignalWordVerificationURL: settings.SIGNALWORD_VERIFICATION_URL,
      SignalWordTurnstileSiteKey: settings.SIGNALWORD_TURNSTILE_SITE_KEY };
    writeFileSync(plist, '<plist version="1.0"><dict>' + Object.entries(fields).map(([key, value]) => `<key>${key}</key><string>${value}</string>`).join('') + '</dict></plist>');
    assert.equal(run({}, ['--plist', plist]).status, 0);
    assert.equal(run({ SIGNALWORD_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'b'.repeat(24) }, ['--plist', plist]).status, 1);
    writeFileSync(targetPath, JSON.stringify({ ...target, status: 'unprovisioned' }));
    assert.equal(run().status, 1);
    assert.equal(validateBetaTarget(target).projectRef, target.projectRef);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
