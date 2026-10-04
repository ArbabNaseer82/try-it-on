# Plan: `@tryonit/react-native`

Status: **phase 1 shipped.** `@tryonit/react-native` 0.1 runs the TryOnIt engine inside `react-native-webview` (works in Expo Go, Expo dev builds and bare React Native). This document describes the fully native engine planned behind the same public API.

## Goals

- Same asset manifests, validation, store, anchors and smoothing as the web.
- Same theme token names and labels, so web and native UIs look and read the same.
- Native performance: camera frames never cross the JS bridge as pixels.

## What is reused unchanged

`@tryonit/core` is already platform agnostic:

- No DOM types (`lib: ["ES2022"]`), no `window`, `document` or `navigator`.
- `resolveAsset` takes an injectable `fetch` and resolves URLs without the `URL` global.
- The store uses `queueMicrotask` with a Promise fallback, both available in Hermes.
- A test imports the full core API in a Node environment without DOM globals.

Shared pieces: `validateManifest`, `createSessionStore` (same `SessionState` and FSM), `computeFaceAnchors`, `computeHandAnchors`, `computeBodyAnchors`, `estimateMetricScale`, `OneEuroFilter`, `PoseFilter`, `getAssetRequirements`, error codes. The React package's `Theme`, `Labels` and `Icons` types move to a tiny shared module or are duplicated with identical names.

## Native architecture

```
react-native-vision-camera v5 (Nitro Modules)
  └─ frame processor plugin (Nitro, C++/Swift/Kotlin)
       ├─ Android: com.google.mediapipe:tasks-vision (FaceLandmarker, HandLandmarker, PoseLandmarker, ImageSegmenter)
       └─ iOS: MediaPipeTasksVision (CocoaPods / SPM)
            └─ returns landmarks and matrices (small arrays) to JS worklets
                 └─ @tryonit/core anchors + One Euro smoothing (runs in a worklet or on JS)
Rendering
  ├─ Makeup, hair, 2D overlays: React Native Skia (runtime shaders port the GLSL from web)
  └─ 3D (glasses, hats, earrings, watches, rings): Filament (react-native-filament) with GLB models
```

- Camera: `react-native-vision-camera` v5 with a custom Nitro frame processor plugin wrapping native MediaPipe Tasks.
- Makeup shaders: the web GLSL (luminance aware composite, separable blur) maps directly to Skia `RuntimeEffect` SkSL.
- 3D: Filament renders the same GLB files authored in millimeters with the same axis conventions; occluders become depth only materials.
- Requires a development build (not Expo Go) and an Expo config plugin that adds the MediaPipe dependencies and camera permissions.

## Phase 1 (shipped): WebView engine

`TryOnView`, `TryOnModal`, `TryOnButton` and `useTryOn` host `@tryonit/web` inside `react-native-webview`:

- The TryOnIt code (core, web engine and a message bridge) is embedded in the package by `packages/react-native/scripts/build-runtime.mjs`. MediaPipe and three.js load lazily from a CDN through an import map (three.js only for 3D products).
- The page runs on `https://tryonit.local/` (a secure origin, required for the camera). Commands go in through `injectJavaScript`, events come out through `postMessage` (`src/protocol.ts`).
- Products are resolved and validated with `@tryonit/core` on the React Native side.
- An Expo config plugin (`app.plugin.js`) adds the camera permissions for dev builds.
- Tested by `e2e/react-native-runtime.spec.ts` (the exact page in Chromium with a fake camera) and by bundling `examples/expo-app` with Metro for iOS and Android.

The native engine below will keep this public API, so apps can upgrade without code changes.

## Milestones

1. WebView engine (shipped in 0.1).
2. Nitro frame processor plugin for Face Landmarker (iOS and Android), JS anchors via core.
3. Skia makeup renderer (lips first, then all makeup types).
4. Filament 3D renderer (glasses with head occluder).
5. Hand tracking (watch, ring), hair segmentation, pose (clothing).
6. Components mirroring the web API: `TryOnButton`, `TryOn`, `useTryOn`, `useTryOnState`.
