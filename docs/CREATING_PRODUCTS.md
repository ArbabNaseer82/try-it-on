# Creating your own try-on products and filters

This guide is for anyone who uses TryOnIt in their own store or app and wants to add products: lipsticks, complete makeup looks, beauty filters, fun face stickers, hair colors, glasses, hats, jewelry, watches or clothing. You do not need to write rendering code. Every product is described by a small **JSON file (the asset manifest)**, plus a file for products that need one (a 3D model or a PNG image).

## Contents

1. [What you need for each kind of product](#1-what-you-need-for-each-kind-of-product)
2. [The workflow in 5 steps](#2-the-workflow-in-5-steps)
3. [File formats](#3-file-formats)
4. [Recipes](#4-recipes)
   - [Lipstick with shades](#41-lipstick-with-shades)
   - [Beauty filters (complete makeup looks)](#42-beauty-filters-complete-makeup-looks)
   - [Single makeup products](#43-single-makeup-products)
   - [Hair color](#44-hair-color)
   - [Fun face filters and stickers](#45-fun-face-filters-and-stickers)
   - [Glasses and sunglasses](#46-glasses-and-sunglasses)
   - [Hats, earrings, watches and rings](#47-hats-earrings-watches-and-rings)
   - [Clothing (experimental)](#48-clothing-experimental)
5. [Variants: colors, shades and styles](#5-variants-colors-shades-and-styles)
6. [Hosting your files](#6-hosting-your-files)
7. [Loading products from your backend, CMS or Shopify](#7-loading-products-from-your-backend-cms-or-shopify)
8. [Creating products in TypeScript](#8-creating-products-in-typescript)
9. [Validating products](#9-validating-products)
10. [Troubleshooting](#10-troubleshooting)

## 1. What you need for each kind of product

| You want                                      | `type`                                                                                     | Files you provide         | Format                                      | Typical tools                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------- | -------------------------------------------- |
| Lipstick, gloss                               | `makeup.lips`                                                                              | none, only colors         | JSON                                        | any text editor                              |
| Blush, eyeshadow, eyeliner, brows, foundation | `makeup.blush`, `makeup.eyeshadow`, `makeup.eyeliner`, `makeup.brows`, `makeup.foundation` | none                      | JSON                                        | text editor                                  |
| Beauty filter, full makeup look               | `makeup.look`                                                                              | none                      | JSON                                        | text editor                                  |
| Hair color                                    | `hair.color`                                                                               | none                      | JSON                                        | text editor                                  |
| Fun filter, sticker, mask, moustache, crown   | `face.overlay2d`                                                                           | 1 image                   | PNG with transparent background             | Figma, Canva, Photoshop, Procreate, Inkscape |
| Glasses, sunglasses                           | `glasses`                                                                                  | 1 3D model                | GLB (binary glTF 2.0), millimeters          | Blender, CAD export, purchased model         |
| Hats, caps                                    | `hat`                                                                                      | 1 3D model                | GLB                                         | Blender                                      |
| Earrings                                      | `earrings`                                                                                 | 1 3D model (one earring)  | GLB                                         | Blender                                      |
| Watches, bracelets                            | `watch`                                                                                    | 1 3D model                | GLB                                         | Blender                                      |
| Rings                                         | `ring`                                                                                     | 1 3D model                | GLB                                         | Blender, jewelry CAD (Rhino, Matrix)         |
| T-shirts, tops (experimental)                 | `clothing.top`                                                                             | 1 image + 4 anchor points | PNG with transparent background             | photo + background removal                   |
| Product thumbnail (optional, any type)        | field `thumbnail`                                                                          | 1 image                   | PNG, JPG, WebP or SVG, square, about 128 px | any                                          |

Makeup, beauty filters and hair colors need **no files at all**: a color and a few numbers are enough.

## 2. The workflow in 5 steps

1. **Create the file** (only for stickers, 3D items and clothing): see the recipes below.
2. **Write the manifest**: a `.json` file next to the file it uses.
3. **Validate**: `npx -p @tryonit/core tryonit-validate path/to/your-product.json` checks the JSON and the referenced files.
4. **Preview**: point a `TryOnButton` (or the repository playground) at the manifest and test it on your face, on a phone, and with a few photos.
5. **Host**: upload the manifest and its files to your site or CDN and use the URL in your product page.

Minimal product page:

```tsx
import { TryOnButton } from '@tryonit/react';
import '@tryonit/react/styles.css';

<TryOnButton asset="/tryon/velvet-lipstick.json" />;
```

Add this line at the top of every manifest to get autocomplete and inline errors in VS Code:

```json
"$schema": "https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json"
```

## 3. File formats

### Manifest (always)

- UTF-8 JSON file, extension `.json`, or a JavaScript object passed directly to a component.
- Required fields for every product: `"version": 1`, a unique `"id"`, and the `"type"`.
- Optional for every product: `"name"`, `"thumbnail"`, `"variants"`, `"defaultVariantId"`, `"meta"` (your own data such as SKU and price, TryOnIt never reads it).
- Colors: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r, g, b)` or `rgba(r, g, b, a)`.
- Numbers like `opacity`, `size`, `thickness` and `coverage` go from `0` to `1`.
- File paths can be relative to the manifest (`"model": "aviator.glb"`) or absolute URLs.

### 3D models

- **GLB** (binary glTF 2.0) preferred, `.gltf` also works.
- **Units: millimeters**, at real size. A 140 mm wide frame is 140 units wide.
- Origin and axes depend on the category (tables below). +Y is up, "left" is the wearer's left.
- Under about 50,000 triangles and under 1 MB. Compress with Meshopt or Draco (see [ASSET_AUTHORING.md](./ASSET_AUTHORING.md#compression)).
- PBR materials (metallic and roughness). Glass lenses: a transparent material with opacity.
- No cameras or lights inside the file: TryOnIt lights the model automatically.

### Images (stickers and clothing)

- **PNG with a transparent background** (RGBA).
- Cropped tightly around the artwork.
- 512 to 1024 px wide for stickers, about 1000 px tall for garments. 2048 px is the useful maximum.

## 4. Recipes

### 4.1 Lipstick with shades

No files needed.

```json
{
  "$schema": "https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json",
  "version": 1,
  "id": "velvet-lipstick",
  "type": "makeup.lips",
  "name": "Velvet Lipstick",
  "color": "#B0123A",
  "finish": "satin",
  "opacity": 0.65,
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
    },
    {
      "id": "sparkle",
      "name": "Rose Sparkle",
      "swatch": "#C99A84",
      "overrides": { "color": "#C99A84", "finish": "shimmer" }
    }
  ],
  "meta": { "sku": "LIP-001", "price": 19 }
}
```

| Field     | Values                               | Effect                                                                                                              |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `color`   | any color                            | Pigment. Real lipstick looks 10 to 15 percent darker on lips than the bullet, so start from your swatch and adjust. |
| `finish`  | `matte`, `satin`, `gloss`, `shimmer` | Texture. Gloss adds highlights taken from the real lip light, shimmer adds fine sparkle.                            |
| `opacity` | 0 to 1 (default 0.6)                 | Sheer (0.3) to full coverage (0.85).                                                                                |

The shopper sees a shade picker automatically because the product has variants. Teeth are never colored.

### 4.2 Beauty filters (complete makeup looks)

A "beauty filter" is a `makeup.look`: several makeup layers in one product. Layers are always drawn in a natural order (foundation, blush, brows, eyeshadow, eyeliner, lips), whatever order you write them in.

**Natural "no makeup" filter**

```json
{
  "version": 1,
  "id": "filter-natural",
  "type": "makeup.look",
  "name": "Natural",
  "layers": [
    { "type": "makeup.foundation", "color": "#D9A98A", "opacity": 0.25, "coverage": 0.6 },
    { "type": "makeup.blush", "color": "#E8838B", "opacity": 0.2, "size": 0.6 },
    { "type": "makeup.lips", "color": "#C9827A", "opacity": 0.35, "finish": "satin" }
  ]
}
```

**Soft glam filter**

```json
{
  "version": 1,
  "id": "filter-soft-glam",
  "type": "makeup.look",
  "name": "Soft Glam",
  "layers": [
    { "type": "makeup.foundation", "color": "#D9A98A", "opacity": 0.3, "coverage": 0.5 },
    { "type": "makeup.blush", "color": "#D9707A", "opacity": 0.3 },
    { "type": "makeup.brows", "color": "#4A3426", "opacity": 0.35 },
    { "type": "makeup.eyeshadow", "color": "#9C6B3C", "opacity": 0.45, "finish": "shimmer" },
    { "type": "makeup.eyeliner", "color": "#1A1A1A", "thickness": 0.3, "wing": true },
    { "type": "makeup.lips", "color": "#B0123A", "finish": "gloss" }
  ]
}
```

**Bold night filter**

```json
{
  "version": 1,
  "id": "filter-night",
  "type": "makeup.look",
  "name": "Night Out",
  "layers": [
    { "type": "makeup.eyeshadow", "color": "#3B2A4A", "opacity": 0.6, "finish": "satin" },
    { "type": "makeup.eyeliner", "color": "#000000", "thickness": 0.6, "wing": true },
    { "type": "makeup.lips", "color": "#6E1E4A", "opacity": 0.8, "finish": "matte" }
  ]
}
```

Tips:

- Use `foundation` with `coverage` 0.5 to 0.7 and low `opacity` for a smooth skin effect without changing the skin tone.
- Offer several looks as separate products and let shoppers switch with the product switcher (`<TryOn assets={[natural, softGlam, night]} />`).
- The intensity slider in the UI scales every layer at once.

### 4.3 Single makeup products

| Type                | Required | Optional fields (default)                                               |
| ------------------- | -------- | ----------------------------------------------------------------------- |
| `makeup.blush`      | `color`  | `opacity` (0.35), `size` 0 to 1 (0.5)                                   |
| `makeup.eyeshadow`  | `color`  | `opacity` (0.5), `finish` `matte` / `satin` / `shimmer` (`matte`)       |
| `makeup.eyeliner`   | `color`  | `opacity` (0.9), `thickness` 0 to 1 (0.35), `wing` true / false (false) |
| `makeup.brows`      | `color`  | `opacity` (0.4)                                                         |
| `makeup.foundation` | `color`  | `opacity` (0.35), `coverage` 0 to 1 (0.4)                               |

```json
{
  "version": 1,
  "id": "liner-wing",
  "type": "makeup.eyeliner",
  "name": "Winged Liner",
  "color": "#141414",
  "wing": true,
  "thickness": 0.45
}
```

### 4.4 Hair color

```json
{
  "version": 1,
  "id": "hair-color",
  "type": "hair.color",
  "name": "Hair Color",
  "color": "#7A2E1E",
  "opacity": 0.55,
  "variants": [
    { "id": "auburn", "name": "Auburn", "swatch": "#7A2E1E" },
    {
      "id": "honey",
      "name": "Honey Blonde",
      "swatch": "#C59A55",
      "overrides": { "color": "#C59A55" }
    },
    {
      "id": "violet",
      "name": "Violet",
      "swatch": "#5B2A86",
      "overrides": { "color": "#5B2A86", "opacity": 0.65 }
    }
  ]
}
```

The original strand pattern and shine are kept. Very dark hair needs a higher `opacity` (0.65 to 0.8) to show light colors.

### 4.5 Fun face filters and stickers

Stickers (`face.overlay2d`) are PNG images that follow the face: they move, scale and tilt with the head. Use them for moustaches, cat noses, crowns, flower headbands, heart sunglasses, masks and brand campaign filters.

**Step 1: make the PNG**

1. Draw or design the artwork in Figma, Canva, Photoshop, Procreate or Inkscape, **facing the camera**.
2. Keep the background transparent. Do not add a white background.
3. Crop tightly around the artwork, then export as PNG, 512 to 1024 px wide.
4. Draw it exactly as shoppers should see it on screen. TryOnIt takes care of the mirrored front camera view, so text and logos read correctly in the live preview and in captured photos.

**Step 2: choose the anchor**

| `anchor`                  | Where the center of the image goes | Good for                                      |
| ------------------------- | ---------------------------------- | --------------------------------------------- |
| `forehead`                | Middle of the forehead             | Crowns, headbands, tiaras, bindis             |
| `eyes`                    | Between the eyes                   | 2D glasses, eye masks, heart eyes             |
| `noseBridge` (default)    | Top of the nose                    | Masks, glasses shaped stickers                |
| `noseTip`                 | Tip of the nose                    | Clown nose, cat or dog nose                   |
| `mouth`                   | Center of the mouth                | Moustaches, beards, lips stickers             |
| `chin`                    | Chin                               | Beards, bow ties under the chin (with offset) |
| `leftCheek`, `rightCheek` | Cheeks                             | Face paint, hearts, flags                     |

**Step 3: size and position**

- `scale`: width of the image relative to the face width. `1` means as wide as the face. A moustache is about `0.5`, eye glasses about `1`, a crown about `1.1`.
- `offset`: `[x, y]` moves the image relative to the face width. `[0, -0.1]` moves it up by 10 percent of the face width, `[0, 0.2]` moves it down.
- `opacity`: 0 to 1.

```json
{
  "version": 1,
  "id": "filter-moustache",
  "type": "face.overlay2d",
  "name": "Moustache",
  "image": "moustache.png",
  "anchor": "mouth",
  "scale": 0.55,
  "offset": [0, -0.09]
}
```

```json
{
  "version": 1,
  "id": "filter-crown",
  "type": "face.overlay2d",
  "name": "Golden Crown",
  "image": "crown.png",
  "anchor": "forehead",
  "scale": 1.1,
  "offset": [0, -0.35],
  "variants": [
    { "id": "gold", "name": "Gold" },
    { "id": "silver", "name": "Silver", "overrides": { "image": "crown-silver.png" } }
  ]
}
```

**Multi part filters (for example dog ears plus nose).** One product shows one image. Combine all parts into a single PNG with the parts placed where they belong relative to each other, anchor it at `noseBridge` and use a larger `scale` (about 1.6 for ears plus nose). Showing several products at the same time is on the roadmap.

**Want makeup and a sticker together?** Use a `makeup.look` for the beauty part and draw any colored effect you need into the sticker PNG.

### 4.6 Glasses and sunglasses

**Where to get a 3D model**

- **Model it in Blender** (free) from the frame measurements printed inside real glasses (for example 52-18-140: lens width, bridge, temple length).
- **Export from your manufacturer's CAD** files (STEP, OBJ, FBX), then convert to GLB in Blender.
- **Buy a model** from a 3D marketplace. Check that the license allows commercial use in an AR app.
- **Photogrammetry or a 3D scanning service** for exact replicas.

**Model rules**

| Rule             | Value                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Units            | Millimeters, real size                                                                                           |
| Origin (0, 0, 0) | Middle of the bridge, where the frame rests on the nose                                                          |
| +X               | Wearer's left                                                                                                    |
| +Y               | Up                                                                                                               |
| +Z               | Forward, out of the face. Temples (arms) extend toward -Z                                                        |
| Lenses           | Separate mesh with a transparent material. Sunglasses: dark color, opacity 0.6 to 0.8. Clear lenses: opacity 0.1 |
| Size             | Under 50k triangles, under 1 MB                                                                                  |

The full Blender export walkthrough is in [ASSET_AUTHORING.md](./ASSET_AUTHORING.md#glasses-in-blender).

```json
{
  "version": 1,
  "id": "aviator",
  "type": "glasses",
  "name": "Aviator",
  "model": "aviator.glb",
  "thumbnail": "aviator.svg",
  "occlusion": "head",
  "variants": [
    { "id": "gold", "name": "Gold" },
    { "id": "black", "name": "Black", "overrides": { "model": "aviator-black.glb" } }
  ]
}
```

`"occlusion": "head"` (default) hides the parts of the temples that should be behind the head.

**Fine tuning without re-exporting**: add a `transform` (millimeters and degrees).

```json
"transform": { "position": [0, -2, 1.5], "rotation": [4, 0, 0], "scale": 1.02 }
```

### 4.7 Hats, earrings, watches and rings

Same rules as glasses (GLB, millimeters, real size). Only the origin and axes change.

| Type       | Origin                                     | Axes                                                                             | Extra fields                                                                       |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `hat`      | Top center of the forehead at the hairline | +Y up, +Z forward, crown behind the origin                                       | `occlusion`                                                                        |
| `earrings` | Piercing point of **one** earring          | +Y up, hangs toward -Y                                                           | `side`: `both`, `left`, `right`. The right ear gets a mirrored copy                |
| `watch`    | Center of the wrist cross section          | +Y toward the fingers, +Z out of the back of the hand (dial side)                | `wristWidthMm` the model was made for (default 60)                                 |
| `ring`     | Center of the ring                         | +Y along the finger toward the tip, +Z toward the top of the finger (stone side) | `finger`: `index`, `middle`, `ring`, `pinky`; `sizeMm` inner diameter (default 18) |

```json
{
  "version": 1,
  "id": "pearl-drops",
  "type": "earrings",
  "name": "Pearl Drops",
  "model": "earring.glb",
  "side": "both"
}
```

```json
{
  "version": 1,
  "id": "classic-watch",
  "type": "watch",
  "name": "Classic Watch",
  "model": "watch.glb",
  "wristWidthMm": 60
}
```

```json
{
  "version": 1,
  "id": "solitaire",
  "type": "ring",
  "name": "Solitaire Ring",
  "model": "ring.glb",
  "sizeMm": 18,
  "variants": [
    { "id": "ring-finger", "name": "Ring finger", "overrides": { "finger": "ring" } },
    { "id": "index-finger", "name": "Index finger", "overrides": { "finger": "index" } }
  ]
}
```

Watches are moved 22 mm toward the forearm automatically. Rings sit between the base of the finger and the first joint.

### 4.8 Clothing (experimental)

A 2D preview: a front facing garment photo is stretched onto the shopper's torso. Good for quick previews and campaigns, not for checking fit.

1. Photograph the garment flat or on an invisible mannequin, front facing.
2. Remove the background (Photoshop, remove.bg, Canva) and export a PNG about 1000 px tall.
3. Note four points in image pixels (any editor shows cursor coordinates):
   - `leftShoulder` and `rightShoulder`: shoulder seams. **`leftShoulder` is the wearer's left, which is on the right side of the image.**
   - `leftHip` and `rightHip`: side seams at the hem.

```json
{
  "version": 1,
  "id": "basic-tee",
  "type": "clothing.top",
  "name": "Basic Tee",
  "image": "tee-teal.png",
  "anchors": {
    "leftShoulder": [352, 78],
    "rightShoulder": [160, 78],
    "leftHip": [378, 560],
    "rightHip": [134, 560]
  },
  "padding": 1.15,
  "variants": [
    { "id": "teal", "name": "Teal", "swatch": "#0F766E" },
    {
      "id": "coral",
      "name": "Coral",
      "swatch": "#E2584D",
      "overrides": { "image": "tee-coral.png" }
    }
  ]
}
```

Increase `padding` if the garment looks too narrow. Shoppers should stand 1.5 to 2 m from the camera.

## 5. Variants: colors, shades and styles

Every product can have `variants`. Each variant has an `id`, an optional `name`, a `swatch` color for the picker, an optional `thumbnail`, and `overrides` with any fields of that product type, including `model` and `image`:

```json
"variants": [
  { "id": "black", "name": "Matte Black", "swatch": "#111111" },
  { "id": "tortoise", "name": "Tortoise", "swatch": "#7B4A2A", "overrides": { "model": "frames-tortoise.glb" } }
],
"defaultVariantId": "black"
```

Rules: variant ids must be unique, `defaultVariantId` must match one of them, and `overrides` may only contain fields that exist for that type (the validator tells you if not).

## 6. Hosting your files

- Put each manifest next to its files and use relative paths (`"model": "aviator.glb"`). Paths resolve against the manifest URL, so the whole folder can move to a CDN unchanged.
- Files on another domain need **CORS**: the server must send `Access-Control-Allow-Origin: *` (or your site's origin) for `.json`, `.glb` and `.png` files. Without it models and images fail to load.
- Serve `.glb` as `model/gltf-binary` and set long cache headers (`Cache-Control: public, max-age=31536000, immutable`) when file names change between versions.
- Recommended layout:

```
public/tryon/
  lipstick-velvet.json
  aviator/
    aviator.json
    aviator.glb
    aviator-black.glb
    aviator.svg
  filters/
    moustache.json
    moustache.png
```

## 7. Loading products from your backend, CMS or Shopify

Every component accepts three kinds of `asset`:

```tsx
<TryOnButton asset={manifestObject} />                       // a JavaScript object
<TryOnButton asset="https://cdn.example.com/tryon/aviator.json" />  // a URL
<TryOnButton asset={(signal) => fetch(`/api/tryon/${sku}`, { signal }).then((r) => r.json())} />  // your API
```

- **Your API or a headless CMS**: store the manifest JSON (or build it from your product fields) and return it from an endpoint. Return absolute URLs for files, or URLs relative to the page.
- **Shopify**: store the manifest in a product metafield of type JSON (for example `tryon.manifest`), output it in your theme or Hydrogen loader, and pass the object to the component. With a plain theme, use `mount()` from `@tryonit/web` and `JSON.parse` the metafield value.
- Results are validated and cached by `id`. The `signal` cancels the request when the shopper switches products quickly.

## 8. Creating products in TypeScript

All manifest types are exported, so your editor checks fields while you type:

```ts
import type { AssetManifest, LipsAsset, MakeupLookAsset } from '@tryonit/core';

export const ruby = {
  version: 1,
  id: 'ruby',
  type: 'makeup.lips',
  color: '#B0123A',
  finish: 'satin',
} satisfies LipsAsset;

export function lipstickFromCatalog(product: {
  sku: string;
  hex: string;
  name: string;
}): AssetManifest {
  return {
    version: 1,
    id: product.sku,
    type: 'makeup.lips',
    name: product.name,
    color: product.hex,
  };
}
```

`@tryonit/web` and `@tryonit/react` re-export the same types where useful (`AssetManifest`, `AssetSource`).

## 9. Validating products

**From the command line** (the `tryonit-validate` tool ships inside `@tryonit/core`; `-p` makes npx use it even if you only installed `@tryonit/react`):

```bash
npx -p @tryonit/core tryonit-validate public/tryon          # every .json with a "type" field in the folder
npx -p @tryonit/core tryonit-validate public/tryon/aviator/aviator.json
```

It checks every field against the schema and, for relative paths, that the GLB and PNG files exist, are real GLB and PNG files, are not too large, and that stickers and garments have transparency. It exits with code 1 on errors, so you can run it in CI.

**In code**:

```ts
import { safeValidateManifest, formatIssues } from '@tryonit/core';

const result = safeValidateManifest(json);
if (!result.success) console.error(formatIssues(result.issues));
```

**At runtime**, invalid products raise an error with code `ASSET_INVALID` and readable messages such as `variants[2].color: Expected a color like #RRGGBB`. Listen with `onError`.

## 10. Troubleshooting

| Problem                                          | Cause and fix                                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3D model is tiny or huge                         | Not modeled in millimeters. Rescale in Blender and apply transforms, or use `"transform": { "scale": ... }`.                                                                             |
| Glasses float in front of or inside the face     | Origin is not at the nose bridge. Move the origin, or adjust `transform.position` (millimeters, +Z forward).                                                                             |
| Model faces backwards or sideways                | Axes are wrong. The front must point to +Z in glTF (Blender: face -Y, the exporter converts it). Or use `transform.rotation`, for example `[0, 180, 0]`.                                 |
| Model or image does not load, console shows CORS | Add `Access-Control-Allow-Origin` on the file server.                                                                                                                                    |
| Black or missing textures                        | Textures not embedded in the GLB. Export as glTF Binary with textures included.                                                                                                          |
| Temples show through the head                    | Keep `"occlusion": "head"` (default).                                                                                                                                                    |
| Lipstick too strong or too flat                  | Lower `opacity`, pick a slightly lighter `color`, or change `finish`.                                                                                                                    |
| Sticker has a white box around it                | PNG has no transparency. Export with a transparent background.                                                                                                                           |
| Sticker in the wrong place                       | Pick a closer `anchor`, then fine tune `offset` in small steps (0.05).                                                                                                                   |
| Nothing appears                                  | Turn on `engineOptions={{ debug: true }}` to see landmarks and the FPS HUD, and read the error `code` from `onError`. "Look at the camera" means the face, hand or body is not detected. |
| Earring missing on one side                      | Expected when the head turns: the far ear is hidden. Check `side`.                                                                                                                       |
| Watch or ring jitters                            | Keep the hand steady and well lit. Tune `engineOptions.smoothing.hand` (lower `minCutoff`).                                                                                              |

Field by field reference: [MANIFEST_SPEC.md](./MANIFEST_SPEC.md). 3D modeling details: [ASSET_AUTHORING.md](./ASSET_AUTHORING.md).
