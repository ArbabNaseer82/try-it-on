# Changelog

From 0.1.1 on, every package keeps its own `CHANGELOG.md` inside its folder (`packages/core`, `packages/web`, `packages/react`, `packages/react-native`), written by [changesets](https://github.com/changesets/changesets) on each release. Release notes are also on the [GitHub releases page](https://github.com/ArbabNaseer82/try-it-on/releases).

## 0.1.0 (2026-10-04)

First public release of all four packages.

- `@tryonit/core`: asset manifest v1 with a validator for 15 asset types, session store, typed events, One Euro and pose filters, face, hand and body anchors, iris based real world scale, asset resolver (object, URL or async loader), JSON Schema for editors, and the `tryonit-validate` CLI.
- `@tryonit/web`: camera and photo sources, lazy MediaPipe trackers (face, hand, pose, hair) with GPU to CPU fallback, WebGL2 makeup, hair and 2D overlay renderers, lazy three.js renderer with head, wrist and finger occlusion, capture, preload, debug overlay, and the framework free `mount()`.
- `@tryonit/react`: `TryOnProvider`, `TryOn`, `TryOnButton`, `TryOnModal`, `TryOnView`, headless hooks, theming through CSS variables, replaceable icons, labels and slots, and an `unstyled` mode.
- `@tryonit/react-native`: `TryOnButton`, `TryOnModal`, `TryOnView` and `useTryOn` for Expo Go, Expo dev builds and bare React Native, plus an Expo config plugin for camera permissions.
- Examples: Vite playground, Next.js App Router, React Router v7 (Remix), vanilla HTML and an Expo app.
- Experimental: `clothing.top` 2D garment overlay.
