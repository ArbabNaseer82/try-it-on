# Asset manifest v1

An asset manifest describes one try-on product. It is plain JSON (or a JS object) validated at runtime by `validateManifest()` from `@tryonit/core`. Unknown keys are stripped (and reported in debug mode). Invalid manifests throw `TryOnError` with code `ASSET_INVALID` and path based issues, for example:

```
Invalid asset "ruby":
  - variants[2].color: Expected a color like #RRGGBB or rgb(r, g, b)
```

Add `"$schema": "https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json"` (or `./node_modules/@tryonit/core/dist/manifest.v1.schema.json`) to get autocomplete in editors. The JSON Schema is kept in sync with the runtime validator by a unit test.

## Common fields

| Field              | Type                    | Required | Description                                                |
| ------------------ | ----------------------- | -------- | ---------------------------------------------------------- |
| `version`          | `1`                     | yes      | Manifest format version.                                   |
| `id`               | string (1 to 200 chars) | yes      | Unique id. Used for caching and `defaultAssetId`.          |
| `type`             | see below               | yes      | Discriminator that selects the tracker and renderer.       |
| `name`             | string                  | no       | Display name (product switcher, dialog).                   |
| `thumbnail`        | URL                     | no       | Image for the product switcher.                            |
| `variants`         | `Variant[]`             | no       | Shades, colors or styles. Ids must be unique.              |
| `defaultVariantId` | string                  | no       | Must match a variant id. Defaults to the first variant.    |
| `meta`             | object                  | no       | Your data (sku, price). Passed through, never interpreted. |

### Variant

| Field       | Type   | Description                                                                                                       |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `id`        | string | Required, unique within the asset.                                                                                |
| `name`      | string | Label for swatches and screen readers.                                                                            |
| `swatch`    | color  | Color shown in the swatch button.                                                                                 |
| `thumbnail` | URL    | Optional swatch image.                                                                                            |
| `overrides` | object | Any subset of the asset's type specific fields (no defaults are applied to overrides). Unknown keys are rejected. |

### URLs

URL fields (`model`, `image`, `thumbnail`) accept absolute `http(s)`, `data:` and `blob:` URLs and relative paths. When a manifest is loaded from a URL, relative paths resolve against the manifest URL (also inside variant overrides). `javascript:` URLs are rejected.

### Colors

`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r, g, b)` and `rgba(r, g, b, a)`.

### Transform (3D types)

Applied in anchor space, after category defaults.

