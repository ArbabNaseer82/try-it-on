// Sets the same version on every published @tryonit package.
// Usage: node scripts/set-version.mjs 0.2.0
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './examples.mjs';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>');
  process.exit(1);
}
for (const name of ['core', 'web', 'react', 'react-native']) {
  const file = join(root, 'packages', name, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const previous = pkg.version;
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`@tryonit/${name}: ${previous} -> ${version}`);
}
console.log(
  '\nNext: add a CHANGELOG.md entry, commit, then run `pnpm release:check` and `pnpm release:publish`.',
);
