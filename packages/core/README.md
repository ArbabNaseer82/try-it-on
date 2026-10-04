# @tryonit/core

**Platform agnostic core of TryOnIt**, the free, open-source virtual try-on SDK. Pure TypeScript with **zero dependencies and no DOM**: asset manifest types and validation, a tiny state store with a session state machine, face, hand and body anchor math, iris based metric scale, and One Euro smoothing filters. Runs in browsers, Node, workers and React Native.

```bash
npm install @tryonit/core
```

Most apps use [`@tryonit/react`](../react) or [`@tryonit/web`](../web), which re-export this package. Use core directly for tooling (validating a product catalog in CI, building manifests in a CMS) or a custom renderer.

## Validate manifests

```ts
import { validateManifest, safeValidateManifest } from '@tryonit/core';

const asset = validateManifest(json); // throws TryOnError(ASSET_INVALID) with path based issues
const result = safeValidateManifest(json); // { success: true, data } | { success: false, issues }
```

Example CI script for a product catalog:

```ts
import { readFileSync } from 'node:fs';
import { safeValidateManifest, formatIssues } from '@tryonit/core';

for (const file of process.argv.slice(2)) {
  const result = safeValidateManifest(JSON.parse(readFileSync(file, 'utf8')));
  if (!result.success) {
    console.error(`${file}\n${formatIssues(result.issues)}`);
    process.exitCode = 1;
  }
}
```

The JSON Schema ships as `@tryonit/core/manifest.v1.schema.json` for editor autocomplete.

## Resolve assets from anywhere

```ts
import { resolveAsset } from '@tryonit/core';

const controller = new AbortController();
const asset = await resolveAsset('https://cdn.example.com/aviator.json', {
  signal: controller.signal,
});
const fromApi = await resolveAsset((signal) =>
  fetch('/api/tryon/123', { signal }).then((r) => r.json()),
);
```

Relative `model`, `image` and `thumbnail` URLs resolve against the manifest URL. Results are cached by id and URL. Pass `fetch` to use a custom fetcher.

## API reference

### Validation

| Export                                                               | Description                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateManifest(input, options?)`                                  | Returns a typed `AssetManifest` with defaults applied, or throws `TryOnError`.                                                                                                                                                                                                                                          |
| `safeValidateManifest(input, options?)`                              | Non throwing variant.                                                                                                                                                                                                                                                                                                   |
| `manifestSchema`, `assetSchemas`, `ASSET_TYPES`, `MANIFEST_DEFAULTS` | Runtime schemas and constants.                                                                                                                                                                                                                                                                                          |
| `s`                                                                  | The schema builder: `s.string`, `s.number`, `s.boolean`, `s.literal`, `s.enum`, `s.array`, `s.tuple`, `s.object`, `s.record`, `s.optional`, `s.partial`, `s.union`, `s.discriminatedUnion`, `s.color`, `s.refine`, `s.unknown`. Every schema has `parse` and `safeParse`. `Infer<typeof schema>` gives the output type. |
| `formatIssues`, `formatPath`                                         | Readable issue output.                                                                                                                                                                                                                                                                                                  |

### State

| Export                                                                          | Description                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createStore(initial)`                                                          | `{ getState, setState, subscribe, destroy }`. Immutable, notifications batched per microtask. Compatible with `useSyncExternalStore`.                                     |
| `createSessionStore(options?)`                                                  | Store with `SessionState` and `actions` (`transition`, `fail`, `setError`, `setAsset`, `setVariant`, `setIntensity`, `setCamera`, `setTracking`, `setPerf`, `addModule`). |
| `SESSION_TRANSITIONS`, `canTransition(from, to)`, `createInitialSessionState()` | Finite state machine.                                                                                                                                                     |
| `shallowEqual`, `subscribeSelector(store, selector, listener, isEqual?)`        | Mirror slices into Redux, Zustand or anything else.                                                                                                                       |

### Anchors and math

| Export                                                                    | Description                                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `computeFaceAnchors(face, { camera, scaleFactor?, config? })`             | Nose bridge, forehead, ear lobes, head occluder poses, yaw, pitch, roll, 2D overlay anchors. |
| `computeHandAnchors(hand, { camera, config? })`                           | Wrist frame and ring poses per finger, palm width, depth.                                    |
| `computeBodyAnchors(pose, { aspect, padding?, minVisibility? })`          | Padded torso quad for clothing.                                                              |
| `estimateMetricScale(landmarks, { aspect, irisDiameterMm? })`             | Millimeters per unit, face width, 3D scale correction.                                       |
| `OneEuroFilter`, `VectorFilter`, `QuaternionFilter`, `PoseFilter`         | Smoothing.                                                                                   |
| `SMOOTHING_DEFAULTS`, `TRACKING_LOST_GRACE_MS`                            | Tuning constants.                                                                            |
| `computeHomography`, `applyHomography`, `warpGrid`                        | Perspective warp.                                                                            |
| `triangulate`, `polygonArea`                                              | Ear clipping for region masks.                                                               |
| `quat*`, `mat4*`, vector helpers, `project`, `unproject`, `DEFAULT_FOV_Y` | Math utilities.                                                                              |
| `parseColor(css)`                                                         | CSS color to RGBA 0..1.                                                                      |
| `FACE`, `FACE_REGIONS`, `HAND`, `FINGER_SEGMENTS`, `POSE`                 | Named MediaPipe landmark indices.                                                            |

### Assets

| Export                                                            | Description                                  |
| ----------------------------------------------------------------- | -------------------------------------------- |
| `resolveAsset(source, options?)`                                  | Object, URL or loader to validated manifest. |
| `getAssetRequirements(asset)`, `mergeRequirements(list)`          | Trackers and renderers an asset needs.       |
| `applyVariant(asset, variantId)`, `findVariant(asset, variantId)` | Variants.                                    |
| `AssetCache`, `defaultAssetCache`, `getCachedAsset(id)`           | LRU cache.                                   |
| `resolveUrl(relative, base)`                                      | URL resolution without the `URL` global.     |
| `isAbortError`, `createAbortError`                                | Abort helpers.                               |

### Events and errors

| Export                                                    | Description                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `createEmitter<Events>()`                                 | Typed `on`, `once`, `off`, `emit`, `listenerCount`, `clear`.     |
| `TryOnError`, `ErrorCode`, `isTryOnError`, `toTryOnError` | Errors with stable codes, `retryable` and `canUsePhotoFallback`. |

All types (`AssetManifest`, every `XAsset` and `XProps`, `SessionState`, `Landmark`, `AnchorPose`, ...) are exported.

MIT licensed.