| Field      | Type                  | Unit                                                                          |
| ---------- | --------------------- | ----------------------------------------------------------------------------- |
| `position` | `[x, y, z]`           | millimeters (+X wearer's left, +Y up, +Z out of the face or back of the hand) |
| `rotation` | `[x, y, z]`           | degrees, XYZ order                                                            |
| `scale`    | number or `[x, y, z]` | multiplier                                                                    |

## Types

### `makeup.lips`

| Field     | Type                                       | Default  |
| --------- | ------------------------------------------ | -------- |
| `color`   | color                                      | required |
| `opacity` | 0..1                                       | 0.6      |
| `finish`  | `matte` \| `gloss` \| `satin` \| `shimmer` | `matte`  |

```json
{ "version": 1, "id": "ruby", "type": "makeup.lips", "color": "#B0123A", "finish": "satin" }
```

### `makeup.blush`

| Field     | Type                   | Default  |
| --------- | ---------------------- | -------- |
| `color`   | color                  | required |
| `opacity` | 0..1                   | 0.35     |
| `size`    | 0..1 (relative radius) | 0.5      |

### `makeup.eyeshadow`

| Field     | Type                            | Default  |
| --------- | ------------------------------- | -------- |
| `color`   | color                           | required |
| `opacity` | 0..1                            | 0.5      |
| `finish`  | `matte` \| `satin` \| `shimmer` | `matte`  |

### `makeup.eyeliner`

| Field       | Type    | Default  |
| ----------- | ------- | -------- |
| `color`     | color   | required |
| `opacity`   | 0..1    | 0.9      |
| `thickness` | 0..1    | 0.35     |
| `wing`      | boolean | false    |

### `makeup.brows`

| Field     | Type  | Default  |
| --------- | ----- | -------- |
| `color`   | color | required |
| `opacity` | 0..1  | 0.4      |

### `makeup.foundation`

| Field      | Type                     | Default  |
| ---------- | ------------------------ | -------- |
| `color`    | color                    | required |
| `opacity`  | 0..1                     | 0.35     |
| `coverage` | 0..1 (texture smoothing) | 0.4      |

### `makeup.look`

A full look in one asset. Layers are drawn in a fixed order: foundation, blush, brows, eyeshadow, eyeliner, lips.

| Field    | Type                                                                             | Default  |
| -------- | -------------------------------------------------------------------------------- | -------- |
| `layers` | 1 to 12 objects, each `{ "type": "makeup.lips" \| ..., ...fields of that type }` | required |

```json
{
  "version": 1,
  "id": "evening",
  "type": "makeup.look",
  "layers": [
    { "type": "makeup.foundation", "color": "#D9A98A", "opacity": 0.25 },
    { "type": "makeup.eyeshadow", "color": "#6D4C7D", "finish": "shimmer" },
    { "type": "makeup.lips", "color": "#9E1030", "finish": "gloss" }
  ]
}
```

### `hair.color`

| Field     | Type  | Default  |
| --------- | ----- | -------- |
| `color`   | color | required |
| `opacity` | 0..1  | 0.55     |

### `glasses`

| Field       | Type                                  | Default  |
| ----------- | ------------------------------------- | -------- |
| `model`     | URL to `.glb` / `.gltf` (millimeters) | required |
| `transform` | Transform                             | none     |
| `occlusion` | `head` \| `none`                      | `head`   |

Origin at the nose bridge contact point. See [ASSET_AUTHORING.md](./ASSET_AUTHORING.md).

### `hat`

| Field       | Type             | Default  |
| ----------- | ---------------- | -------- |
| `model`     | URL              | required |
| `transform` | Transform        | none     |
| `occlusion` | `head` \| `none` | `head`   |

Origin at the top center of the forehead (hairline).

### `earrings`

| Field       | Type                        | Default  |
| ----------- | --------------------------- | -------- |
| `model`     | URL (one earring)           | required |
| `transform` | Transform                   | none     |
| `side`      | `both` \| `left` \| `right` | `both`   |

The model is cloned for both ears (mirrored on the right ear). The far ear hides when the head turns.

### `face.overlay2d`

| Field     | Type                                                                                                  | Default      |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| `image`   | URL to a PNG with transparency                                                                        | required     |
| `anchor`  | `forehead` \| `eyes` \| `noseBridge` \| `noseTip` \| `mouth` \| `chin` \| `leftCheek` \| `rightCheek` | `noseBridge` |
| `scale`   | width relative to face width (0.01 to 10)                                                             | 1            |
| `offset`  | `[x, y]` relative to face width                                                                       | `[0, 0]`     |
| `opacity` | 0..1                                                                                                  | 1            |

### `watch`

| Field          | Type                                            | Default                                                       |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `model`        | URL                                             | required                                                      |
| `transform`    | Transform                                       | none (a default of 22 mm toward the forearm is applied first) |
| `wristWidthMm` | 20..150, wrist width the model was authored for | 60                                                            |

### `ring`

| Field       | Type                                     | Default  |
| ----------- | ---------------------------------------- | -------- |
| `model`     | URL                                      | required |
| `transform` | Transform                                | none     |
| `finger`    | `index` \| `middle` \| `ring` \| `pinky` | `ring`   |
| `sizeMm`    | 8..40, inner diameter                    | 18       |

### `clothing.top` (experimental)

| Field     | Type                                                                               | Default  |
| --------- | ---------------------------------------------------------------------------------- | -------- |
| `image`   | URL to a front facing garment PNG with transparent background                      | required |
| `anchors` | Garment points, each `[x, y]` in image pixels (see below)                          | required |
| `padding` | 0.5..3, multiplier on detected shoulder width (four point mode)                    | 1.15     |
| `fit`     | 0.8..1.6, how loose the garment sits around the body (fitted mode)                 | 1.06     |
| `shading` | 0..1, how much of the light and folds under the garment show through (fitted mode) | 0.6      |
| `opacity` | 0..1                                                                               | 1        |

Required anchors: `leftShoulder`, `rightShoulder` (top of the shoulder seams) and `leftHip`, `rightHip` (where the garment meets the hips). Left is the wearer's left, which is on the right side of a front facing garment image.

Optional anchors turn on **fitted mode**: `neck` (center front of the neckline), `leftArmpit`, `rightArmpit`, `leftSleeve`, `rightSleeve` (center of each sleeve opening), `leftWaist`, `rightWaist`. Each point is pinned to the matching body point from pose tracking and the image bends smoothly in between: sleeves follow the upper arms, the sides follow the body outline measured from the person segmentation mask, and the garment picks up the light and folds of what the wearer has on. With only the four required anchors the garment is warped onto the torso as before.

Limitations: front facing only, no arm occlusion (arms crossing in front of the body are covered by the garment).

## Loading sources

`resolveAsset(source, options)` and every component accept:

- a manifest object,
- a URL string (fetched as JSON, relative files resolved against it),
- a function `(signal) => Promise<unknown>` for merchant APIs. The signal aborts when the shopper switches products quickly.

Results are cached by id and by URL in an in memory LRU.
