/**
 * Pre-build version consistency check.
 * Fails the build if package.json version !== ADMIN_CORE_VERSION in src/config.ts.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const configSrc = readFileSync(resolve(root, 'src/config.ts'), 'utf-8');

const match = configSrc.match(/ADMIN_CORE_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!match) {
  console.error('\x1b[31mBUILD FAILED: ADMIN_CORE_VERSION not found in src/config.ts\x1b[0m');
  process.exit(1);
}

const configVersion = match[1];
const pkgVersion = pkg.version;

if (pkgVersion !== configVersion) {
  console.error(`\x1b[31mBUILD FAILED: Version mismatch\x1b[0m`);
  console.error(`  package.json:  ${pkgVersion}`);
  console.error(`  src/config.ts: ${configVersion}`);
  console.error(`\nUpdate both files to the same version before building.`);
  process.exit(1);
}

console.log(`\x1b[32m✓ Version consistent: ${pkgVersion}\x1b[0m`);
