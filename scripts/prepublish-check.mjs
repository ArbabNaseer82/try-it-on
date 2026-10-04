// Runs in `prepublishOnly` inside packages/<name>. Stops a broken publish before it happens.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.cwd();
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const problems = [];

// npm and yarn would publish "workspace:^" dependency ranges verbatim, which breaks installs.
// pnpm rewrites them to real versions in the tarball.
const agent = process.env.npm_config_user_agent ?? '';
if (!agent.startsWith('pnpm/')) {
  problems.push(
    'Publish with pnpm (`pnpm publish`), not npm or yarn: workspace dependencies are only rewritten by pnpm.',
  );
}
if (!/^\d+\.\d+\.\d+/.test(pkg.version) || pkg.version === '0.0.0')
  problems.push(`Invalid version "${pkg.version}".`);
if (pkg.private) problems.push('package.json has "private": true.');
for (const file of ['README.md', 'LICENSE'])
  if (!existsSync(join(dir, file))) problems.push(`Missing ${file}.`);

const targets = new Set();
const collect = (value) => {
  if (typeof value === 'string') targets.add(value);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
};
collect(pkg.exports);
collect(pkg.bin);
for (const field of ['main', 'module', 'types']) if (pkg[field]) targets.add(pkg[field]);
for (const target of targets) {
  if (target.endsWith('package.json')) continue;
  if (!existsSync(join(dir, target)))
    problems.push(`"${target}" is referenced in package.json but missing. Run the build.`);
}

if (problems.length) {
  console.error(
    `\n${pkg.name}: not ready to publish\n${problems.map((p) => `  - ${p}`).join('\n')}\n`,
  );
  process.exit(1);
}
console.log(`${pkg.name}@${pkg.version}: ready to publish (${targets.size} entry files checked).`);
