# Privacy

TryOnIt is designed for privacy sensitive products.

## What happens to camera frames

- Frames are read from `getUserMedia` into a `<video>` element and processed **on the device** by MediaPipe (WebAssembly and WebGL).
- Frames are never uploaded, stored or sent anywhere by TryOnIt.
- Captured photos are created in the browser as a `Blob` and only leave the device if your code sends them (for example in `onCapture`) or the shopper shares or downloads them.

## Network requests

TryOnIt only requests:

1. The MediaPipe JavaScript runtime chunk (bundled with your app) and the wasm files from `wasmBaseUrl` (default: jsDelivr, pinned to the tested version).
2. Model files from `modelBaseUrl` or `models` (default: Google's `storage.googleapis.com` model bucket).
3. Asset manifests, 3D models and images that you configure.

There are no analytics, cookies, fingerprinting or telemetry calls.

## Strict environments: self host everything

```bash
# copy the four models and the wasm folder to your static hosting
node scripts/fetch-models.mjs   # in this repository, see examples/*/public/{models,wasm}
```

```ts
createTryOnEngine({ modelBaseUrl: '/tryon/models', wasmBaseUrl: '/tryon/wasm' });
```

With self hosting, the try-on makes zero third party requests. A matching Content Security Policy typically needs: your origin (where the wasm loader script lives) plus `'wasm-unsafe-eval'` in `script-src`, your origin in `connect-src` (models, manifests, GLB files), and `blob:` in `img-src` (capture previews). Test your exact policy in the playground before shipping.

## Permissions UX

- The camera is requested only after the shopper opens try-on (or presses Start when `autoStart` is false).
- If permission is denied, TryOnIt explains how to re-enable it and offers a photo upload, which is processed locally in the same way.
- Closing the dialog stops the camera immediately (the browser camera indicator turns off).

## Your obligations

TryOnIt does not process biometric identifiers on any server, but you are still responsible for your privacy notice. A short sentence such as "Virtual try-on runs entirely on your device, your camera feed is never uploaded" is usually enough. The default UI shows a similar note (`labels.privacyNote`).
