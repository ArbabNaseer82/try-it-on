# Theming and customization

Everything visible can be changed. Pick the lightest tool that does the job:

1. `theme` prop: brand colors, radius, fonts.
2. `classNames` per slot: Tailwind, CSS Modules or any class.
3. `unstyled`: removes default visual styles, keeps layout and accessibility.
4. `slots`: replace whole sub components.
5. Headless hooks: build 100% of the UI yourself.

Icons, images and every string are replaceable at any level.

## 1. Theme tokens

```tsx
<TryOnProvider
  theme={{
    mode: 'auto', // 'light' | 'dark' | 'auto' (follows prefers-color-scheme)
    colors: { primary: '#7C3AED', onPrimary: '#ffffff', surface: '#ffffff', onSurface: '#111827' },
    radius: 16,
    spacing: 8,
    fontFamily: 'Inter, sans-serif',
    fontSize: { sm: 13, md: 15, lg: 18 },
    zIndex: 1000,
    shadow: '0 12px 40px rgba(0,0,0,.25)',
    transitionMs: 160,
  }}
>
```

The theme is a typed deep partial. It is converted to CSS custom properties on the root element, there is no CSS-in-JS runtime.

| Theme key           | CSS variable                                  |
| ------------------- | --------------------------------------------- |
| `colors.primary`    | `--toi-color-primary`                         |
| `colors.onPrimary`  | `--toi-color-on-primary`                      |
| `colors.surface`    | `--toi-color-surface`                         |
| `colors.onSurface`  | `--toi-color-on-surface`                      |
| `colors.overlay`    | `--toi-color-overlay`                         |
| `colors.danger`     | `--toi-color-danger`                          |
| `colors.success`    | `--toi-color-success`                         |
| `colors.muted`      | `--toi-color-muted`                           |
| `radius`            | `--toi-radius`                                |
| `spacing`           | `--toi-space-1` to `--toi-space-4` (1x to 4x) |
| `fontFamily`        | `--toi-font-family`                           |
| `fontSize.sm/md/lg` | `--toi-font-size-sm/md/lg`                    |
| `zIndex`            | `--toi-z-index`                               |
| `shadow`            | `--toi-shadow`                                |
| `transitionMs`      | `--toi-transition`                            |

You can also set the variables in your own CSS:

```css
.my-shop [data-theme-mode] {
  --toi-color-primary: #0f766e;
  --toi-radius: 4px;
}
```

The vanilla `mount()` UI from `@tryonit/web` uses the same variables. Pass them without the prefix: `mount(el, { theme: { 'color-primary': '#0f766e' } })`.

## 2. Class names per slot

```tsx
<TryOn
  classNames={{
    root: 'rounded-none',
    stage: 'aspect-[3/4]',
    toolbar: 'gap-2',
    captureButton: 'bg-black text-white',
    productSwitcher: 'px-4',
  }}
/>
```

Slots: `root`, `stage`, `toolbar`, `captureButton`, `cameraSwitch`, `compareButton`, `uploadButton`, `productSwitcher`, `swatches`, `intensity`, `status`, `permission`, `preview`, `compare`, `modal`, `backdrop`, `badge`.

The stylesheet uses single class selectors and `:where()` for resets, so any class you add wins without `!important`. Nothing leaks outside `.toi-root`.

## 3. Unstyled

```tsx
<TryOn unstyled classNames={{ ... }} />
```

Removes colors, borders, radii, shadows and animations. Keeps positioning (stage, overlays, dialog), focus handling, ARIA roles and live regions.

## 4. Slots

```tsx
import type { ToolbarSlotProps, CaptureButtonProps } from '@tryonit/react';

function MyToolbar({ children }: ToolbarSlotProps) {
  return <nav className="my-toolbar">{children}</nav>; // reorder or wrap the default buttons
}

function MyShutter({ onCapture }: CaptureButtonProps) {
  const { capture } = useTryOn();
  return <button onClick={async () => onCapture?.(await capture())}>Snap</button>;
}

<TryOn slots={{ Toolbar: MyToolbar, CaptureButton: MyShutter, Loader: MySpinner }} />;
```

Available slots: `Toolbar`, `CaptureButton`, `StatusOverlay`, `ProductSwitcher`, `Loader`.

## 5. Headless hooks

```tsx
const {
  status,
  error,
  start,
  startFromImage,
  stop,
  setAsset,
  setVariant,
  setIntensity,
  switchCamera,
  capture,
  attach,
  setCompare,
} = useTryOn();
const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
const perf = useTryOnState((s) => s.perf, shallowEqual);
const { capture, last } = useCapture();
const { facing, switchCamera } = useCamera();
const { asset, loading, variantId, setVariant } = useAsset('/assets/lipstick.json');
```

`useTryOnState` subscribes to the smallest slice you select and re-renders only when it changes.

## Icons

```tsx
<TryOnProvider icons={{ capture: MyCameraIcon, close: X, switchCamera: RefreshCw }} />
```

Built in icons: `camera`, `capture`, `switchCamera`, `close`, `compare`, `download`, `share`, `retry`, `warning`, `check`, `chevronLeft`, `chevronRight`. Any React component that accepts `size` and SVG props works (lucide-react, heroicons, your own).

## Images

```tsx
<TryOnProvider
  images={{
    loader: '/brand/loader.gif',
    logo: '/brand/logo.svg',
    placeholder: '/brand/face.png',
    permissionIllustration: '/brand/camera.svg',
  }}
/>
```

## Labels and i18n

Every string is in a typed `Labels` object with English defaults (`defaultLabels`). Override any subset, including error messages:

```tsx
<TryOnProvider
  dir="rtl"
  labels={{
    open: 'جرّبها',
    capture: 'التقط صورة',
    errors: { CAMERA_DENIED: 'تم حظر الكاميرا' },
  }}
/>
```

## Dark mode

`theme.mode` controls the default palette: `auto` follows `prefers-color-scheme`, `light` and `dark` force it. Colors you pass in `theme.colors` apply in every mode.

## Reduced motion

When the user prefers reduced motion, transitions are disabled and the spinner slows down.
