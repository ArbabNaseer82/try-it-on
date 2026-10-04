# @tryonit/react

**React components and hooks for free, open-source, client-side virtual try-on.** Add a "Try it on" button to any product page and let shoppers see makeup, glasses, hats, earrings, watches, rings, hair color and clothing on themselves in real time. Works with React (Vite, CRA), Next.js (App and Pages Router) and Remix / React Router. No servers, no per-try fees, camera frames never leave the device.

```bash
npm install @tryonit/react three
```

`three` is only needed for 3D products (glasses, hats, earrings, watches, rings).

## Minimal example

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

export function Product() {
  return <TryOnButton asset="/assets/aviator.json" />;
}
```

No provider needed: `TryOnButton` and `TryOn` add one when none exists above them.

## Full control

```tsx
import { TryOn, TryOnProvider } from '@tryonit/react';

<TryOnProvider
  theme={{ colors: { primary: '#7C3AED' }, radius: 16, fontFamily: 'Inter, sans-serif' }}
  icons={{ capture: MyCameraIcon, close: MyCloseIcon }}
  labels={{ capture: 'Take photo', noFace: 'Look at the camera' }}
  images={{ loader: '/brand/loader.gif', logo: '/brand/logo.svg' }}
  engineOptions={{ performance: 'balanced', modelBaseUrl: '/models' }}
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
</TryOnProvider>;
```

## Headless

```tsx
import { TryOnProvider, useTryOn, useTryOnState } from '@tryonit/react';

function CustomTryOn() {
  const { status, start, setAsset, capture, attach } = useTryOn();
  const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
  return <div ref={attach} style={{ height: 480 }} />;
}

<TryOnProvider>
  <CustomTryOn />
</TryOnProvider>;
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

## Components

### `<TryOnProvider>`

| Prop            | Type                                                        | Description                                                                                      |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `theme`         | `ThemeInput`                                                | Colors, radius, spacing, fonts, mode (`light`, `dark`, `auto`). Becomes `--toi-*` CSS variables. |
| `icons`         | `Partial<Icons>`                                            | Replace any of the 12 built in icons.                                                            |
| `labels`        | `LabelsInput`                                               | Override any string, including error messages.                                                   |
| `images`        | `{ loader?, logo?, placeholder?, permissionIllustration? }` | Replace built in visuals.                                                                        |
| `engineOptions` | `TryOnEngineOptions`                                        | Passed to `createTryOnEngine` (see `@tryonit/web`).                                              |
| `dir`           | `'ltr' \| 'rtl'`                                            | Text direction.                                                                                  |
| `engine`        | `TryOnEngine \| () => TryOnEngine`                          | Bring your own engine (advanced, tests).                                                         |

### `<TryOn>`

All in one experience: camera view, status messages, product switcher, shade swatches, intensity, compare, capture preview with download and share. Accepts every `TryOnProvider` prop plus:

