// Fails when docs or user facing source files contain em dashes (U+2014) or en dashes (U+2013).
// Project writing style: use commas, colons, periods or restructure the sentence instead.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP = new Set([
  'node_modules',
  'dist',
  '.next',
  'build',
  '.react-router',
  'coverage',
  'public',
  'playwright-report',
  'test-results',
  '.git',
  '.cache',
]);
const EXTENSIONS = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
  '.html',
  '.yml',
  '.yaml',
]);
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const problems = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name === 'pnpm-lock.yaml') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (EXTENSIONS.has(extname(name))) {
      readFileSync(full, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (DASHES.test(line))
            problems.push(`${relative(root, full)}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
  }
}
walk(root);
if (problems.length > 0) {
  console.error(
    `Found ${problems.length} em/en dash(es). Rewrite with commas, colons or periods:\n`,
  );
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-no-dashes: no em or en dashes found.');
