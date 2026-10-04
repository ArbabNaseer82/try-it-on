# @tryonit/web

**Browser engine for free, open-source, client-side virtual try-on**, plus a framework-free `mount()` UI for Vue, Svelte, Angular, Shopify themes and plain HTML. Real time makeup, glasses, hats, earrings, watches, rings, hair color and clothing overlays with MediaPipe tracking and WebGL rendering. Everything runs on the device.

```bash
npm install @tryonit/web three
```

`three` is an optional peer dependency, loaded only for 3D assets.

## Drop-in UI with `mount()`

```ts
import { mount } from '@tryonit/web';
import '@tryonit/web/styles.css';

const tryon = mount(document.getElementById('tryon')!, {
  asset: '/assets/aviator.json',
  modelBaseUrl: '/models', // optional: self hosted models
  theme: { 'color-primary': '#0f766e' },
  onCapture: (blob) => upload(blob),
});

tryon.setAsset('/assets/round.json');
tryon.destroy();
```

| Option                   | Type                       | Description                                |
| ------------------------ | -------------------------- | ------------------------------------------ |
| all `TryOnEngineOptions` |                            | See below.                                 |
| `asset`                  | `AssetSource`              | Product to show.                           |
| `autoStart`              | `boolean` (default `true`) | Start the camera immediately.              |
| `labels`                 | `Partial<MountLabels>`     | Override strings (`DEFAULT_MOUNT_LABELS`). |
| `theme`                  | `Record<string, string>`   | CSS variables without the `--toi-` prefix. |
| `onCapture`              | `(blob) => void`           | Called after a capture.                    |
| `onError`                | `(error) => void`          | Called on errors.                          |

Returns `{ engine, element, setAsset(source), destroy() }`.

## Engine API

```ts
import { createTryOnEngine } from '@tryonit/web';

const engine = createTryOnEngine({
  container: document.getElementById('stage'),
  performance: 'auto',
  modelBaseUrl: '/models',
  wasmBaseUrl: '/wasm',
});

await engine.setAsset('/assets/lipstick.json');
await engine.start();
engine.setVariant('nude');
engine.setIntensity(0.7);
await engine.switchCamera();
const blob = await engine.capture({ type: 'image/png' });
engine.pause();
engine.resume();
engine.destroy();
```

### `TryOnEngineOptions`

| Option           | Type                                                                        | Default                                | Description                                                                                                       |
| ---------------- | --------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `container`      | `HTMLElement`                                                               |                                        | Where the stage mounts. Can be set later with `attach()`.                                                         |
| `modelBaseUrl`   | `string`                                                                    | Google hosted                          | Folder with `face_landmarker.task`, `hand_landmarker.task`, `pose_landmarker_lite.task`, `hair_segmenter.tflite`. |
| `models`         | `Partial<Record<'face' \| 'hand' \| 'pose' \| 'segmenter', string>>`        |                                        | Per model URL overrides.                                                                                          |
| `wasmBaseUrl`    | `string`                                                                    | jsDelivr pinned to `MEDIAPIPE_VERSION` | Folder with the MediaPipe wasm files.                                                                             |
| `camera`         | `{ facing?, width?, height?, deviceId? }`                                   | `user`, 1280x720                       | Camera constraints.                                                                                               |
| `performance`    | `'auto' \| 'quality' \| 'balanced' \| 'battery'`                            | `'auto'`                               | Detection rate strategy.                                                                                          |
| `mirror`         | `boolean`                                                                   | front camera only                      | Mirror the view.                                                                                                  |
| `fit`            | `'cover' \| 'contain'`                                                      | `'cover'`                              | How the stage fills the container.                                                                                |
| `debug`          | `boolean`                                                                   | `false`                                | Landmark overlay and FPS HUD.                                                                                     |
| `delegate`       | `'auto' \| 'GPU' \| 'CPU'`                                                  | `'auto'`                               | MediaPipe delegate with fallback.                                                                                 |
| `smoothing`      | `Partial<Record<'makeup' \| 'face3d' \| 'hand' \| 'body', OneEuroOptions>>` | `SMOOTHING_DEFAULTS`                   | Jitter versus lag tuning.                                                                                         |
| `irisDiameterMm` | `number`                                                                    | 11.7                                   | Metric scale reference.                                                                                           |
| `fetch`          | `Fetcher`                                                                   | `globalThis.fetch`                     | Custom fetch for manifests.                                                                                       |
| `three`          | `{ dracoDecoderPath?, ktx2TranscoderPath?, scale? }`                        |                                        | 3D loader options.                                                                                                |
| `onFrame`        | `(results: FrameResults) => void`                                           |                                        | Fast path raw tracking results per detection.                                                                     |

