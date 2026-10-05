# @tryonit/react-native

**Virtual try-on for React Native and Expo.** Let shoppers see lipstick, beauty filters, face stickers, glasses, sunglasses, hats, earrings, watches, rings and hair color on themselves with the phone camera. One package for **Expo Go, Expo dev builds and bare React Native**, using the same product manifests as [TryOnIt for the web](https://github.com/ArbabNaseer82/try-it-on). Free, open source (MIT), and private: camera frames are processed on the device and never uploaded.

```tsx
import { TryOnButton } from '@tryonit/react-native';

<TryOnButton asset="https://cdn.example.com/tryon/aviator.json" />;
```

## How it works

The package renders a `react-native-webview` that runs the TryOnIt engine (MediaPipe face, hand and hair tracking, WebGL makeup shaders, three.js for 3D products). The TryOnIt code is embedded in the package. MediaPipe and three.js are loaded lazily from a CDN the first time they are needed (three.js only for 3D products), then cached by the WebView. Your app talks to the camera view through a typed message bridge: props, a `ref` API, and events.

Because it only needs `react-native-webview`, it works in **Expo Go** without a custom native build.

## Requirements

|                      | Minimum                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| iOS                  | 16.4 (WebKit import maps and WebAssembly SIMD)                                          |
| Android              | 8.0 with an up to date Android System WebView (Chrome 111 or newer)                     |
| React Native         | 0.73 or newer                                                                           |
| Expo                 | SDK 50 or newer (tested with SDK 57)                                                    |
| react-native-webview | 13 or newer                                                                             |
| Network              | Needed the first time to load MediaPipe, models and three.js, unless you self host them |

## Install

### Expo (Expo Go or dev builds)

```bash
npx expo install @tryonit/react-native react-native-webview
```

Expo Go already includes the WebView and the camera permission, so you can try it immediately with `npx expo start`.

For development builds and store builds, add the config plugin to `app.json` so the camera permission is added to your native projects:

```json
{
  "expo": {
    "plugins": [
      [
        "@tryonit/react-native",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to use the camera so you can try products on."
        }
      ]
    ]
  }
}
```

Then rebuild: `npx expo prebuild` or `eas build`.

### Bare React Native

```bash
npm install @tryonit/react-native react-native-webview
cd ios && pod install
```

iOS `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Allow the camera so you can try products on.</string>
```

Android `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## Quick start

### 1. Drop in button

```tsx
import { TryOnButton } from '@tryonit/react-native';

export function ProductScreen() {
  return (
    <TryOnButton
      asset="https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/glasses-aviator.json"
      title="Aviator Sunglasses"
      theme={{ colors: { primary: '#0f766e' }, radius: 12 }}
      onCapture={(photo) => console.log(photo.width, photo.height)}
      onError={(error) => console.warn(error.code, error.message)}
    />
  );
}
```

The button asks for camera permission on Android, then opens a full screen modal (a page sheet on iOS) with the camera, a shutter, a camera switch, a photo upload fallback and status messages such as "Look at the camera".

### 2. Inline view

```tsx
import { TryOnView } from '@tryonit/react-native';

const lipstick = {
  version: 1,
  id: 'ruby',
  type: 'makeup.lips',
  color: '#B0123A',
  finish: 'satin',
  variants: [
    { id: 'ruby', name: 'Ruby', swatch: '#B0123A' },
    { id: 'nude', name: 'Nude', swatch: '#C48A7A', overrides: { color: '#C48A7A' } },
  ],
} as const;

<TryOnView asset={lipstick} style={{ flex: 1 }} />;
```

### 3. Your own UI (headless)

```tsx
import { useState } from 'react';
import { Button, Image, View } from 'react-native';
import { TryOnView, useTryOn, type TryOnPhoto } from '@tryonit/react-native';

export function CustomTryOn() {
  const tryOn = useTryOn();
  const [photo, setPhoto] = useState<TryOnPhoto | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <TryOnView {...tryOn.viewProps} controls="none" asset={lipstick} />
      <Button title="Nude" onPress={() => tryOn.setVariant('nude')} />
      <Button title="Flip camera" onPress={() => tryOn.switchCamera()} />
      <Button title="Snap" onPress={async () => setPhoto(await tryOn.capture())} />
      {photo && <Image source={{ uri: photo.dataUrl }} style={{ width: 120, height: 160 }} />}
    </View>
  );
}
```

`tryOn.state` mirrors the camera session: `status`, `error`, `asset`, `variantId`, `intensity`, `camera`, `tracking.faceVisible`, `tracking.handVisible`, `perf`.

## Products and filters

Products are the same JSON **asset manifests** as on the web:

| You want                                                | `type`                                        | File you provide                |
| ------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| Lipstick, blush, eyeshadow, eyeliner, brows, foundation | `makeup.*`                                    | none, only colors               |
| Beauty filter (complete makeup look)                    | `makeup.look`                                 | none                            |
| Hair color                                              | `hair.color`                                  | none                            |
| Fun face filter, sticker, mask                          | `face.overlay2d`                              | PNG with transparent background |
| Glasses, hats, earrings, watches, rings                 | `glasses`, `hat`, `earrings`, `watch`, `ring` | GLB 3D model in millimeters     |

React Native specifics:

- Pass a manifest **object**, an **absolute `https://` URL** to a manifest, or an **async loader** (`(signal) => fetch(...).then((r) => r.json())`). Relative URLs such as `/assets/x.json` do not exist in React Native.
- Files referenced from a manifest loaded by URL may be relative to that URL (`"model": "aviator.glb"`). Files in manifest objects must be absolute URLs.
- Files on your CDN need CORS (`Access-Control-Allow-Origin: *`).
- Validate before shipping: `npx -p @tryonit/core tryonit-validate ./tryon`.

