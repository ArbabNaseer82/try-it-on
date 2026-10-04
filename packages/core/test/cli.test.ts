import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const cli = join(__dirname, '..', 'bin', 'tryonit-validate.mjs');
const built = existsSync(join(__dirname, '..', 'dist', 'index.js'));

const run = (...args: string[]) => {
  try {
    return { code: 0, out: execFileSync('node', [cli, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    const e = error as { status: number; stdout: string };
    return { code: e.status, out: e.stdout };
  }
};

// The CLI imports the built package, so it runs after `pnpm build` (CI order: build, then test).
describe.skipIf(!built)('tryonit-validate CLI', () => {
  it('accepts valid manifests and reports schema and file errors', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tryonit-cli-'));
    writeFileSync(
      join(dir, 'ok.json'),
      JSON.stringify({ version: 1, id: 'ok', type: 'makeup.lips', color: '#B0123A' }),
    );
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify({ Makeup: ['ok.json'] }));
    const ok = run(dir);
    expect(ok.code).toBe(0);
    expect(ok.out).toContain('1 manifest(s) checked, 0 with errors');

    writeFileSync(
      join(dir, 'bad.json'),
      JSON.stringify({ version: 1, id: 'g', type: 'glasses', model: 'missing.glb' }),
    );
    writeFileSync(
      join(dir, 'color.json'),
      JSON.stringify({ version: 1, id: 'c', type: 'makeup.lips', color: 'red' }),
    );
    const bad = run(dir);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('file not found "missing.glb"');
    expect(bad.out).toContain('color: Expected a color');
  });

  it('prints help', () => {
    expect(run('--help').out).toContain('Usage');
  });
});
