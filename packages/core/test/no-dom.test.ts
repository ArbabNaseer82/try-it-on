// Proves @tryonit/core runs without DOM globals (Node, React Native, workers).
import { describe, expect, it } from 'vitest';

describe('platform agnostic core', () => {
  it('has no DOM globals in this environment', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
    expect(
      typeof (globalThis as { navigator?: { mediaDevices?: unknown } }).navigator?.mediaDevices,
    ).toBe('undefined');
  });

  it('imports and runs the full public API without DOM globals', async () => {
    const core = await import('../src');
    const store = core.createSessionStore();
    store.actions.transition('checking');
    expect(store.getState().status).toBe('checking');
    const asset = core.validateManifest({
      version: 1,
      id: 'x',
      type: 'makeup.lips',
      color: '#f00',
    });
    expect(core.getAssetRequirements(asset).trackers).toEqual(['face']);
  });

  it('source files never reference browser globals', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '..', 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith('.ts')) files.push(full);
      }
    };
    walk(root);
    const banned = /\b(window|document|navigator|HTMLElement|localStorage|requestAnimationFrame)\b/;
    for (const file of files) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(banned.test(code), file).toBe(false);
    }
  });
});