Full recipes (beauty filters, stickers, 3D models, variants, hosting, Shopify and CMS loading): **[Creating products and filters](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/CREATING_PRODUCTS.md)**. Field reference: [MANIFEST_SPEC.md](https://github.com/ArbabNaseer82/try-it-on/blob/main/docs/MANIFEST_SPEC.md).

Ready made samples you can use while developing (served by jsDelivr from GitHub):

```
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/lipstick.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/look.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/hair.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/glasses-aviator.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/glasses-round.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/earrings.json
https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/moustache.json
```

## API

### `<TryOnView>`

| Prop                | Type                                           | Default   | Description                                                                                                                                                               |
| ------------------- | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asset`             | `AssetSource \| null`                          |           | Manifest object, absolute URL or async loader. Changing it swaps the product.                                                                                             |
| `controls`          | `'web' \| 'none'`                              | `'web'`   | Built in shutter, camera switch, photo upload and messages, or camera only.                                                                                               |
| `autoStart`         | `boolean`                                      | `true`    | Open the camera when ready.                                                                                                                                               |
| `engineOptions`     | `EngineOptions`                                |           | `modelBaseUrl`, `wasmBaseUrl`, `models`, `camera { facing, width, height }`, `performance`, `mirror`, `fit`, `debug`, `delegate`, `smoothing`, `irisDiameterMm`, `three`. |
| `theme`             | `ThemeInput`                                   |           | `colors` (primary, onPrimary, surface, onSurface, overlay, danger, success, muted), `radius`, `fontFamily`, `fontSize`. Same tokens as `@tryonit/react`.                  |
| `labels`            | `Partial<TryOnLabels>`                         | English   | Texts of the built in controls (`capture`, `switchCamera`, `uploadPhoto`, `retry`, `loading`, `noFace`, `noHand`, `noBody`, `cameraDenied`, ...).                         |
| `captureOptions`    | `{ type?, quality?, mirror? }`                 | JPEG, 0.9 | Default photo format.                                                                                                                                                     |
| `cdn`               | `{ mediapipeUrl?, threeBaseUrl?, importMap? }` | jsDelivr  | Self host MediaPipe and three.js.                                                                                                                                         |
| `pauseInBackground` | `boolean`                                      | `true`    | Pause tracking while the app is in the background.                                                                                                                        |
| `style`             | `ViewStyle`                                    | `flex: 1` |                                                                                                                                                                           |
| `webViewProps`      | `WebViewProps`                                 |           | Extra WebView props (advanced).                                                                                                                                           |
| `onReady`           | `() => void`                                   |           | The camera page is loaded.                                                                                                                                                |
| `onStateChange`     | `(state: TryOnState) => void`                  |           | Every state change.                                                                                                                                                       |
| `onStatusChange`    | `(status) => void`                             |           | `idle`, `checking`, `requesting-camera`, `loading-models`, `ready`, `running`, `paused`, `error`.                                                                         |
| `onError`           | `(error: TryOnErrorInfo) => void`              |           | `{ code, message, retryable, canUsePhotoFallback }`.                                                                                                                      |
| `onAssetLoaded`     | `(asset) => void`                              |           | A product finished loading.                                                                                                                                               |
| `onCapture`         | `(photo: TryOnPhoto) => void`                  |           | Photos taken with the built in shutter.                                                                                                                                   |
| `onLog`             | `(level, message) => void`                     |           | Diagnostics from the page.                                                                                                                                                |

### Ref methods (`ref` on `TryOnView`, or `useTryOn()`)

| Method                         | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| `start()`, `stop()`            | Open or release the camera.                             |
| `pause()`, `resume()`          | Pause tracking.                                         |
| `setAsset(source)`             | Swap the product. Resolves with the validated manifest. |
| `setVariant(id)`               | Shade, color or style.                                  |
| `setIntensity(0..1)`           | Makeup and hair strength.                               |
| `switchCamera()`               | Front and rear camera.                                  |
| `setCompare(position \| null)` | Before and after split, 0..1 from the left.             |
| `setDebug(enabled)`            | Landmark overlay and FPS HUD.                           |
| `capture(options?)`            | `Promise<TryOnPhoto>`.                                  |
| `getState()`                   | Latest `TryOnState`.                                    |

### `TryOnPhoto`

```ts
{
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}
```

`dataUrl` works directly in `<Image source={{ uri: photo.dataUrl }} />`. Save or share it, for example with Expo:

```ts
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const file = new File(Paths.cache, 'try-on.jpg');
file.write(photo.base64, { encoding: 'base64' });
await Sharing.shareAsync(file.uri);
```

### `<TryOnButton>` and `<TryOnModal>`

`TryOnButton` accepts every `TryOnView` prop plus `label`, `children`, `buttonStyle`, `textStyle`, `disabled`, `title`, `closeLabel`, `requestPermission` (default `true`) and `onOpenChange`. `TryOnModal` accepts every `TryOnView` prop plus `visible`, `onClose`, `title`, `closeLabel`, `headerStyle`.

### Other exports

`requestCameraPermission()`, `resolveNativeAsset()`, `validateManifest()`, `safeValidateManifest()`, `ErrorCode`, `TryOnError`, `themeToCssVars()`, `createTryOnHtml()` and `createImportMap()` (advanced: host the page yourself), `RUNTIME_VERSIONS`, and all types.

## Self hosting (no third party requests)

```tsx
<TryOnView
  asset={asset}
  engineOptions={{
    modelBaseUrl: 'https://cdn.my-shop.com/tryon/models',
    wasmBaseUrl: 'https://cdn.my-shop.com/tryon/wasm',
  }}
  cdn={{
    mediapipeUrl: 'https://cdn.my-shop.com/tryon/mediapipe/vision_bundle.mjs',
    threeBaseUrl: 'https://cdn.my-shop.com/tryon/three',
  }}
/>
```

Copy `@mediapipe/tasks-vision` (`vision_bundle.mjs` and `wasm/`), the four model files and the `three` package (`build/` and `examples/`) to your CDN with CORS enabled. `RUNTIME_VERSIONS` tells you which versions this build expects.

## Privacy

Camera frames stay on the device. TryOnIt sends no analytics. The only network requests are the library, model and product files listed above. Photos leave the device only if your code sends them.

## Troubleshooting

| Problem                                | Fix                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Black view, nothing loads              | Check the device: iOS 16.4 or newer, Android System WebView up to date. Pass `onLog` to see page errors.                                                               |
| `CAMERA_DENIED`                        | The user refused the permission. The built in UI offers a photo upload. On Android call `requestCameraPermission()` before showing the view (`TryOnButton` does this). |
| Works in Expo Go but not in your build | Add the config plugin (or the Info.plist and AndroidManifest entries) and rebuild.                                                                                     |
| Product does not load                  | Use absolute `https://` URLs, enable CORS on your CDN, and run `npx -p @tryonit/core tryonit-validate`.                                                                |
| Android emulator shows no face         | Configure the emulator camera to use your webcam, or test on a real device.                                                                                            |
| Slow on older phones                   | `engineOptions={{ performance: 'battery' }}`.                                                                                                                          |

## Limits and roadmap

This package runs the engine in a WebView: it works everywhere React Native runs, including Expo Go, and shares 100% of its behavior with the web packages. A fully native engine (VisionCamera, native MediaPipe, Skia and Filament) is on the roadmap, behind the same API.

MIT licensed.
