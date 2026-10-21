import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, lstatSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const productionRef = 'voepalyamwgenceawdvl';
const productionOrigin = 'https://www.signalword.app';
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Make a clean, Git-independent upload. Never copy ignored files or credentials. */
export function prepareBetaWeb({ output, projectRef, origin, siteKey }) {
  if (!/^[a-z]{20}$/.test(projectRef ?? '') || projectRef === productionRef) {
    throw Error('Supply a verified, separate beta Supabase project reference.');
  }
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password
    || url.hostname === 'signalword.app' || url.hostname.endsWith('.signalword.app')) {
    throw Error('Use the isolated beta deployment HTTPS origin; production domains are not accepted.');
  }
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(siteKey ?? '') || siteKey === '0x4AAAAAAFFb3ETKlwBxFCNF') {
    throw Error('Supply a dedicated beta Turnstile public site key.');
  }
  const target = resolve(output);
  if (existsSync(target)) throw Error('Output must be a new directory.');
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: sourceRoot, encoding: 'utf8' }).split('\0').filter(Boolean)
    .filter(path => ['package.json', 'package-lock.json', '.vercelignore'].includes(path)
      || /^apps\/viewer\/(?:src\/|public\/|api\/|(?:index|enrollment)\.html$|package\.json$|tsconfig[^/]*\.json$|vite\.config\.ts$)/.test(path))
    .filter(path => !/(?:^|\/)(?:\.env[^/]*|node_modules|dist|e2e)(?:\/|$)|\.test\.[^/]+$/.test(path))
    // Developer acceptance fixtures must never become beta account entry points.
    .filter(path => !/^apps\/viewer\/public\/onboarding\/(?:acceptance\.|invited-session\.)/.test(path));
  const replacements = new Set(['apps/viewer/api/auth/config.mjs', 'apps/viewer/public/auth/recovery-client.js', 'apps/viewer/vercel.json']);
  const contents = files.map(path => {
    const source = join(sourceRoot, path);
    if (!lstatSync(source).isFile()) throw Error('Upload sources must be regular files.');
    let data = readFileSync(source);
    if (replacements.has(path)) {
      data = Buffer.from(data.toString().replaceAll(productionRef, projectRef)
        .replaceAll(productionOrigin, origin).replaceAll('0x4AAAAAAFFb3ETKlwBxFCNF', siteKey));
    }
    if (data.includes(Buffer.from(productionRef)) || data.includes(Buffer.from(productionOrigin))) {
      throw Error('Production connection remains in beta upload: ' + path);
    }
    return [path, data];
  });
  mkdirSync(target, { recursive: true, mode: 0o700 });
  for (const [path, data] of contents) {
    const destination = join(target, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, data);
  }
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
  const manifest = { sourceCommit, projectRef, origin, enrollmentEnabled: false,
    files: contents.map(([path, data]) => ({ path, sha256: createHash('sha256').update(data).digest('hex') })) };
  // Keep the audit manifest beside the upload, not in its public directory.
  writeFileSync(target + '.manifest.json', JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const manifest = prepareBetaWeb({ output: process.argv[2], projectRef: process.env.BETA_SUPABASE_REF,
      origin: process.env.BETA_VIEWER_ORIGIN, siteKey: process.env.BETA_TURNSTILE_SITE_KEY });
    console.log(`Prepared ${manifest.files.length} beta upload files; enrollment remains disabled.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
