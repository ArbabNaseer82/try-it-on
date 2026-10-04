<div align="center">

# TryOnIt

### Free, open-source virtual try-on SDK for the web and React

Let shoppers see **makeup, glasses, sunglasses, hats, earrings, watches, rings, hair color and clothing** on themselves in real time, using the front camera of their phone or laptop. **100% client-side**: no servers, no per-try fees, and no camera frame ever leaves the device.

[![npm](https://img.shields.io/npm/v/@tryonit/react?label=%40tryonit%2Freact)](https://www.npmjs.com/package/@tryonit/react)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![runtime deps](https://img.shields.io/badge/core%20dependencies-0-brightgreen)

[Quick start](#quick-start-in-30-seconds) · [Problems it solves](#what-problems-does-tryonit-solve) · [Use cases](#which-projects-is-it-for) · [Implementation guide](#implementation-guide) · [Docs](#documentation) · [FAQ](#faq)

</div>

---

<!-- Demo GIF: record the playground (pnpm dev) and save it as docs/media/demo.gif -->
<p align="center"><em>Demo GIF placeholder: <code>docs/media/demo.gif</code> (lipstick shades, aviator glasses with head occlusion, watch on wrist).</em></p>

## What is TryOnIt?

TryOnIt is an **open-source augmented reality (AR) virtual try-on library** for e-commerce. You install one package, point it at a product description (a small JSON "asset manifest"), and render one component. TryOnIt opens the camera, tracks the face, hand or body with **Google MediaPipe**, and renders the product on top with **WebGL** (custom shaders for makeup and 2D overlays, **three.js** for 3D models).

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

<TryOnButton asset="/assets/aviator.json" />;
```

That is a complete, accessible, themeable try-on experience: camera permission flow, loading states, "look at the camera" hints, product and shade switcher, before and after compare, photo capture with download and share, and a photo upload fallback when the camera is blocked.

## What problems does TryOnIt solve?

| Problem                                                                                                                | How TryOnIt solves it                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High return rates** for eyewear, beauty, jewelry and fashion because shoppers cannot see how a product looks on them | Real time try-on on the shopper's own face, hand or body before they buy, with real world scale for glasses (iris based metric scale)                               |
| **Low conversion on product pages**                                                                                    | A one line "Try it on" button that keeps shoppers engaged and lets them compare shades and styles instantly                                                         |
| **Expensive AR SaaS** with per-try or per-SKU pricing and vendor lock-in                                               | MIT licensed, free forever, runs entirely in the browser, so there is no backend bill at any traffic level                                                          |
| **Privacy and compliance risk** (GDPR, CCPA, biometric data laws) from streaming faces to third party servers          | Zero servers: every frame is processed on device. No analytics, no tracking, no network calls except the model and asset files you configure                        |
| **Slow pages** from heavy AR scripts                                                                                   | Tiny base bundle, everything lazy loaded: MediaPipe, models and three.js load only when a shopper opens try-on and only for the product type they need              |
| **Generic widgets that do not match the brand**                                                                        | Theme tokens, CSS variables, per-slot class names, replaceable icons, images and labels, an `unstyled` mode and fully headless hooks                                |
| **Framework lock-in**                                                                                                  | Works in React, Next.js (App and Pages Router), Remix / React Router, Vite, plus a framework-free `mount()` for Vue, Svelte, Angular, Shopify themes and plain HTML |
| **Hard to add new products**                                                                                           | Products are plain JSON manifests: a color for a lipstick, a `.glb` file for glasses. Load them inline, from a URL, or from your own API                            |

## How it works

```
Camera (getUserMedia)  ─┐
or uploaded photo       ├─> MediaPipe tracker (lazy)  ─> One Euro smoothing ─> anchors (pose, scale)
                        │     face / hand / pose / hair       (jitter free)        (core, pure TS)
                        │
                        └─> Renderer (lazy) ──────────────────────────────────────────┐
                              makeup + hair + 2D overlays: custom WebGL2 shaders       ├─> canvas on top of video
                              glasses, hats, earrings, watches, rings: three.js        ┘    capture to PNG/JPEG
```

1. **Tracking**: MediaPipe Face Landmarker (478 points plus a 3D head transform), Hand Landmarker, Pose Landmarker and the hair segmenter, all running in WebAssembly on the GPU with automatic CPU fallback.
2. **Anchoring**: pure TypeScript math in `@tryonit/core` turns landmarks into stable 3D poses (nose bridge for glasses, ear lobes for earrings, wrist frame for watches, finger segments for rings, torso quad for clothing) and smooths them with the One Euro filter.
3. **Rendering**: makeup uses luminance aware blending so skin and lip texture stay visible (matte, satin, gloss and shimmer finishes, teeth excluded). 3D accessories use invisible occluders (head, wrist, finger) so glasses temples and watch straps disappear behind you naturally.

Read the full design in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Features

| Category              | Asset `type`        | Tracking            | Rendering                                 | Status           |
| --------------------- | ------------------- | ------------------- | ----------------------------------------- | ---------------- |
| Lipstick, lip gloss   | `makeup.lips`       | Face                | WebGL2 (matte, satin, gloss, shimmer)     | Stable           |
| Blush                 | `makeup.blush`      | Face                | WebGL2                                    | Stable           |
| Eyeshadow             | `makeup.eyeshadow`  | Face                | WebGL2                                    | Stable           |
| Eyeliner (winged)     | `makeup.eyeliner`   | Face                | WebGL2                                    | Stable           |
| Brows                 | `makeup.brows`      | Face                | WebGL2                                    | Stable           |
| Foundation, skin tint | `makeup.foundation` | Face                | WebGL2 with texture smoothing             | Stable           |
| Full makeup look      | `makeup.look`       | Face                | WebGL2, layered                           | Stable           |
| Hair color            | `hair.color`        | Hair segmentation   | WebGL2                                    | Stable           |
| Glasses, sunglasses   | `glasses`           | Face + 3D head pose | three.js + head occlusion                 | Stable           |
| Hats, caps            | `hat`               | Face + 3D head pose | three.js + head occlusion                 | Stable           |
| Earrings              | `earrings`          | Face                | three.js, hides the far ear on head turns | Stable           |
| Face stickers, masks  | `face.overlay2d`    | Face                | WebGL2                                    | Stable           |
| Watches, bracelets    | `watch`             | Hand                | three.js + wrist occlusion                | Stable           |
| Rings                 | `ring`              | Hand                | three.js + finger occlusion               | Stable           |
| T-shirts, tops        | `clothing.top`      | Body pose           | WebGL2 homography warp                    | **Experimental** |

Plus: shade and variant switching, product switcher, intensity slider, before and after compare, photo capture, photo upload fallback, front and rear camera switching, dark mode, RTL, i18n, keyboard and screen reader support, debug landmark overlay and FPS HUD.

## Which projects is it for?

TryOnIt is useful anywhere a person wants to see a wearable product on themselves before deciding:

- **Beauty and cosmetics stores**: lipstick shade finders, foundation matching, eyeshadow palettes, complete makeup looks.
- **Eyewear and optical retailers**: prescription frames and sunglasses with realistic size and head occlusion.
- **Jewelry and watch brands**: earrings, rings and wrist watches on the shopper's own hand and ears.
- **Hats, caps and headwear shops**.
- **Hair color brands and salons**: preview a color before a box dye purchase or a salon booking.
- **Fashion and apparel (experimental)**: quick 2D t-shirt and top previews for campaigns and lookbooks.
- **Shopify, WooCommerce, BigCommerce and headless commerce storefronts** (React, Next.js, Hydrogen, Remix, or a plain script tag through `mount()`).
- **Marketplaces and D2C brands** that need try-on across many SKUs without per-SKU fees.
- **Marketing microsites and social campaigns**: branded face stickers and filters with photo sharing.
- **Agencies and freelancers** building try-on features for multiple clients under the MIT license.
- **Privacy sensitive products** (kids, health, regulated markets) where camera data must never leave the device.

## Packages

| Package                              | What it is                                                                                | Use it when                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`@tryonit/react`](./packages/react) | React components and hooks (`TryOnButton`, `TryOn`, `TryOnView`, `useTryOn`, ...)         | You use React, Next.js, Remix or React Router                            |
| [`@tryonit/web`](./packages/web)     | Browser engine plus a framework-free `mount()` UI                                         | You use Vue, Svelte, Angular, plain HTML or want full imperative control |
| [`@tryonit/core`](./packages/core)   | Zero dependency TypeScript core: manifest validation, state store, anchor math, smoothing | You build tooling, a custom renderer or (soon) React Native              |

## Quick start in 30 seconds

```bash
npm install @tryonit/react three
# or: pnpm add @tryonit/react three   |   yarn add @tryonit/react three
```

`three` is only needed for 3D products (glasses, hats, earrings, watches, rings). Makeup, hair color, stickers and clothing never download it.

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

export function ProductPage() {
  return <TryOnButton asset="/assets/aviator.json" />;
}
```

`/assets/aviator.json`:

```json
{
  "$schema": "https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json",
  "version": 1,
  "id": "aviator",
  "type": "glasses",
  "name": "Aviator",
  "model": "aviator.glb"
}
```

The camera needs a secure context: `https://` or `http://localhost`.

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

Step by step recipes for every type (beauty filters, stickers, 3D models, variants, hosting, Shopify and CMS loading, troubleshooting): **[Creating products and filters](./docs/CREATING_PRODUCTS.md)**.

## Implementation guide

### Step 1: Install

```bash
npm install @tryonit/react three      # React, Next.js, Remix
npm install @tryonit/web three        # Vue, Svelte, Angular, plain HTML
```

### Step 2: Describe your products as asset manifests

A manifest is JSON (or a JS object) with a `type` and a few fields. Colors for makeup, a `.glb` model for 3D items, a PNG for stickers and garments. Variants let one product carry several shades or styles.

```json
{
  "version": 1,
  "id": "velvet-lipstick",
  "type": "makeup.lips",
  "name": "Velvet Lipstick",
  "color": "#B0123A",
  "finish": "satin",
  "variants": [
    { "id": "ruby", "name": "Ruby", "swatch": "#B0123A" },
    {
      "id": "nude",
      "name": "Nude",
      "swatch": "#C48A7A",
      "overrides": { "color": "#C48A7A", "finish": "matte" }
    },
    {
      "id": "coral",
      "name": "Coral Gloss",
      "swatch": "#E2584D",
      "overrides": { "color": "#E2584D", "finish": "gloss" }
    }
  ],
  "meta": { "sku": "LIP-001", "price": 19 }
}
```

Every field, default and example is in [docs/MANIFEST_SPEC.md](./docs/MANIFEST_SPEC.md). Add the `$schema` line to get autocomplete and validation in VS Code. Modeling tips for glasses, watches and rings are in [docs/ASSET_AUTHORING.md](./docs/ASSET_AUTHORING.md).

### Step 3: Pass the asset in the way that fits your stack

```tsx
<TryOnButton asset={manifestObject} />                                   // inline object
<TryOnButton asset="https://cdn.example.com/tryon/aviator.json" />        // URL (relative files resolve against it)
<TryOnButton asset={(signal) => fetch(`/api/tryon/${sku}`, { signal }).then((r) => r.json())} />  // your API
```

Manifests are validated at runtime with readable errors such as `variants[2].color: Expected a color like #RRGGBB`.

### Step 4 (recommended for production): self host the models

By default models load from Google's CDN and the MediaPipe wasm from jsDelivr. For strict CSPs, offline kiosks or full control, copy them to your own server:

```tsx
<TryOnProvider engineOptions={{ modelBaseUrl: '/tryon/models', wasmBaseUrl: '/tryon/wasm' }}>
  <TryOnButton asset="/assets/aviator.json" />
</TryOnProvider>
```

`scripts/fetch-models.mjs` in this repo shows exactly which files to copy. See [docs/PRIVACY.md](./docs/PRIVACY.md).

### Step 5: Match your brand

```tsx
<TryOnProvider
  theme={{
    colors: { primary: '#7C3AED' },
    radius: 16,
    fontFamily: 'Inter, sans-serif',
    mode: 'auto',
  }}
  icons={{ capture: MyCameraIcon, close: MyCloseIcon }}
  labels={{ capture: 'Take photo', noFace: 'Look at the camera' }}
  images={{ loader: '/brand/loader.gif', logo: '/brand/logo.svg' }}
>
  <TryOn
    assets={[glasses, lipstick, cap]}
    defaultAssetId="aviator"
    layout="modal"
    classNames={{ root: 'my-root', toolbar: 'my-toolbar', captureButton: 'my-btn' }}
    slots={{ Toolbar: MyToolbar }}
    onCapture={(blob) => share(blob)}
    onError={(err) => track(err.code)}
  />
</TryOnProvider>
```

Escape hatches in order: `theme` prop, `classNames` per slot (Tailwind and CSS Modules friendly), `unstyled`, `slots` to replace sub components, and headless hooks. Details in [docs/THEMING.md](./docs/THEMING.md).

### Step 6 (optional): build a 100% custom UI with hooks

```tsx
import { TryOnProvider, useTryOn, useTryOnState } from '@tryonit/react';

function MyTryOn() {
  const { status, start, setAsset, capture, attach } = useTryOn();
  const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
  return <div ref={attach} style={{ height: 480 }} />;
}
```

### Step 7 (optional): preload and analytics

```tsx
<TryOnButton asset={asset} preload="hover" /> // warm models on hover (default), "visible" or "none"
```

```ts
engine.on('assetLoaded', (asset) => analytics.track('tryon_view', { sku: asset.meta?.sku }));
engine.on('capture', () => analytics.track('tryon_capture'));
engine.on('error', (err) => analytics.track('tryon_error', { code: err.code }));
```

TryOnIt itself never sends analytics. You decide what to track.

## Framework guides

<details>
<summary><b>Next.js (App Router)</b></summary>

Every TryOnIt export is a client component (the build adds `'use client'`), so you can import it straight into a Server Component page:

```tsx
// app/products/[id]/page.tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

export default function Product() {
  return <TryOnButton asset="/assets/aviator.json" />;
}
```

Passing a loader function (your API) requires a client component. See [`examples/nextjs-app`](./examples/nextjs-app).

</details>

<details>
<summary><b>Next.js (Pages Router)</b></summary>

Import the CSS in `pages/_app.tsx` and use the components in any page. They render a lightweight placeholder on the server and never touch `window` during render.

</details>

<details>
<summary><b>Remix / React Router v7</b></summary>

Use `TryOnButton` anywhere. For inline camera views, wrap them in a client only guard. See [`examples/remix-app`](./examples/remix-app).

</details>

<details>
<summary><b>Vue, Svelte, Angular, plain HTML, Shopify themes</b></summary>

```ts
import { mount } from '@tryonit/web';
import '@tryonit/web/styles.css';

const tryon = mount(document.querySelector('#tryon')!, {
  asset: '/assets/aviator.json',
  theme: { 'color-primary': '#0f766e' },
  onCapture: (blob) => console.log(blob),
});
// later: tryon.setAsset('/assets/round.json'); tryon.destroy();
```

Call `mount` in `onMounted` (Vue), `onMount` (Svelte) or `ngAfterViewInit` (Angular), and `destroy()` on unmount. See [`examples/vanilla-html`](./examples/vanilla-html).

</details>

<details>
<summary><b>Imperative engine (any framework)</b></summary>

```ts
import { createTryOnEngine } from '@tryonit/web';

const engine = createTryOnEngine({ container: el, performance: 'auto' });
await engine.setAsset('/assets/lipstick.json');
await engine.start();
engine.setVariant('nude');
const photo = await engine.capture({ type: 'image/jpeg', quality: 0.9 });
engine.destroy();
```

</details>

## Performance

| Bundle (min + gzip)                                                                 | Size          | Budget |
| ----------------------------------------------------------------------------------- | ------------- | ------ |
| `@tryonit/core`, typical import (validate + store + resolve)                        | about 5.9 KB  | 8 KB   |
| `@tryonit/core`, entire public API                                                  | about 12.9 KB | 14 KB  |
| `@tryonit/web` initial entry (MediaPipe, trackers, renderers and three.js are lazy) | about 22.6 KB | 25 KB  |
| `@tryonit/react`                                                                    | about 7.9 KB  | 15 KB  |
| `@tryonit/react/styles.css`                                                         | about 2.5 KB  | 6 KB   |

Budgets are enforced in CI with size-limit. Runtime: adaptive detection rate (30 fps, drops to 15 under load), detection on a downscaled frame, render on every animation frame, automatic pause when the tab is hidden, and full cleanup on `destroy()`. See [docs/PERFORMANCE.md](./docs/PERFORMANCE.md).

## Privacy

- Camera frames are processed on the device and are never uploaded.
- No analytics, cookies or telemetry.
- Network requests are limited to the model, wasm and asset files you configure. Self host all of them for zero third party requests.

Details in [docs/PRIVACY.md](./docs/PRIVACY.md).

## Browser support

| Browser                                  | Camera try-on | Notes                                       |
| ---------------------------------------- | ------------- | ------------------------------------------- |
| Chrome / Edge (desktop and Android) 111+ | Yes           | GPU delegate, best performance              |
| Firefox 115+                             | Yes           | CPU fallback on some drivers                |
| Safari macOS 16.4+                       | Yes           |                                             |
| Safari iOS / iPadOS 16.4+                | Yes           | All iOS browsers use WebKit. HTTPS required |
| Samsung Internet 22+                     | Yes           |                                             |

Minimum versions are targets derived from WebGL2, WebAssembly SIMD and `getUserMedia` support. Verify on your own device matrix with the manual QA checklist in [docs/LOCAL_TESTING.md](./docs/LOCAL_TESTING.md). WebGL2 and a secure context (HTTPS or localhost) are required. When the camera is unavailable or denied, shoppers can upload a photo instead.

## Documentation

| Topic                                                       | Link                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| **Create your own products and filters (formats, recipes)** | [docs/CREATING_PRODUCTS.md](./docs/CREATING_PRODUCTS.md) |
| Architecture, data flow, adding an asset type               | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)           |
| Asset manifest reference                                    | [docs/MANIFEST_SPEC.md](./docs/MANIFEST_SPEC.md)         |
| Theming and customization                                   | [docs/THEMING.md](./docs/THEMING.md)                     |
| Creating 3D and 2D assets                                   | [docs/ASSET_AUTHORING.md](./docs/ASSET_AUTHORING.md)     |
| Performance                                                 | [docs/PERFORMANCE.md](./docs/PERFORMANCE.md)             |
| Privacy and self hosting                                    | [docs/PRIVACY.md](./docs/PRIVACY.md)                     |
| Local development and testing (including on a phone)        | [docs/LOCAL_TESTING.md](./docs/LOCAL_TESTING.md)         |
| Dependency versions                                         | [docs/DEPENDENCIES.md](./docs/DEPENDENCIES.md)           |
| React Native plan                                           | [docs/REACT_NATIVE_PLAN.md](./docs/REACT_NATIVE_PLAN.md) |
| Publishing to npm (maintainers)                             | [docs/PUBLISHING.md](./docs/PUBLISHING.md)               |

## FAQ

**Is TryOnIt really free for commercial use?**
Yes. It is MIT licensed. Use it in commercial stores, client projects and SaaS products. MediaPipe (Apache 2.0) and its models are provided by Google: review the model cards for their terms.

**Does it need a backend or GPU server?**
No. Everything runs in the shopper's browser. You only host static files (manifests, models, images).

**Does it work on mobile?**
Yes, on iOS Safari 16.4+ and modern Android browsers, with front and rear camera switching.

**How accurate is the glasses size?**
TryOnIt estimates real world scale from the iris diameter (about 11.7 mm on average) and corrects the 3D head pose, so a 140 mm frame authored in millimeters looks proportionate. You can tune the constant.

**Can I use my own 3D models?**
Yes. Any glTF or GLB file in millimeters. Draco, Meshopt and KTX2 compression are supported. See [docs/ASSET_AUTHORING.md](./docs/ASSET_AUTHORING.md).

**Is the clothing try-on realistic?**
It is an experimental 2D overlay that warps a front facing garment image onto your torso. It is great for quick previews, not for fit. Photo real garment try-on needs server GPUs, which TryOnIt intentionally avoids.

**Can I use it with Vue, Svelte or Angular?**
Yes, through `@tryonit/web` and `mount()` or the imperative engine.

**What about React Native?**
The core is already platform agnostic. A native package is planned, see [docs/REACT_NATIVE_PLAN.md](./docs/REACT_NATIVE_PLAN.md).

## Roadmap

- [x] Web engine, React components, makeup, hair, glasses, hats, earrings, watches, rings, stickers
- [x] Experimental 2D clothing overlay
- [ ] Web Worker tracking mode (planned, see `trackers/tracker.interface.ts`)
- [ ] `@tryonit/react-native` with native MediaPipe, Skia and Filament ([plan](./docs/REACT_NATIVE_PLAN.md))
- [ ] Nail polish and contact lens asset types
- [ ] Multi product layering (lipstick and glasses at the same time)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), run the playground with `pnpm setup:examples && pnpm dev`, and read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before adding a new asset type.

## License

[MIT](./LICENSE). Sample assets in this repository are generated procedurally by `scripts/generate-sample-assets.mjs`, so they carry no third party licenses.

<sub>Keywords: virtual try-on, AR try-on, augmented reality, WebAR, virtual makeup, lipstick try-on, glasses try-on, sunglasses try-on, eyewear AR, jewelry try-on, earrings try-on, watch try-on, ring try-on, hat try-on, hair color try-on, clothing try-on, face tracking, hand tracking, MediaPipe, three.js, WebGL, React, Next.js, Remix, Vue, Svelte, Angular, Shopify, e-commerce, open source, privacy first, client side.</sub>
