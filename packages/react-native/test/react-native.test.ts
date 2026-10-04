import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  createImportMap,
  createTryOnHtml,
  RUNTIME_VERSIONS,
  toInlineScriptJson,
} from '../src/html';
import { commandScript, parseBridgeEvent, type BridgeConfig } from '../src/protocol';
import { themeToCssVars } from '../src/theme';
import { resolveNativeAsset } from '../src/assets';

const require = createRequire(import.meta.url);
const config: BridgeConfig = {
  engine: {},
  controls: 'web',
  autoStart: true,
  theme: {},
  labels: {},
  capture: {},
};

describe('createTryOnHtml', () => {
  it('embeds the runtime, the config and an import map pinned to the bundled versions', () => {
    const html = createTryOnHtml({
      ...config,
      labels: { capture: 'Snap </script><script>alert(1)</script>' },
    });
    expect(html).toContain('<div id="tryonit-root">');
    expect(html).toContain(
      `@mediapipe/tasks-vision@${RUNTIME_VERSIONS.mediapipe}/vision_bundle.mjs`,
    );
    expect(html).toContain(`three@${RUNTIME_VERSIONS.three}/build/three.module.js`);
    // Only the bootstrap script tag may close: user strings are escaped.
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain('Snap <\\/script>');
  });

  it('supports self hosted libraries', () => {
    const map = createImportMap({
      mediapipeUrl: 'https://cdn.shop.com/mp/vision_bundle.mjs',
      threeBaseUrl: 'https://cdn.shop.com/three/',
      importMap: { extra: 'https://x/y.js' },
    });
    expect(map['@mediapipe/tasks-vision']).toBe('https://cdn.shop.com/mp/vision_bundle.mjs');
    expect(map.three).toBe('https://cdn.shop.com/three/build/three.module.js');
    expect(map['three/']).toBe('https://cdn.shop.com/three/');
    expect(map.extra).toBe('https://x/y.js');
  });

  it('escapes HTML comment openers and line separators', () => {
    const out = toInlineScriptJson({ a: `<!-- x ${String.fromCharCode(0x2028)}` });
    expect(out).not.toContain('<!--');
    expect(out).toContain('\\u2028');
    expect(JSON.parse(out.replace('<\\!--', '<!--'))).toEqual({
      a: `<!-- x ${String.fromCharCode(0x2028)}`,
    });
  });
});

describe('protocol', () => {
  it('parses only TryOnIt events', () => {
    expect(parseBridgeEvent(JSON.stringify({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseBridgeEvent(JSON.stringify({ type: 'other' }))).toBeNull();
    expect(parseBridgeEvent('not json')).toBeNull();
    expect(parseBridgeEvent(42)).toBeNull();
  });

  it('builds injectable command scripts', () => {
    const script = commandScript({ type: 'setVariant', variantId: 'nude' });
    expect(script).toBe(
      'window.__tryonit&&window.__tryonit.receive({"type":"setVariant","variantId":"nude"});true;',
    );
  });
});

describe('theme', () => {
  it('maps shared theme tokens to view CSS variables', () => {
    expect(
      themeToCssVars({
        colors: { primary: '#7C3AED', onPrimary: '#fff' },
        radius: 12,
        fontFamily: 'Inter',
        fontSize: 15,
      }),
    ).toEqual({
      'color-primary': '#7C3AED',
      'color-on-primary': '#fff',
      radius: '12px',
      'font-family': 'Inter',
      'font-size': '15px',
    });
  });
});

describe('assets', () => {
  it('validates objects and rejects relative URLs', async () => {
    await expect(
      resolveNativeAsset({ version: 1, id: 'l', type: 'makeup.lips', color: '#f00' }),
    ).resolves.toMatchObject({ opacity: 0.6 });
    await expect(resolveNativeAsset('/assets/x.json')).rejects.toThrow(/absolute/);
    await expect(
      resolveNativeAsset(async () => ({ version: 1, id: 'x', type: 'nope' })),
    ).rejects.toMatchObject({ code: 'ASSET_INVALID' });
  });
});

describe('Expo config plugin', () => {
  it('adds the camera usage description and Android permission without duplicates', () => {
    const plugin = require('../app.plugin.js') as (
      c: Record<string, unknown>,
      p?: Record<string, string>,
    ) => {
      ios: { infoPlist: Record<string, string> };
      android: { permissions: string[] };
    };
    const out = plugin({
      ios: { infoPlist: { NSCameraUsageDescription: 'Mine' } },
      android: { permissions: ['android.permission.CAMERA'] },
    });
    expect(out.ios.infoPlist.NSCameraUsageDescription).toBe('Mine');
    expect(out.android.permissions).toEqual(['android.permission.CAMERA']);
    expect(plugin({}, { cameraPermission: 'Try on' }).ios.infoPlist.NSCameraUsageDescription).toBe(
      'Try on',
    );
  });
});
