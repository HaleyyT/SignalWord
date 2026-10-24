import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateBetaTarget, validateBetaPublicKey } from './beta-target.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secret = () => randomBytes(32).toString('base64url');

/** Preparation only: no network, CLI link, migration, schedule or deployment. */
export function prepareBetaEnvironment({ target, output, publicKey }) {
  const config = validateBetaTarget(target);
  if (publicKey) validateBetaPublicKey(publicKey, config.projectRef);
  const destination = resolve(output);
  if (existsSync(destination)) throw Error('BETA_OUTPUT_ALREADY_EXISTS');
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0')
    .filter(path => /^supabase\/(?:functions\/|migrations\/|config\.toml$)/.test(path)
      || /^infrastructure\/(?:control|monitor)\/(?:worker\.mjs|service\.mjs|wrangler\.jsonc)$/.test(path));
  const prepared = files.map(path => {
    const source = join(root, path);
    if (!lstatSync(source).isFile()) throw Error('BETA_SOURCE_NOT_REGULAR_FILE');
    let content = readFileSync(source, 'utf8');
    let uploadPath = path.startsWith('supabase/') ? 'backend/' + path : path.replace('infrastructure/control/', 'authority/').replace('infrastructure/monitor/', 'monitor/');
    if (path === 'supabase/config.toml') {
      content = content.replace(/^project_id = .+$/m, 'project_id = "signalword-beta"')
        .replace(/^site_url = .+$/m, `site_url = "${config.viewerOrigin}"`)
        .replace(/^additional_redirect_urls = .+$/m, `additional_redirect_urls = ["${config.viewerOrigin}/auth/recovery"]`)
        .replace(/(\[db\.seed\][\s\S]*?\nenabled = )true/, '$1false');
    }
    if (path.endsWith('wrangler.jsonc')) {
      const worker = JSON.parse(content);
      worker.name = path.includes('/control/') ? config.authorityName : config.monitorName;
      worker.workers_dev = false;
      if (worker.r2_buckets) worker.r2_buckets[0].bucket_name = config.journalBucket;
      if (worker.triggers) worker.triggers.crons = []; // Activation requires real hosted acceptance.
      if (path.includes('/monitor/')) worker.vars = { BACKEND_ORIGIN: config.backendOrigin };
      content = JSON.stringify(worker, null, 2) + '\n';
    } else if (path.startsWith('infrastructure/')) {
      content = content.replaceAll('signalword-dev', 'signalword-beta');
      if (path === 'infrastructure/monitor/worker.mjs') {
        content = content.replace('../../supabase/functions/', '../backend/supabase/functions/');
      }
    }
    if (content.includes('voepalyamwgenceawdvl') || content.includes('https://www.signalword.app') || content.includes('signalword-dev')) {
      throw Error('BETA_SOURCE_HAS_PRODUCTION_CONNECTION');
    }
    return [uploadPath, content];
  });
  // All validation precedes file creation. Every secret is new and local to this package.
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  const write = (path, text) => {
    const file = join(destination, path);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, text, { mode: 0o600, flag: 'wx' });
  };
  for (const [path, content] of prepared) write(path, content);
  const reader = secret(), writer = secret(), admin = secret(), dispatch = secret(), monitor = secret();
  const env = entries => Object.entries(entries).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  write('private/.env.authority', env({ READER_SECRET: reader, WRITER_SECRET: writer, ADMIN_SECRET: admin }));
  write('private/.env.backend', env({ APP_ENV: 'production', SIGNALWORD_DEPLOYMENT_TARGET: 'beta',
    RESEND_EXPECTED_SENDER: 'beta-alerts@mail.signalword.app', DELIVERY_PROVIDER: 'none',
    CONTACT_ENROLLMENT_ENABLED: 'false', LEGACY_CONTACT_WRITES_DISABLED: 'false',
    CONTACT_INVITATION_ORIGIN: config.viewerOrigin, PUBLIC_VIEWER_BASE_URL: config.viewerOrigin,
    PUBLIC_CONFIRMATION_BASE_URL: config.viewerOrigin, DISPATCH_SECRET: dispatch, MONITOR_SECRET: monitor,
    DELIVERY_PAYLOAD_KEY: secret(), DELIVERY_PAYLOAD_KEY_VERSION: '1',
    DESTINATION_ENCRYPTION_KEY: secret(), DESTINATION_FINGERPRINT_KEY: secret(), DESTINATION_KEY_VERSION: '1',
    SAFETY_CONTROL_WRITER: writer }));
  write('private/.env.vault', env({ signalword_backend_url: config.backendOrigin,
    signalword_dispatch_secret: dispatch, signalword_control_reader: reader }));
  write('private/.env.monitor', env({ MONITOR_SECRET: monitor }));
  write('private/.env.viewer', env({ APP_ENV: 'production', CONTACT_ENROLLMENT_ENABLED: 'false',
    CONTACT_INVITATION_ORIGIN: config.viewerOrigin, CONTACT_TURNSTILE_SITE_KEY: config.turnstileSiteKey,
    SIGNALWORD_ENROLLMENT_ORIGIN: config.backendOrigin + '/functions/v1/contact-invitation-preview',
    SIGNALWORD_PUBLIC_EVENT_ORIGIN: config.backendOrigin + '/functions/v1/public-event',
    SIGNALWORD_CONTACT_CONFIRM_ORIGIN: config.backendOrigin + '/functions/v1/contact-confirm',
    ...(publicKey ? { SIGNALWORD_SUPABASE_PUBLIC_KEY: publicKey } : {}) }));
  if (publicKey) {
    const values = { SIGNALWORD_BUILD_ENVIRONMENT: 'beta', SIGNALWORD_SUPABASE_URL: config.backendOrigin,
      SIGNALWORD_USER_API_URL: config.backendOrigin + '/functions/v1/user-api', SIGNALWORD_SUPABASE_PUBLISHABLE_KEY: publicKey,
      SIGNALWORD_VERIFICATION_URL: config.viewerOrigin + '/onboarding/verify.html', SIGNALWORD_TURNSTILE_SITE_KEY: config.turnstileSiteKey };
    write('private/SignalWord-Beta.xcconfig.local', Object.entries(values).map(([key, value]) => `${key} = ${value.replaceAll('//', '/$()/')}`).join('\n') + '\n');
  }
  const manifest = { environment: 'beta', projectRef: config.projectRef, viewerOrigin: config.viewerOrigin,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    deployed: false, enrollmentEnabled: false, deliveryEnabled: false, monitorScheduleEnabled: false,
    pending: ['HOSTED_TARGET_IDENTITY_AND_CAPACITY', 'CAPTCHA_SECRET', 'EMAIL_PROVIDER_AND_VERIFIED_SENDER',
      'SAFETY_AUTHORITY_URL_AND_DURABILITY', 'MONITOR_HEARTBEATS', 'AUTH_CONFIGURATION', 'DATABASE_VAULT_AND_CRON',
      'HOSTED_ACCEPTANCE', ...(publicKey ? ['PUBLIC_KEY_PROJECT_MEMBERSHIP'] : ['NATIVE_PUBLIC_KEY'])],
    files: prepared.map(([path, text]) => ({ path, sha256: createHash('sha256').update(text).digest('hex') })) };
  write('package-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = JSON.parse(readFileSync(join(root, 'config/beta-target.json'), 'utf8'));
    const result = prepareBetaEnvironment({ target, output: process.argv[2], publicKey: process.env.BETA_SUPABASE_PUBLIC_KEY });
    console.log(`Prepared ${result.files.length} source files. No resources deployed; delivery and enrollment disabled.`);
  } catch { console.error('Beta preparation refused: verify the checked-in target, public key and new output directory.'); process.exitCode = 1; }
}
