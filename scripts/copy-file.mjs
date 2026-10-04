// Cross platform file copy used by package build scripts.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error('Usage: node copy-file.mjs <from> <to>');
  process.exit(1);
}
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
