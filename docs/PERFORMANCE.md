# Performance

TryOnIt is built to keep product pages fast. Nothing heavy loads until a shopper opens try-on, and only the pieces the current product needs are downloaded.

## Bundle budgets (min + gzip, enforced by `pnpm size`)

| Entry                                                                                      | Budget | Measured      |
| ------------------------------------------------------------------------------------------ | ------ | ------------- |
| `@tryonit/core`, typical import (`validateManifest`, `createSessionStore`, `resolveAsset`) | 8 KB   | about 5.9 KB  |
| `@tryonit/core`, entire public API                                                         | 14 KB  | about 12.9 KB |
| `@tryonit/web` initial entry, excluding MediaPipe and three.js (both lazy)                 | 25 KB  | about 22.6 KB |
| `@tryonit/react`                                                                           | 15 KB  | about 7.9 KB  |
| `@tryonit/react/styles.css`                                                                | 6 KB   | about 2.5 KB  |
| `@tryonit/web/styles.css` (vanilla `mount()`)                                              | 3 KB   | about 0.9 KB  |

**Note on the core budget.** The original target was 8 KB for the whole core. Measuring every export at once (validator for 15 asset types, anchors, filters, homography, resolver) gives about 12.9 KB, so the "entire API" budget is 14 KB, and a second check keeps the typical tree-shaken import under the original 8 KB. Apps only pay for what they import.

## Lazy chunks

| Chunk                                                     | When it loads                                |
| --------------------------------------------------------- | -------------------------------------------- |
| `@mediapipe/tasks-vision` (about 45 KB gzip JS plus wasm) | First time any tracker is needed             |
| Face, hand, pose or segmenter adapter                     | When an asset of that kind is set            |
| Model file (`.task` / `.tflite`, 1 to 8 MB)               | Same, downloaded once and kept in memory     |
| GL renderers (makeup, hair, 2D overlay)                   | Makeup, hair, sticker or clothing assets     |
| three.js renderer plus three.js                           | Glasses, hats, earrings, watches, rings only |

Switching between two lipsticks loads nothing. Switching from lipstick to glasses loads only three.js (the face tracker is already warm).

## Preloading

```tsx
<TryOnButton asset={asset} preload="hover" />   // default: warm on hover or focus
<TryOnButton asset={asset} preload="visible" /> // warm when the button scrolls into view
```

```ts
import { preloadTryOn } from '@tryonit/web';
preloadTryOn(['/assets/aviator.json', '/assets/ruby.json'], { modelBaseUrl: '/models' });
```

## Runtime

- Rendering runs on `requestAnimationFrame`. Detection runs on `requestVideoFrameCallback` where supported, so it happens once per new camera frame.
- Adaptive detection rate: 30 fps target, drops to 15 fps when detection plus render time exceeds the frame budget, recovers after 3 stable seconds. Modes: `auto` (30 to 15), `quality` (fixed 30), `balanced` (24 to 15), `battery` (fixed 15).
- Detection input is downscaled to 640 px on the long side, independent of the 720p display.
- MediaPipe runs on the GPU delegate with automatic CPU fallback.
- Per frame data never goes through React state. The store updates perf numbers at most twice per second.
- The session pauses automatically when the tab is hidden and the camera stops when the dialog closes.
- `destroy()` stops camera tracks, closes MediaPipe tasks, disposes WebGL resources and removes listeners. A test mounts and unmounts the React component 20 times (in StrictMode) and checks for lingering tracks and listeners.

## Tips

- Self host models next to your site (`modelBaseUrl`) and serve them with long cache headers.
- Keep GLB files under 1 MB with Meshopt or Draco compression ([ASSET_AUTHORING.md](./ASSET_AUTHORING.md)).
- Use `performance: 'battery'` for kiosks or low end devices.
- Turn on `debug` to see FPS, detection time, render time, detection rate and loaded modules.

## Web Worker mode

Not enabled. Tracking in a worker is planned behind the existing `Tracker` interface (see `packages/web/src/trackers/tracker.interface.ts`). It is not the default because iOS Safari has limited OffscreenCanvas WebGL support in workers and transferring frames adds latency.
