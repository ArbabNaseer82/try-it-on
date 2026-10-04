#!/usr/bin/env node
// Validates TryOnIt asset manifests and the local files they reference.
// Usage: npx -p @tryonit/core tryonit-validate <manifest.json | folder> [...more]
import {
  existsSync,
  openSync,
  readFileSync,
  readSync,
  closeSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { formatIssues, safeValidateManifest } from '../dist/index.js';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`tryonit-validate: check TryOnIt asset manifests before you ship them.

Usage:
  npx -p @tryonit/core tryonit-validate products/aviator.json
  npx -p @tryonit/core tryonit-validate public/assets            (every .json with a "type" field)

Checks the manifest schema (types, colors, ranges, variants) and, for relative paths,
that model (.glb/.gltf) and image (.png/.jpg/.webp/.svg) files exist and look valid.`);
  process.exit(args.length === 0 ? 1 : 0);
}

const files = [];
const walk = (path) => {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) if (name !== 'node_modules') walk(join(path, name));
  } else if (extname(path) === '.json') files.push(path);
};
for (const arg of args) {
  const path = resolve(arg);
  if (!existsSync(path)) {
    console.error(`Not found: ${arg}`);
    process.exit(1);
  }
  walk(path);
}

const head = (path, length) => {
  const fd = openSync(path, 'r');
  const buffer = Buffer.alloc(length);
  readSync(fd, buffer, 0, length, 0);
  closeSync(fd);
  return buffer;
};

function checkFile(manifestPath, url, field, warnings, errors) {
  if (typeof url !== 'string' || /^(?:[a-z]+:|\/\/)/i.test(url)) return; // remote, data or blob URL
  if (url.startsWith('/')) {
    warnings.push(`${field}: "${url}" is root relative, cannot check it locally.`);
    return;
  }
  const path = resolve(dirname(manifestPath), url.split(/[?#]/)[0]);
  if (!existsSync(path)) {
    errors.push(`${field}: file not found "${url}"`);
    return;
  }
  const size = statSync(path).size;
  const ext = extname(path).toLowerCase();
  if (ext === '.glb') {
    if (head(path, 4).toString('latin1') !== 'glTF')
      errors.push(`${field}: "${url}" is not a valid binary glTF (.glb).`);
    if (size > 2 * 1024 * 1024)
      warnings.push(
        `${field}: "${url}" is ${(size / 1048576).toFixed(1)} MB. Aim for under 1 MB (Meshopt or Draco).`,
      );
  } else if (ext === '.png') {
    // PNG header: signature (8), IHDR length and type (8), width (4), height (4), bit depth (1), color type (1).
    const bytes = head(path, 26);
    if (bytes.readUInt32BE(0) !== 0x89504e47) errors.push(`${field}: "${url}" is not a valid PNG.`);
    else {
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      const colorType = bytes[25];
      if (Math.max(width, height) > 2048)
        warnings.push(`${field}: "${url}" is ${width}x${height}. 2048 px or less is plenty.`);
      // 4 = gray + alpha, 6 = RGBA, 3 = palette (may carry transparency). Others are opaque.
      if (field !== 'thumbnail' && ![3, 4, 6].includes(colorType)) {
        warnings.push(
          `${field}: "${url}" has no alpha channel. Stickers and garments need a transparent background.`,
        );
      }
    }
  } else if (!['.gltf', '.jpg', '.jpeg', '.webp', '.svg', '.avif'].includes(ext)) {
    warnings.push(`${field}: unexpected file type "${ext}".`);
  }
}

let failed = 0;
let checked = 0;
for (const file of files) {
  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.log(`✗ ${relative(process.cwd(), file)}\n  - invalid JSON: ${error.message}`);
    failed++;
    continue;
  }
  if (!json || typeof json !== 'object' || !('type' in json)) continue; // not a manifest (catalog, package.json)
  checked++;
  const result = safeValidateManifest(json);
  const errors = [];
  const warnings = [];
  if (result.success) {
    const urls = [
      ['model', json.model],
      ['image', json.image],
      ['thumbnail', json.thumbnail],
    ];
    (json.variants ?? []).forEach((v, i) => {
      urls.push([`variants[${i}].thumbnail`, v.thumbnail]);
      for (const key of ['model', 'image'])
        urls.push([`variants[${i}].overrides.${key}`, v.overrides?.[key]]);
    });
    for (const [field, url] of urls) checkFile(file, url, field, warnings, errors);
  }
  const name = relative(process.cwd(), file);
  if (!result.success || errors.length) {
    failed++;
    console.log(`✗ ${name}`);
    if (!result.success) console.log(formatIssues(result.issues));
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log(`✓ ${name} (${json.type})`);
  }
  warnings.forEach((w) => console.log(`  ! ${w}`));
}
console.log(`\n${checked} manifest(s) checked, ${failed} with errors.`);
process.exit(failed ? 1 : 0);
