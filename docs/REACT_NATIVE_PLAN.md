# Plan: `@tryonit/react-native`

Status: **planned, not built yet.** This document describes how the native package will reuse the existing architecture.

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

## Quick win interim option

A `TryOnWebView` component that hosts `@tryonit/web` (`mount()`) inside `react-native-webview`, with camera permission forwarding. It works in Expo Go and gives React Native apps try-on today, at the cost of WebView performance.

## Milestones

1. `TryOnWebView` interim component.
2. Nitro frame processor plugin for Face Landmarker (iOS and Android), JS anchors via core.
3. Skia makeup renderer (lips first, then all makeup types).
4. Filament 3D renderer (glasses with head occluder).
5. Hand tracking (watch, ring), hair segmentation, pose (clothing).
6. Components mirroring the web API: `TryOnButton`, `TryOn`, `useTryOn`, `useTryOnState`.
