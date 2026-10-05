# Local development and testing

## Prerequisites

- Node.js 22 or newer
- pnpm 12 (`npm install -g pnpm@12` or `corepack enable`)
- A webcam, or a phone on the same Wi-Fi network

## First run

```bash
pnpm install
pnpm build            # builds core, web and react (examples use the built packages)
pnpm fetch-models     # downloads the 4 MediaPipe models and copies wasm into examples/*/public
pnpm generate-assets  # builds sample GLB, PNG, SVG and manifest files into examples/*/public/assets
# or all three: pnpm setup:examples
pnpm dev              # playground on http://localhost:5173
```

Re-run `pnpm build` after changing package sources (or run `pnpm --filter "./packages/*" -r exec tsdown --watch` in a second terminal).

## Running each example

| Example                   | Command                                      | URL                              |
| ------------------------- | -------------------------------------------- | -------------------------------- |
| Playground (Vite + React) | `pnpm --filter playground dev`               | http://localhost:5173            |
| Headless demo             | same                                         | http://localhost:5173/#/headless |
| Next.js App Router        | `pnpm --filter nextjs-app dev`               | http://localhost:3000            |
| React Router v7 (Remix)   | `pnpm --filter remix-app dev`                | http://localhost:5173            |
| Vanilla HTML (`mount()`)  | `pnpm --filter vanilla-html dev`             | http://localhost:5173            |
| Expo / React Native       | `pnpm build && pnpm --filter expo-app start` | scan the QR code with Expo Go    |

Playground URL parameters: `?asset=glasses-aviator` preselects a sample, `?layout=modal` starts in modal layout.

## Testing the React Native package

`examples/expo-app` uses `@tryonit/react-native` from the workspace and the hosted samples in `samples/` (served from this repository by jsDelivr).

```bash
pnpm build                          # builds every package, including the embedded WebView engine
pnpm --filter expo-app start        # then scan the QR code with Expo Go on your phone
```

For a development build: `cd examples/expo-app && npx expo run:ios` (or `run:android`). The config plugin in `app.json` adds the camera permissions. The WebView page itself is covered by `e2e/react-native-runtime.spec.ts`.

## Testing on a phone over LAN (HTTPS)

Browsers only allow the camera on HTTPS or localhost.

```bash
pnpm --filter playground dev:phone
```

This starts Vite with `--host` and a self signed certificate (`@vitejs/plugin-basic-ssl`). Open the printed `https://192.168.x.x:5173` URL on the phone and accept the certificate warning (Advanced > Proceed on Android, Show Details > visit this website on iOS).

## Testing makeup realism with photos

1. Collect consented sample photos of light, medium and deep skin tones in daylight and indoor light (or use photos the product owner provides). Do not commit personal photos.
2. In the playground, pick a makeup asset and use **Selfie (image mode)** to upload a photo. The same pipeline runs in IMAGE mode.
3. Compare each finish (matte, satin, gloss, shimmer) and tune `color` and `opacity` in the manifest.

## Automated checks

```bash
pnpm lint         # ESLint (including layer import rules) and the no-dash check
pnpm typecheck    # tsc for every package and example
pnpm test         # Vitest: core (with coverage), web, react
pnpm build        # library builds
pnpm size         # bundle budgets
pnpm publint      # package.json correctness
pnpm attw         # type resolution for ESM, CJS and bundlers
pnpm e2e          # Playwright smoke test (needs fetch-models and generate-assets)
```

First Playwright run: `pnpm exec playwright install chromium`.

## Installing the packages into another local project

```bash
pnpm build
mkdir -p /tmp/tryonit-packs
pnpm --filter "./packages/*" -r exec pnpm pack --pack-destination /tmp/tryonit-packs
cd ../my-shop
npm install /tmp/tryonit-packs/tryonit-core-0.1.0.tgz /tmp/tryonit-packs/tryonit-web-0.1.0.tgz /tmp/tryonit-packs/tryonit-react-0.1.0.tgz three
```

`pnpm pack` replaces `workspace:^` with real version ranges, so the tarballs install like the published packages.

## Manual QA checklist

- [ ] Each makeup type (lips in all 4 finishes, blush, eyeshadow, eyeliner with wing, brows, foundation, full look) on a real face
- [ ] Teeth stay white when smiling with lipstick on
- [ ] Hair color (3 shades) with hair partly covering the face
- [ ] Both glasses: frame size looks right, temples hide behind the head when turning
- [ ] Cap: back of the cap hides behind the head
- [ ] Earrings: the far earring hides when turning the head
- [ ] Moustache sticker follows head roll
- [ ] Watch on the wrist with the strap wrapping, ring on ring and index finger
- [ ] Clothing (experimental): standing 1.5 to 2 m away, "step back" hint when too close
- [ ] Phone over LAN (Android Chrome), front and rear camera switch
- [ ] Safari iOS 16.4+ and Safari macOS
- [ ] Camera denied flow: message, retry, photo upload fallback
- [ ] Photo fallback with makeup, glasses and watch photos
- [ ] Capture: download and share (mobile), mirrored like the preview
- [ ] Keyboard only: open dialog, Tab cycles inside, Escape closes, focus returns to the button
- [ ] Screen reader announces "Loading", "Look at the camera", "Ready"
- [ ] Dark mode and RTL (`dir="rtl"`)
- [ ] Tab hidden pauses (fps HUD stops), camera light turns off when the dialog closes
