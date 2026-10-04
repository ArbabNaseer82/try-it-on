import { expect, test, type Page } from '@playwright/test';

/** Records every MediaStream track created by getUserMedia so the test can check cleanup. */
async function trackCameras(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __tracks: MediaStreamTrack[] };
    w.__tracks = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      w.__tracks.push(...stream.getTracks());
      return stream;
    };
  });
}

const liveTracks = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.filter(
        (t) => t.readyState === 'live',
      ).length,
  );

test('makeup try-on in a modal: runs, hints, captures, cleans up, never loads three.js', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await trackCameras(page);

  await page.goto('/?asset=lipstick&layout=modal');
  await page.getByRole('button', { name: 'Try it on' }).click();
  const dialog = page.getByRole('dialog', { name: 'Virtual try-on' });
  await expect(dialog).toBeVisible();

  // Status reaches running (camera, MediaPipe runtime, face model, GL renderer).
  await expect(dialog.locator('.toi-tryon')).toHaveAttribute('data-status', 'running');

  // The fake camera has no face, so the hint appears.
  await expect(dialog.locator('.toi-status__pill')).toHaveText('Look at the camera');

  // Capture returns a non empty image.
  await dialog.getByRole('button', { name: 'Take photo' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__tryonitLastCapture ?? 0))
    .toBeGreaterThan(1000);
  await expect(dialog.getByRole('link', { name: /Download/ })).toBeVisible();

  // Closing the dialog stops every camera track.
  expect(await liveTracks(page)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => liveTracks(page)).toBe(0);

  // Makeup only: three.js must never be requested.
  expect(requests.filter((url) => /three/i.test(url))).toEqual([]);
  expect(requests.some((url) => url.includes('face_landmarker.task'))).toBe(true);
  expect(requests.some((url) => url.includes('hand_landmarker'))).toBe(false);
  expect(errors).toEqual([]);
});

test('glasses load the three.js renderer lazily and reach running', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/?asset=glasses-aviator');
  await expect(page.locator('.toi-tryon')).toHaveAttribute('data-status', 'running');
  await expect(page.getByTestId('modules')).toContainText('three');
  expect(requests.some((url) => /three-renderer/.test(url))).toBe(true);
  expect(requests.some((url) => url.includes('glasses-aviator.glb'))).toBe(true);
});

declare global {
  interface Window {
    __tryonitLastCapture?: number;
  }
}