| Prop                    | Type                                  | Default              | Description                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asset`                 | `AssetSource`                         |                      | Single product (object, URL or async loader).                                                                                                                                                                                         |
| `assets`                | `AssetSource[]`                       |                      | Several products for the switcher.                                                                                                                                                                                                    |
| `defaultAssetId`        | `string`                              | first                | Product selected first.                                                                                                                                                                                                               |
| `layout`                | `'inline' \| 'modal' \| 'fullscreen'` | `'inline'`           | Where it renders.                                                                                                                                                                                                                     |
| `open` / `onOpenChange` | `boolean` / `(open) => void`          | `true`               | Dialog visibility for modal and fullscreen.                                                                                                                                                                                           |
| `title`                 | `string`                              | `labels.dialogTitle` | Dialog title.                                                                                                                                                                                                                         |
| `autoStart`             | `boolean`                             | `true`               | Start the camera on mount. When false a permission prompt is shown.                                                                                                                                                                   |
| `unstyled`              | `boolean`                             | `false`              | Remove visual styles, keep layout and accessibility.                                                                                                                                                                                  |
| `classNames`            | `TryOnClassNames`                     |                      | Class per slot: `root`, `stage`, `toolbar`, `captureButton`, `cameraSwitch`, `compareButton`, `uploadButton`, `productSwitcher`, `swatches`, `intensity`, `status`, `permission`, `preview`, `compare`, `modal`, `backdrop`, `badge`. |
| `slots`                 | `Partial<TryOnSlots>`                 |                      | Replace `Toolbar`, `CaptureButton`, `StatusOverlay`, `ProductSwitcher`, `Loader`.                                                                                                                                                     |
| `showCompare`           | `boolean`                             | makeup and hair      | Before and after toggle.                                                                                                                                                                                                              |
| `showIntensity`         | `boolean`                             | makeup and hair      | Intensity slider.                                                                                                                                                                                                                     |
| `showUpload`            | `boolean`                             | `true`               | Photo upload button.                                                                                                                                                                                                                  |
| `showCapturePreview`    | `boolean`                             | `true`               | Preview with download and share after capture.                                                                                                                                                                                        |
| `onCapture`             | `(blob: Blob) => void`                |                      | Called with the captured photo.                                                                                                                                                                                                       |
| `onError`               | `(error: TryOnError) => void`         |                      | Every error, with a stable `code`.                                                                                                                                                                                                    |
| `onAssetChange`         | `(asset) => void`                     |                      | Called when a product is loaded.                                                                                                                                                                                                      |
| `className`, `style`    |                                       |                      | Root element.                                                                                                                                                                                                                         |

### `<TryOnButton>`

Opens `<TryOn>` in a dialog. Accepts every `TryOn` prop plus:

| Prop              | Type                             | Default       | Description                            |
| ----------------- | -------------------------------- | ------------- | -------------------------------------- |
| `children`        | `ReactNode`                      | `labels.open` | Button content.                        |
| `layout`          | `'modal' \| 'fullscreen'`        | `'modal'`     | Dialog style.                          |
| `preload`         | `'hover' \| 'visible' \| 'none'` | `'hover'`     | When to warm models in the background. |
| `buttonClassName` | `string`                         |               | Class for the trigger button.          |
| `buttonProps`     | button attributes                |               | Extra attributes for the trigger.      |

### Building blocks

| Component               | Purpose                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `TryOnView`             | Camera and canvas stage only. Props: `autoStart`, `asset`, `stopOnUnmount`, `className`, `stageClassName`, `style`, `children` (overlays). |
| `TryOnModal`            | Accessible dialog: focus trap, Escape, focus return, scroll lock. Props: `open`, `onClose`, `title`, `fullscreen`, `unstyled`.             |
| `ProductSwitcher`       | Radio group of products with arrow key navigation. Props: `assets`, `selectedId`, `onSelect`.                                              |
| `ShadeSwatches`         | Variant picker for the current asset.                                                                                                      |
| `CaptureButton`         | Shutter button. Props: `options`, `onCapture`, `onError`.                                                                                  |
| `CameraSwitch`          | Front and rear camera toggle (hidden in photo mode).                                                                                       |
| `CompareSlider`         | Before and after split view. Props: `defaultValue` (percent).                                                                              |
| `IntensitySlider`       | Makeup and hair strength.                                                                                                                  |
| `StatusOverlay`         | Loading, hints, errors with retry and photo fallback, live region. Props: `hintDelayMs`, `Loader`.                                         |
| `PermissionPrompt`      | Camera explanation with start and upload buttons.                                                                                          |
| `CapturePreview`        | Captured photo with retake, download and share.                                                                                            |
| `PhotoUpload`, `Loader` | Small shared pieces.                                                                                                                       |

## Hooks

| Hook                                | Returns                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTryOn()`                        | `{ state, status, error, asset, attach, getEngine, start, startFromImage, stop, setAsset, setVariant, setIntensity, switchCamera, capture, pause, resume, setCompare }` |
| `useTryOnState(selector, isEqual?)` | The selected slice of `SessionState`. Re-renders only when it changes. Use `shallowEqual` for objects.                                                                  |
| `useCamera()`                       | `{ facing, source, mirrored, isCamera, switchCamera }`                                                                                                                  |
| `useAsset(source?)`                 | `{ asset, loading, variantId, error, setVariant }`, loads `source` when provided.                                                                                       |
| `useCapture()`                      | `{ capture(options?), last: { blob, url } \| null, clear }` (object URLs are revoked for you).                                                                          |

`SessionState`: `status`, `error`, `asset`, `assetLoading`, `variantId`, `intensity`, `camera { facing, source, mirrored }`, `tracking { faceVisible, handVisible, bodyVisible }`, `perf { fps, detectionMs, renderMs, detectionRate }`, `modules`.

## Theming exports

`defaultTheme`, `themeToCssVars(theme)`, `defaultIcons`, `defaultLabels`, `mergeLabels(labels)`, `cx(...classNames)` and the types `Theme`, `ThemeInput`, `Icons`, `IconProps`, `Labels`, `LabelsInput`. Full guide: [docs/THEMING.md](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/THEMING.md).

## SSR

Every module ships with `'use client'`. Components never read `window` or `navigator` during render, render a lightweight placeholder on the server, and create the engine only in effects. Next.js App Router pages can import them directly.

## Errors

`TryOnError.code` is one of `INSECURE_CONTEXT`, `CAMERA_DENIED`, `CAMERA_NOT_FOUND`, `CAMERA_IN_USE`, `WEBGL_UNSUPPORTED`, `MODEL_LOAD_FAILED`, `ASSET_INVALID`, `ASSET_LOAD_FAILED`, `TRACKER_FAILED`, `UNKNOWN`. `error.retryable` and `error.canUsePhotoFallback` drive the default UI.

## More

- Create your own products and filters: [docs/CREATING_PRODUCTS.md](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/CREATING_PRODUCTS.md)
- Manifest reference: [docs/MANIFEST_SPEC.md](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/MANIFEST_SPEC.md)
- Engine options and `mount()`: [`@tryonit/web`](https://github.com/ArbabNaseer82/try-it-on/tree/main/packages/web)
- Main README: [TryOnIt](https://github.com/ArbabNaseer82/try-it-on)

MIT licensed.
