# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - not yet published

### Added

- `@tryonit/core`: asset manifest v1 types and custom validator for 15 asset types, session store with finite state machine, typed event emitter, One Euro, quaternion and pose filters, homography, polygon triangulation, face, hand and body anchors, iris based metric scale, asset resolver (object, URL, async loader, abort, LRU cache), JSON Schema for editors.
- `@tryonit/web`: camera and photo sources, lazy MediaPipe trackers (face, hand, pose, hair) with GPU to CPU fallback, custom WebGL2 makeup, hair and 2D overlay renderers, lazy three.js renderer with head, wrist and finger occluders, adaptive frame loop, capture, preload, debug overlay, framework free `mount()`.
- `@tryonit/react`: `TryOnProvider`, `TryOn`, `TryOnButton`, `TryOnModal`, `TryOnView`, product switcher, shade swatches, capture, camera switch, compare slider, intensity slider, status overlay, permission prompt, headless hooks, theme to CSS variables, icons, labels, `unstyled` and `slots`.
- Examples: Vite playground, Next.js App Router, React Router v7 (Remix), vanilla HTML.
- Procedural sample assets, model fetch script, documentation.
- `tryonit-validate` command line tool in `@tryonit/core` for checking manifests and their GLB and PNG files.
- Guide for creating products and filters (`docs/CREATING_PRODUCTS.md`) and a publishing guide (`docs/PUBLISHING.md`).

### Experimental

- `clothing.top` 2D garment overlay.