### `TryOnEngine`

| Member                         | Description                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `store`                        | Session store: `getState()`, `subscribe(listener)`.                       |
| `element`                      | Stage root element.                                                       |
| `attach(container \| null)`    | Mount or detach the stage.                                                |
| `start()`                      | Open the camera and load only the trackers the asset needs.               |
| `startFromImage(fileOrUrl)`    | Photo fallback (IMAGE mode).                                              |
| `stop()`                       | Stop the camera, keep models warm, status `idle`.                         |
| `setAsset(source \| null)`     | Swap the product, returns the validated manifest. Cancels previous loads. |
| `setVariant(id)`               | Shade or style.                                                           |
| `setIntensity(0..1)`           | Effect strength.                                                          |
| `switchCamera()`               | Front and rear.                                                           |
| `capture(options?)`            | `Promise<Blob>`, options `type`, `quality`, `mirror`.                     |
| `pause()`, `resume()`          | Also automatic on tab visibility changes.                                 |
| `setCompare(position \| null)` | Before and after split (0..1).                                            |
| `setDebug(boolean)`            | Toggle overlay and HUD.                                                   |
| `destroy()`                    | Stop tracks, close MediaPipe tasks, free WebGL, remove listeners.         |
| `on(event, handler)` / `off`   | Events below. Returns an unsubscribe function.                            |
| `getLatestResults()`           | Latest raw `FrameResults`.                                                |

### Events

| Event                                                                     | Payload            |
| ------------------------------------------------------------------------- | ------------------ |
| `statusChange`                                                            | `{ status, prev }` |
| `error`                                                                   | `TryOnError`       |
| `faceFound`, `faceLost`, `handFound`, `handLost`, `bodyFound`, `bodyLost` | none               |
| `assetLoaded`                                                             | `AssetManifest`    |
| `capture`                                                                 | `Blob`             |
| `frame`                                                                   | `FrameResults`     |

## Other exports

| Export                                                                                             | Description                                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `preloadTryOn(sources, options?)`                                                                  | Warm runtime, models, chunks and product files. |
| `isTryOnSupported()`, `detectCapabilities()`                                                       | Feature detection, SSR safe.                    |
| `clearModelCache()`                                                                                | Free cached model bytes.                        |
| `DEFAULT_MODEL_URLS`, `MODEL_FILES`, `DEFAULT_WASM_BASE_URL`, `MEDIAPIPE_VERSION`, `getModelUrl()` | Model location helpers.                         |
| everything from `@tryonit/core`                                                                    | Re-exported for convenience.                    |

## Framework recipes

```ts
// Vue 3
onMounted(() => (handle = mount(el.value!, { asset })));
onBeforeUnmount(() => handle.destroy());

// Svelte
onMount(() => { const h = mount(node, { asset }); return () => h.destroy(); });

// Angular
ngAfterViewInit() { this.handle = mount(this.host.nativeElement, { asset: this.asset }); }
ngOnDestroy() { this.handle.destroy(); }
```

## Create your own products and filters

Every product is a small JSON **asset manifest**, plus one file for products that need it:

| You want                                                | `type`                                        | File you provide                |
| ------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| Lipstick, blush, eyeshadow, eyeliner, brows, foundation | `makeup.*`                                    | none, only colors               |
| Beauty filter (full makeup look)                        | `makeup.look`                                 | none                            |
| Hair color                                              | `hair.color`                                  | none                            |
| Fun face filter, sticker, mask                          | `face.overlay2d`                              | PNG with transparent background |
| Glasses, hats, earrings, watches, rings                 | `glasses`, `hat`, `earrings`, `watch`, `ring` | GLB 3D model in millimeters     |
| T-shirt or top (experimental)                           | `clothing.top`                                | PNG plus 4 anchor points        |

```json
{ "version": 1, "id": "ruby", "type": "makeup.lips", "color": "#B0123A", "finish": "satin" }
```

```json
{
  "version": 1,
  "id": "moustache",
  "type": "face.overlay2d",
  "image": "moustache.png",
  "anchor": "mouth",
  "scale": 0.55
}
```

```json
{ "version": 1, "id": "aviator", "type": "glasses", "model": "aviator.glb" }
```

Check your files before shipping:

```bash
npx -p @tryonit/core tryonit-validate public/tryon
```

Step by step recipes for every type (beauty filters, stickers, 3D models, variants, hosting, Shopify and CMS loading, troubleshooting): **[Creating products and filters](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/CREATING_PRODUCTS.md)**.

## Requirements

WebGL2 and a secure context (HTTPS or localhost). See the browser table in the [main README](https://github.com/ArbabNaseer82/try-it-on#browser-support).

MIT licensed.
