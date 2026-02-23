/**
 * Pre-deploy authority assertion.
 * Prevents Admin Core from being deployed from the wrong repository.
 *
 * Checks:
 * 1. package.json name === "admin-core"
 * 2. .firebaserc maps target "admin" to "admin-core-20292"
 * 3. firebase.json hosting target is "admin" with public "dist"
 *
 * If any check fails, the deploy is blocked with a clear error.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const fail = (msg) => {
  console.error(`\x1b[31mDEPLOY BLOCKED: ${msg}\x1b[0m`);
  process.exit(1);
};

// 1. Verify repo identity
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
if (pkg.name !== 'admin-core') {
  fail(`Wrong repository. Expected package name "admin-core", got "${pkg.name}". Admin Core must deploy from the Admin-Core repo only.`);
}

// 2. Verify .firebaserc targets the correct site
const firebaserc = JSON.parse(readFileSync(resolve(root, '.firebaserc'), 'utf-8'));
const adminTargets = firebaserc?.targets?.['exam-coach-ai-platform']?.hosting?.admin;
if (!adminTargets || !adminTargets.includes('admin-core-20292')) {
  fail(`.firebaserc does not map target "admin" to "admin-core-20292". Hosting target misconfigured.`);
}

// 3. Verify firebase.json hosting block
const firebaseJson = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf-8'));
const hosting = firebaseJson.hosting;
const hostingBlock = Array.isArray(hosting) ? hosting.find(h => h.target === 'admin') : (hosting?.target === 'admin' ? hosting : null);

if (!hostingBlock) {
  fail(`firebase.json has no hosting block with target "admin".`);
}
if (hostingBlock.public !== 'dist') {
  fail(`firebase.json hosting public directory is "${hostingBlock.public}", expected "dist".`);
}

console.log(`\x1b[32m✓ Deploy authority verified: admin-core → admin-core-20292\x1b[0m`);
