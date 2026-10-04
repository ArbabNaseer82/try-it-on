// Runs the exact page that @tryonit/react-native loads into its WebView, in Chromium, with a
// fake camera and a mocked `window.ReactNativeWebView` bridge. MediaPipe, three.js and the
// models load from the real CDNs through the import map, like on a phone.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { createTryOnHtml, TRYON_BASE_URL } from '../packages/react-native/src/html';
import type {
  BridgeCommand,
  BridgeConfig,
  BridgeEvent,
} from '../packages/react-native/src/protocol';

const ASSETS = fileURLToPath(new URL('../.cache/assets', import.meta.url));

async function openRuntime(page: Page, config: Partial<BridgeConfig> = {}) {
  const html = createTryOnHtml({
    engine: {},
    controls: 'web',
    autoStart: true,
    theme: {},
    labels: {},
    capture: {},
    ...config,
  });
  await page.route(`${TRYON_BASE_URL}**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    const file = join(ASSETS, url.pathname.replace('/assets/', ''));
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({
      body: readFileSync(file),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.addInitScript(() => {
    const w = window as unknown as {
      __events: unknown[];
      ReactNativeWebView: { postMessage(m: string): void };
    };
    w.__events = [];
    w.ReactNativeWebView = { postMessage: (m: string) => w.__events.push(JSON.parse(m)) };
  });
  await page.goto(TRYON_BASE_URL);
}

const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { __events: BridgeEvent[] }).__events);
const send = (page: Page, command: BridgeCommand) =>
  page.evaluate(
    (c) => (window as unknown as { __tryonit: { receive(c: unknown): void } }).__tryonit.receive(c),
    command,
  );
const lastState = async (page: Page) => {
  const list = await events(page);
  return [...list]
    .reverse()
    .find((e): e is Extract<BridgeEvent, { type: 'state' }> => e.type === 'state')?.state;
};

test('makeup in the React Native WebView runtime: ready, running, hint, capture, no three.js', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const logs: string[] = [];
  // MediaPipe prints informational lines ("INFO: Created TensorFlow Lite ...") as console errors.
  page.on(
    'console',
    (m) => m.type() === 'error' && !m.text().startsWith('INFO:') && logs.push(m.text()),
  );
  await openRuntime(page, { theme: { 'color-primary': '#0f766e' } });

  await expect.poll(async () => (await events(page)).some((e) => e.type === 'ready')).toBe(true);
  const lipstick = JSON.parse(readFileSync(join(ASSETS, 'lipstick.json'), 'utf8'));
  await send(page, { type: 'setAsset', asset: lipstick });
  await expect
    .poll(async () => (await lastState(page))?.status, { timeout: 60_000 })
    .toBe('running');
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === 'assetLoaded'))
    .toBe(true);

  // Built in controls render, themed, with the "look at the camera" hint (fake camera has no face).
  await expect(page.locator('.toi-mount .toi-btn--capture')).toBeVisible();
  await expect(page.locator('.toi-status__text')).toHaveText('Look at the camera', {
    timeout: 15_000,
  });
  expect(
    await page
      .locator('.toi-mount')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--toi-color-primary').trim()),
  ).toBe('#0f766e');

  await send(page, { type: 'setVariant', variantId: 'nude' });
  await expect.poll(async () => (await lastState(page))?.variantId).toBe('nude');

  await send(page, { type: 'capture', id: 7 });
  await expect
    .poll(async () => {
      const capture = (await events(page)).find((e) => e.type === 'capture');
      return capture && capture.type === 'capture'
        ? {
            id: capture.id,
            mime: capture.mimeType,
            ok: capture.dataUrl.startsWith('data:image/jpeg;base64,') && capture.width > 0,
          }
        : null;
    })
    .toEqual({ id: 7, mime: 'image/jpeg', ok: true });

  // The built in shutter sends an unsolicited capture (id null).
  await page.locator('.toi-mount .toi-btn--capture').click();
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === 'capture' && e.id === null))
    .toBe(true);

  expect(requests.some((u) => u.includes('vision_bundle.mjs'))).toBe(true);
  expect(requests.some((u) => /three(@|\.module)/.test(u))).toBe(false);
  expect((await events(page)).filter((e) => e.type === 'log' && e.level === 'error')).toEqual([]);
  expect(logs).toEqual([]);
});

test('glasses load three.js lazily through the import map; commands report errors', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await openRuntime(page, { controls: 'none' });
  await expect.poll(async () => (await events(page)).some((e) => e.type === 'ready')).toBe(true);
  const glasses = {
    ...JSON.parse(readFileSync(join(ASSETS, 'glasses-aviator.json'), 'utf8')),
    model: `${TRYON_BASE_URL}assets/models3d/glasses-aviator.glb`,
  };
  await send(page, { type: 'setAsset', asset: glasses });
  await expect
    .poll(async () => (await lastState(page))?.status, { timeout: 60_000 })
    .toBe('running');
  await expect.poll(async () => (await lastState(page))?.modules ?? []).toContain('three');
  expect(requests.some((u) => u.includes('three.module.js'))).toBe(true);
  expect(requests.some((u) => u.includes('GLTFLoader.js'))).toBe(true);
  expect(await page.locator('.toi-mount').count()).toBe(0);

  await send(page, {
    type: 'setAsset',
    asset: {
      version: 1,
      id: 'bad',
      type: 'glasses',
      model: `${TRYON_BASE_URL}assets/missing.glb`,
    } as never,
  });
  await expect
    .poll(async () =>
      (await events(page)).find((e) => e.type === 'commandError' || e.type === 'error'),
    )
    .toMatchObject({ error: { code: 'ASSET_LOAD_FAILED' } });
});
