// Downloads the official MediaPipe models and copies the MediaPipe wasm files into every
// example's public folder, so examples prove that self hosting works (`modelBaseUrl: '/models'`).
// Usage: node scripts/fetch-models.mjs [--force]
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { EXAMPLES, publicDir, root } from './examples.mjs';

const force = process.argv.includes('--force');
const cache = join(root, '.cache', 'models');

// Single source of truth: the built @tryonit/web config.
let config;
try {
  config = await import(join(root, 'packages/web/dist/index.js'));
} catch {
  console.error('Build the packages first: pnpm build');
  process.exit(1);
}
const { DEFAULT_MODEL_URLS, MODEL_FILES, MEDIAPIPE_VERSION } = config;

mkdirSync(cache, { recursive: true });
for (const [kind, url] of Object.entries(DEFAULT_MODEL_URLS)) {
  const file = join(cache, MODEL_FILES[kind]);
  if (existsSync(file) && !force) {
    console.log(`cached  ${MODEL_FILES[kind]}`);
    continue;
  }
  process.stdout.write(`fetch   ${url} ... `);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTP ${response.status}`);
    process.exit(1);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(file, bytes);
  console.log(`${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
}

const require = createRequire(join(root, 'packages/web/package.json'));
const visionDir = dirname(require.resolve('@mediapipe/tasks-vision'));
const pkg = JSON.parse(readFileSync(join(visionDir, 'package.json'), 'utf8'));
if (pkg.version !== MEDIAPIPE_VERSION) {
  console.warn(
    `Warning: installed @mediapipe/tasks-vision ${pkg.version} differs from MEDIAPIPE_VERSION ${MEDIAPIPE_VERSION}.`,
  );
}

for (const example of EXAMPLES) {
  const target = publicDir(example);
  if (!existsSync(dirname(target))) continue;
  cpSync(cache, join(target, 'models'), { recursive: true });
  cpSync(join(visionDir, 'wasm'), join(target, 'wasm'), { recursive: true });
  console.log(`copied  models + wasm -> examples/${example}/public`);
}
