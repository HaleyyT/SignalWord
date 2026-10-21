import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareBetaWeb } from '../scripts/prepare-beta-web.mjs';

const options = { projectRef: 'abcdefghijklmnopqrst', origin: 'https://signalword-beta.vercel.app', siteKey: 'BETA_WIDGET_TEST_ONLY' };
test('beta package excludes private files and production connections', () => {
  const directory = mkdtempSync(join(tmpdir(), 'signalword-beta-package-'));
  const output = join(directory, 'upload');
  try {
    const manifest = prepareBetaWeb({ ...options, output });
    assert.ok(manifest.files.length > 30);
    assert.equal(manifest.enrollmentEnabled, false);
    assert.equal(existsSync(join(output, '.git')), false);
    for (const { path } of manifest.files) {
      assert.doesNotMatch(path, /(?:^|\/)(?:docs|draft|\.env[^/]*|\.git|e2e)(?:\/|$)|acceptance\.|invited-session\.|\.test\./);
      assert.equal(readFileSync(join(output, path)).includes(Buffer.from('voepalyamwgenceawdvl')), false);
    }
    const config = readFileSync(join(output, 'apps/viewer/api/auth/config.mjs'), 'utf8');
    assert.ok(config.includes(options.projectRef));
    assert.ok(config.includes(options.siteKey));
    assert.ok(readFileSync(join(output, 'apps/viewer/public/auth/recovery-client.js'), 'utf8').includes(options.origin));
    assert.equal(existsSync(output + '.manifest.json'), true);
    assert.throws(() => prepareBetaWeb({ ...options, output }), /new directory/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('beta package refuses production backend, website or widget configuration', () => {
  const output = join(tmpdir(), 'unused-beta-package');
  assert.throws(() => prepareBetaWeb({ ...options, output, projectRef: 'voepalyamwgenceawdvl' }), /separate beta/);
  assert.throws(() => prepareBetaWeb({ ...options, output, origin: 'https://www.signalword.app' }), /isolated beta/);
  assert.throws(() => prepareBetaWeb({ ...options, output, siteKey: '0x4AAAAAAFFb3ETKlwBxFCNF' }), /dedicated beta/);
});
