# TryOnIt

Open source virtual try-on for the web, React and React Native.

Shoppers see makeup, glasses, hats, earrings, watches, rings and hair color on themselves, live, through the camera of their phone or laptop. Everything runs on the device: no servers to pay for, no per-try fees, and camera frames never leave the browser.

[![npm](https://img.shields.io/npm/v/@tryonit/react?label=%40tryonit%2Freact)](https://www.npmjs.com/package/@tryonit/react)
[![npm](https://img.shields.io/npm/v/@tryonit/react-native?label=%40tryonit%2Freact-native)](https://www.npmjs.com/package/@tryonit/react-native)
[![CI](https://github.com/ArbabNaseer82/try-it-on/actions/workflows/ci.yml/badge.svg)](https://github.com/ArbabNaseer82/try-it-on/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[Packages](#packages) · [Quick start](#quick-start) · [Frameworks](#framework-setup) · [Products](#products-and-asset-manifests) · [Customizing](#customizing-the-ui) · [Going to production](#going-to-production) · [Docs](#documentation) · [Video walkthrough](#video-walkthrough)

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

<TryOnButton asset="/tryon/aviator.json" />;
```

That one button gives you the whole flow: camera permission, loading states, "look at the camera" hints, shade and product switching, before and after compare, photo capture with download and share, and a photo upload fallback when the camera is blocked.

## Packages

| Package                                            | Install it when                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@tryonit/react`](./packages/react)               | You use React, Next.js, Remix or React Router                                                            |
| [`@tryonit/react-native`](./packages/react-native) | You build an iOS or Android app with Expo (Expo Go included) or bare React Native                        |
| [`@tryonit/web`](./packages/web)                   | You use Vue, Svelte, Angular, plain HTML, a Shopify theme, or want the imperative engine                 |
| [`@tryonit/core`](./packages/core)                 | You build tooling or a custom renderer. Zero dependencies: manifest validation, state store, anchor math |

You only install one of the first three. They pull in the lower layers themselves.

## Quick start

```bash
npm install @tryonit/react three
```

`three` is only loaded for 3D products (glasses, hats, earrings, watches, rings). Makeup, hair color and stickers never download it, so you can skip it if you only sell those.

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

export function ProductPage() {
  return <TryOnButton asset="/tryon/aviator.json" />;
}
```

Put the product description next to its model in `public/tryon/`:

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

The camera only works in a secure context, so use `https://` or `http://localhost` while developing.

Want something to try first? Clone the repo and run the playground, it ships with sample products:

```bash
pnpm install && pnpm setup:examples && pnpm dev   # http://localhost:5173
```

## Framework setup

### Next.js (App Router)

Every export is already a client component (`'use client'` is added at build time), so you can use it straight from a Server Component page:

```tsx
// app/products/[id]/page.tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

export default function Product() {
  return <TryOnButton asset="/tryon/aviator.json" />;
}
```

Passing a loader function (for example, fetching the manifest from your API) needs a client component of your own. See [`examples/nextjs-app`](./examples/nextjs-app).

**Pages Router:** import the CSS in `pages/_app.tsx` and use the components in any page. They render a light placeholder on the server and never touch `window` during render.

### Remix / React Router v7

`TryOnButton` works anywhere. Inline camera views should sit inside a client only guard. Load the CSS through `links`:

```tsx
import { TryOnButton } from '@tryonit/react';
import styles from '@tryonit/react/styles.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export default function Product() {
  return <TryOnButton asset="/tryon/aviator.json" />;
}
```

See [`examples/remix-app`](./examples/remix-app).

### React Native and Expo

```bash
npx expo install @tryonit/react-native react-native-webview
# bare React Native:
npm install @tryonit/react-native react-native-webview && cd ios && pod install
```

```tsx
import { TryOnButton } from '@tryonit/react-native';

export default function Product() {
  return (
    <TryOnButton
      asset="https://cdn.example.com/tryon/aviator.json"
      onCapture={(photo) => save(photo.base64)}
    />
  );
}
```

It works in Expo Go as is. For your own builds, add `"plugins": ["@tryonit/react-native"]` to `app.json` so the camera permissions are set. Use absolute `https://` URLs for products on mobile. Full API in the [package README](./packages/react-native) and a working app in [`examples/expo-app`](./examples/expo-app).

### Vue, Svelte, Angular, plain HTML

```bash
npm install @tryonit/web three
```

```ts
import { mount } from '@tryonit/web';
import '@tryonit/web/styles.css';

const tryon = mount(document.querySelector('#tryon')!, {
  asset: '/tryon/aviator.json',
  theme: { 'color-primary': '#0f766e' },
  onCapture: (blob) => console.log(blob),
});

// later
tryon.setAsset('/tryon/round.json');
tryon.destroy();
```

Call `mount` in `onMounted` (Vue), `onMount` (Svelte) or `ngAfterViewInit` (Angular), and `destroy()` when the component unmounts. See [`examples/vanilla-html`](./examples/vanilla-html).

### Imperative engine

For full control without any UI:

```ts
import { createTryOnEngine } from '@tryonit/web';

const engine = createTryOnEngine({ container: el, performance: 'auto' });
await engine.setAsset('/tryon/lipstick.json');
await engine.start();
engine.setVariant('nude');
const photo = await engine.capture({ type: 'image/jpeg', quality: 0.9 });
engine.destroy();
```

## Products and asset manifests

Each product is a small JSON file (or a JS object) called an asset manifest. Makeup and hair only need colors. 3D products point to a GLB model, stickers to a PNG.

| Product                                       | `type`                                                                                     | Tracking              | You provide            | Status       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------- | ---------------------- | ------------ |
| Lipstick, lip gloss                           | `makeup.lips`                                                                              | Face                  | colors                 | Stable       |
| Blush, eyeshadow, eyeliner, brows, foundation | `makeup.blush`, `makeup.eyeshadow`, `makeup.eyeliner`, `makeup.brows`, `makeup.foundation` | Face                  | colors                 | Stable       |
| Full makeup look                              | `makeup.look`                                                                              | Face                  | colors                 | Stable       |
| Hair color                                    | `hair.color`                                                                               | Hair segmentation     | a color                | Stable       |
| Glasses, sunglasses                           | `glasses`                                                                                  | Face and head pose    | GLB in millimeters     | Stable       |
| Hats, caps                                    | `hat`                                                                                      | Face and head pose    | GLB in millimeters     | Stable       |
| Earrings                                      | `earrings`                                                                                 | Face                  | GLB in millimeters     | Stable       |
| Face stickers, masks                          | `face.overlay2d`                                                                           | Face                  | transparent PNG        | Stable       |
| Watches, bracelets                            | `watch`                                                                                    | Hand                  | GLB in millimeters     | Stable       |
| Rings                                         | `ring`                                                                                     | Hand                  | GLB in millimeters     | Stable       |
| T-shirts, tops                                | `clothing.top`                                                                             | Body pose and outline | PNG and 4 to 11 points | Experimental |

A lipstick with three shades:

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

A sticker:

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

Pass a manifest in whichever way suits your app:

```tsx
<TryOnButton asset={manifestObject} />                                   // inline object
<TryOnButton asset="https://cdn.example.com/tryon/aviator.json" />        // URL, relative files resolve against it
<TryOnButton asset={(signal) => fetch(`/api/tryon/${sku}`, { signal }).then((r) => r.json())} />  // your API
```

Manifests are validated at runtime with readable errors, for example `variants[2].color: Expected a color like #RRGGBB`. Check your files before you ship:

```bash
npx -p @tryonit/core tryonit-validate public/tryon
```

Step by step recipes for every product type, Blender export settings, hosting and loading from a CMS or Shopify are in [docs/CREATING_PRODUCTS.md](./docs/CREATING_PRODUCTS.md). Every field is listed in [docs/MANIFEST_SPEC.md](./docs/MANIFEST_SPEC.md).

## Customizing the UI

Theme tokens, icons, labels and images go on the provider. Layout, class names and replaced sub components go on `TryOn`:

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
    onError={(err) => console.warn(err.code)}
  />
</TryOnProvider>
```

From least to most control: the `theme` prop, `classNames` per slot (works with Tailwind and CSS Modules), `unstyled`, `slots`, and finally the headless hooks for a completely custom UI:

```tsx
import { useTryOn, useTryOnState } from '@tryonit/react';

function MyTryOn() {
  const { status, start, setAsset, capture, attach } = useTryOn();
  const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
  return <div ref={attach} style={{ height: 480 }} />;
}
```

More in [docs/THEMING.md](./docs/THEMING.md).

## Going to production

- **Serve over HTTPS.** Browsers only open the camera on secure pages.
- **Self host the models** if you have a strict CSP, run offline kiosks, or want zero third party requests. By default the MediaPipe models load from Google's CDN and the wasm from jsDelivr:

  ```tsx
  <TryOnProvider engineOptions={{ modelBaseUrl: '/tryon/models', wasmBaseUrl: '/tryon/wasm' }}>
  ```

  [`scripts/fetch-models.mjs`](./scripts/fetch-models.mjs) shows exactly which files to copy. See [docs/PRIVACY.md](./docs/PRIVACY.md).

- **Preload** so the try-on opens instantly: `<TryOnButton preload="hover" />` (the default), `"visible"` or `"none"`.
- **Keep models small.** GLB files under 1 MB with Meshopt or Draco compression, in millimeters. See [docs/ASSET_AUTHORING.md](./docs/ASSET_AUTHORING.md).
- **Track what you need.** TryOnIt sends no analytics. Hook into its events instead:

  ```ts
  engine.on('assetLoaded', (asset) => analytics.track('tryon_view', { sku: asset.meta?.sku }));
  engine.on('capture', () => analytics.track('tryon_capture'));
  engine.on('error', (err) => analytics.track('tryon_error', { code: err.code }));
  ```

## How it works

```
Camera or uploaded photo
  -> MediaPipe tracking (face, hands, body, hair), loaded on demand
  -> anchors in @tryonit/core: pose, real world scale, One Euro smoothing
  -> rendering: WebGL2 shaders for makeup, hair and stickers, three.js for 3D products
  -> canvas over the video, capture to PNG or JPEG
```

- Face tracking uses 478 landmarks plus a 3D head transform, on the GPU with an automatic CPU fallback.
- Glasses are sized from the iris diameter, so a 140 mm frame modeled in millimeters looks the right size.
- Makeup blends with the skin's own luminance, so lip and skin texture stay visible and teeth are left alone.
- 3D products use invisible head, wrist and finger occluders, so temples and straps disappear behind you naturally.

The full design is in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Performance

| Bundle (min + gzip)                                                            | Size          | Budget |
| ------------------------------------------------------------------------------ | ------------- | ------ |
| `@tryonit/core`, typical import                                                | about 5.9 KB  | 8 KB   |
| `@tryonit/web` initial entry (trackers, renderers and three.js load on demand) | about 23.5 KB | 25 KB  |
| `@tryonit/react`                                                               | about 7.9 KB  | 15 KB  |
| `@tryonit/react/styles.css`                                                    | about 2.5 KB  | 6 KB   |

Budgets are checked in CI. At runtime, detection runs at 30 fps and drops to 15 under load, the loop pauses when the tab is hidden, and `destroy()` releases the camera and GPU memory. Details in [docs/PERFORMANCE.md](./docs/PERFORMANCE.md).

## Browser support

| Browser                                    | Notes                                       |
| ------------------------------------------ | ------------------------------------------- |
| Chrome and Edge 111+ (desktop and Android) | GPU delegate, best performance              |
| Firefox 115+                               | CPU fallback on some drivers                |
| Safari 16.4+ (macOS, iOS, iPadOS)          | All iOS browsers use WebKit. HTTPS required |
| Samsung Internet 22+                       |                                             |

WebGL2 is required. When the camera is unavailable or denied, shoppers can upload a photo instead.

## Privacy

Camera frames are processed on the device and never uploaded. There is no analytics, cookie or telemetry code. The only network requests are the model, wasm and product files you configure, and you can self host all of them. More in [docs/PRIVACY.md](./docs/PRIVACY.md).

## Documentation

| Topic                                       | Link                                                     |
| ------------------------------------------- | -------------------------------------------------------- |
| Creating products and filters               | [docs/CREATING_PRODUCTS.md](./docs/CREATING_PRODUCTS.md) |
| Manifest reference                          | [docs/MANIFEST_SPEC.md](./docs/MANIFEST_SPEC.md)         |
| 3D and 2D asset authoring                   | [docs/ASSET_AUTHORING.md](./docs/ASSET_AUTHORING.md)     |
| Theming and customization                   | [docs/THEMING.md](./docs/THEMING.md)                     |
| Architecture and adding a product type      | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)           |
| Performance                                 | [docs/PERFORMANCE.md](./docs/PERFORMANCE.md)             |
| Privacy and self hosting                    | [docs/PRIVACY.md](./docs/PRIVACY.md)                     |
| Running the examples and testing on a phone | [docs/LOCAL_TESTING.md](./docs/LOCAL_TESTING.md)         |

Each package also has its own README with the full API: [react](./packages/react), [react-native](./packages/react-native), [web](./packages/web), [core](./packages/core).

## FAQ

**Can I use it in a commercial store?**
Yes. TryOnIt is MIT licensed. MediaPipe is Apache 2.0, and its models are provided by Google, so check their model cards for terms.

**Do I need a backend?**
No. You only host static files: manifests, models and images.

**Can I use my own 3D models?**
Yes, any glTF or GLB in millimeters. Draco, Meshopt and KTX2 compression are supported.

**How good is the clothing try-on?**
It is experimental and 2D: a front facing garment photo is fitted to your shoulders, arms, waist and body outline, and picks up the light and folds of what you have on. Good for previews and campaigns, not for checking size.

**Does it work on phones?**
Yes. On the web it runs in iOS Safari 16.4+ and modern Android browsers, with front and rear camera switching. For native apps, use `@tryonit/react-native`.

## Roadmap

- [x] Web engine and React components: makeup, hair, glasses, hats, earrings, watches, rings, stickers
- [x] `@tryonit/react-native` for Expo Go, Expo dev builds and bare React Native
- [x] Experimental 2D clothing overlay
- [ ] Tracking in a Web Worker
- [ ] Fully native React Native engine behind the same API
- [ ] Nail polish and contact lenses
- [ ] Several products at once (lipstick and glasses together)

## Contributing

Bug reports, product type ideas and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) explains the setup, branch and commit naming, and how a change gets released to npm.

## Video walkthrough

A short video that shows the packages, how to install and use them in React, Next.js, Remix and React Native, and how to create your own products:

[![Add Virtual Try-On to React, Next.js, Remix or React Native in Minutes](https://img.youtube.com/vi/YaXDyYEVqko/maxresdefault.jpg)](https://youtu.be/YaXDyYEVqko)

[Watch on YouTube](https://youtu.be/YaXDyYEVqko)

## License

[MIT](./LICENSE). The sample products in this repository are generated by [`scripts/generate-sample-assets.mjs`](./scripts/generate-sample-assets.mjs), so they carry no third party licenses.
