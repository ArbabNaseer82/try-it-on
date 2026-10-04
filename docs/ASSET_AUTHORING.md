# Asset authoring guide

How merchants and 3D artists prepare products for TryOnIt.

## General rules for 3D models

- Format: glTF 2.0, preferably binary `.glb`.
- Units: **millimeters**, modeled at real world size. A 140 mm glasses frame is 140 units wide.
- Keep it light: under 50k triangles and under 1 MB per product is a good target for mobile.
- Materials: glTF PBR metallic roughness. Lenses can use alpha blending (`transparent` with opacity).
- Do not include cameras or lights. TryOnIt adds image based lighting automatically.

### Axis and origin conventions

All conventions use +Y up. "Left" always means the wearer's left.

| Category | Origin                                                       | +X                                                                        | +Y                              | +Z                                                            |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| Glasses  | Center of the nose bridge, where the frame rests on the nose | Wearer's left                                                             | Up                              | Forward, out of the face. Temples extend toward -Z            |
| Hat      | Top center of the forehead at the hairline                   | Wearer's left                                                             | Up                              | Forward. The crown sits behind the origin (about -90 mm on Z) |
| Earrings | The piercing point of one earring                            | Away from the head for the left ear (right ear is mirrored automatically) | Up                              | Forward                                                       |
| Watch    | Center of the wrist cross section                            | Across the wrist                                                          | Toward the fingers              | Out of the back of the hand (watch face side)                 |
| Ring     | Center of the ring                                           | Across the finger                                                         | Along the finger toward the tip | Toward the top of the finger (gem side)                       |

A watch is shifted 22 mm toward the forearm by default. Use `transform` in the manifest for fine tuning without re-exporting the model:

```json
{ "transform": { "position": [0, -2, 1.5], "rotation": [4, 0, 0], "scale": 1.02 } }
```

## Glasses in Blender

1. Set **Scene Properties > Units** to Metric with Unit Scale 0.001 and Length in Millimeters.
2. Model the frame at real size (lens width, bridge width and temple length printed inside real frames, for example 52-18-140).
3. Place the 3D cursor at the middle of the bridge where it touches the nose and set the origin there (Object > Set Origin > Origin to 3D Cursor).
4. Make the frame face -Y in Blender, so Front view (numpad 1) looks straight at it. Blender is Z up: the glTF exporter converts Blender +Z up to glTF +Y up and Blender -Y to glTF +Z (forward). Blender +X stays +X, the wearer's left.
5. Apply all transforms (Ctrl+A > All Transforms).
6. Export: File > Export > glTF 2.0, format glTF Binary, include Selected Objects, +Y Up enabled.
7. Check the result in the playground with the debug overlay enabled.

The same workflow applies to hats, earrings, watches and rings with the origins listed above.

## Compression

```bash
# Meshopt geometry compression (decoder is bundled with TryOnIt)
npx @gltf-transform/cli meshopt input.glb output.glb

# Draco geometry compression (set three.dracoDecoderPath in engine options)
npx @gltf-transform/cli draco input.glb output.glb

# KTX2 / Basis textures (set three.ktx2TranscoderPath in engine options)
npx @gltf-transform/cli etc1s input.glb output.glb
npx @gltf-transform/cli uastc input.glb output.glb   # higher quality

# Everything at once with sensible defaults
npx @gltf-transform/cli optimize input.glb output.glb --compress meshopt --texture-compress webp
```

```tsx
<TryOnProvider
  engineOptions={{ three: { dracoDecoderPath: '/draco/', ktx2TranscoderPath: '/basis/' } }}
/>
```

## Makeup colors

- Pick colors from product photos taken in neutral daylight, not from packaging renders.
- Lipstick pigments usually look about 10 to 15 percent darker on lips than the bullet. Start from the swatch and adjust while testing on light, medium and deep skin tones.
- Use `finish` to express texture (`gloss` adds highlights from the real lip luminance, `shimmer` adds fine sparkle), and `opacity` for sheer versus full coverage.
- Use variants for shades so the shade picker appears automatically:

```json
"variants": [
  { "id": "ruby", "name": "Ruby", "swatch": "#B0123A" },
  { "id": "nude", "name": "Nude", "swatch": "#C48A7A", "overrides": { "color": "#C48A7A", "finish": "matte" } }
]
```

## Face stickers (`face.overlay2d`)

- PNG with transparency, tightly cropped, around 512 to 1024 px wide.
- `scale` is relative to face width: glasses style stickers are around 1, a moustache around 0.5.
- `offset` moves the sticker relative to the face width: `[0, -0.1]` moves it up by 10 percent of the face width.

## Clothing PNGs (experimental)

1. Photograph the garment flat or on an invisible mannequin, front facing, with arms down or slightly out.
2. Remove the background (transparent PNG), crop with a small margin, and export around 1000 px tall.
3. Pick four anchor points in image pixels (use any image editor's cursor position):
   - `leftShoulder` and `rightShoulder`: the shoulder seam points. `leftShoulder` is the wearer's left, which is on the **right side of the image**.
   - `leftHip` and `rightHip`: the side seams at the hem or hip line.
4. Tune `padding` (default 1.15) if the garment looks too narrow or too wide.

```json
{
  "version": 1,
  "id": "tee",
  "type": "clothing.top",
  "image": "tee.png",
  "anchors": {
    "leftShoulder": [352, 78],
    "rightShoulder": [160, 78],
    "leftHip": [378, 560],
    "rightHip": [134, 560]
  }
}
```

## Thumbnails

`thumbnail` (asset) and `swatch` or `thumbnail` (variant) are shown in the product switcher and shade picker. Square images around 128 px work best. SVG is fine.

## Testing an asset

1. `pnpm dev` in this repository and drop your files into `examples/playground/public/assets`.
2. Add the manifest to `catalog.json` or open `http://localhost:5173/?asset=<file-name-without-json>`.
3. Enable **Debug landmarks** to see tracking points and the FPS HUD.
4. Upload test photos in image mode to compare skin tones and lighting.
