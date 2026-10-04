// Procedurally builds every sample asset (GLB models, PNG images, SVG thumbnails and JSON
// manifests) so the repository ships zero third party art and has no licensing questions.
// Usage: node scripts/generate-sample-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { EXAMPLES, publicDir, root } from './examples.mjs';

// GLTFExporter needs FileReader, which Node does not provide.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
        this.onload?.({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onloadend?.();
        this.onload?.({ target: this });
      });
    }
  };
}

const files = new Map(); // relative path -> Buffer | string

// Materials ------------------------------------------------------------------------
const metal = (color, roughness = 0.25) =>
  new THREE.MeshStandardMaterial({ color, metalness: 1, roughness });
const plastic = (color, roughness = 0.45) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0, roughness });
const lens = (color, opacity) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity,
  });

const mesh = (
  geometry,
  material,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.scale.set(...scale);
  return m;
};

// Models (millimeters, conventions documented in docs/ASSET_AUTHORING.md) -------------

/** Glasses: origin at the nose bridge, +X wearer's left, +Y up, +Z out of the face. */
function glasses({ name, rimShape, frame, lensColor, lensOpacity }) {
  const group = new THREE.Group();
  group.name = name;
  const lensCenterX = 32;
  for (const side of [-1, 1]) {
    const shape = rimShape();
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape.outer, {
        depth: 2.4,
        bevelEnabled: false,
        curveSegments: 32,
      }),
      frame,
    );
    rim.position.set(side * lensCenterX, -4, 3);
    if (side < 0) rim.scale.x = -1;
    group.add(rim);
    const glass = new THREE.Mesh(
      new THREE.ShapeGeometry(shape.inner, 32),
      lens(lensColor, lensOpacity),
    );
    glass.position.set(side * lensCenterX, -4, 4.2);
    if (side < 0) glass.scale.x = -1;
    group.add(glass);
    // Temple arm running back along -Z toward the ear.
    group.add(
      mesh(new THREE.BoxGeometry(2, 3.5, 135), frame, [side * 69, 2, -64], [0, side * 0.04, 0]),
    );
    group.add(mesh(new THREE.BoxGeometry(4, 6, 4), frame, [side * 68, 2, 2]));
  }
  // Bridge.
  group.add(mesh(new THREE.TorusGeometry(9, 1.3, 12, 24, Math.PI), frame, [0, -1, 4.2], [0, 0, 0]));
  return group;
}

function ringShape(radius, holeRadius, scaleY = 1) {
  const outer = new THREE.Shape().absellipse(
    0,
    0,
    radius,
    radius * scaleY,
    0,
    Math.PI * 2,
    false,
    0,
  );
  outer.holes.push(
    new THREE.Path().absellipse(0, 0, holeRadius, holeRadius * scaleY, 0, Math.PI * 2, true, 0),
  );
  const inner = new THREE.Shape().absellipse(
    0,
    0,
    holeRadius,
    holeRadius * scaleY,
    0,
    Math.PI * 2,
    false,
    0,
  );
  return { outer, inner };
}

function aviatorShape() {
  const teardrop = (r, inset) => {
    const s = new THREE.Shape();
    s.moveTo(-24 + inset, 10 - inset);
    s.bezierCurveTo(-10, 14 - inset, 18 - inset, 14 - inset, 25 - inset, 6 - inset * 0.5);
    s.bezierCurveTo(28 - inset, -8, 14, -26 + inset, -2, -24 + inset);
    s.bezierCurveTo(-18 + inset * 0.5, -22 + inset, -27 + inset, -4, -24 + inset, 10 - inset);
    return s;
  };
  const outer = teardrop(0, 0);
  outer.holes.push(teardrop(0, 2.2));
  return { outer, inner: teardrop(0, 2.2) };
}

/** Cap: origin at the hairline top center (landmark 10). Crown behind and above it. */
function cap() {
  const group = new THREE.Group();
  group.name = 'cap';
  const fabric = plastic(0x1f3a8a, 0.8);
  const crown = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  group.add(mesh(crown, fabric, [0, -8, -88], [0, 0, 0], [86, 92, 102]));
  const brim = new THREE.CylinderGeometry(1, 1, 1, 48, 1, false, -Math.PI / 2, Math.PI);
  group.add(mesh(brim, plastic(0x172554, 0.7), [0, -8, 6], [0.12, 0, 0], [80, 3, 82]));
  group.add(mesh(new THREE.SphereGeometry(6, 16, 12), fabric, [0, 84, -88]));
  return group;
}

/** Drop earring: origin at the piercing point, hanging toward -Y. */
function earring() {
  const group = new THREE.Group();
  group.name = 'earring';
  const gold = metal(0xd4a537, 0.2);
  group.add(mesh(new THREE.SphereGeometry(2.4, 16, 12), gold));
  group.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 8), gold, [0, -5.5, 0]));
  group.add(mesh(new THREE.SphereGeometry(5, 24, 16), plastic(0xf5f0e6, 0.15), [0, -14, 0]));
  return group;
}

/** Watch: origin at the wrist center, Y toward the fingers, Z out of the back of the hand. */
function watch() {
  const group = new THREE.Group();
  group.name = 'watch';
  const steel = metal(0xc0c4cc, 0.18);
  const strap = plastic(0x2b2b2b, 0.75);
  const band = new THREE.TorusGeometry(1, 0.09, 12, 64);
  group.add(mesh(band, strap, [0, 0, 0], [Math.PI / 2, 0, 0], [31, 21, 26]));
  const caseGeo = new THREE.CylinderGeometry(19, 19, 9, 48);
  group.add(mesh(caseGeo, steel, [0, 0, 22], [Math.PI / 2, 0, 0]));
  group.add(
    mesh(
      new THREE.CylinderGeometry(16.5, 16.5, 1, 48),
      plastic(0xf8fafc, 0.4),
      [0, 0, 26.6],
      [Math.PI / 2, 0, 0],
    ),
  );
  group.add(mesh(new THREE.BoxGeometry(1.4, 11, 0.8), plastic(0x111827), [0, 4.5, 27.4]));
  group.add(mesh(new THREE.BoxGeometry(8, 1.4, 0.8), plastic(0x111827), [3.5, 0, 27.6]));
  group.add(
    mesh(new THREE.CylinderGeometry(2, 2, 4, 16), steel, [20.5, 0, 22], [0, 0, Math.PI / 2]),
  );
  return group;
}

/** Ring: origin at the ring center, Y along the finger, Z toward the top of the finger. */
function ring() {
  const group = new THREE.Group();
  group.name = 'ring';
  const gold = metal(0xe0b44c, 0.15);
  group.add(mesh(new THREE.TorusGeometry(10.2, 1.3, 20, 64), gold, [0, 0, 0], [Math.PI / 2, 0, 0]));
  group.add(
    mesh(new THREE.CylinderGeometry(2.6, 2.6, 2, 12), gold, [0, 0, 11.3], [Math.PI / 2, 0, 0]),
  );
  const gem = new THREE.MeshStandardMaterial({
    color: 0xbfe9ff,
    metalness: 0,
    roughness: 0,
    transparent: true,
    opacity: 0.85,
  });
  group.add(
    mesh(new THREE.OctahedronGeometry(3.2), gem, [0, 0, 13.6], [0, 0, Math.PI / 4], [1, 1, 0.8]),
  );
  return group;
}

async function exportGlb(object) {
  const scene = new THREE.Scene();
  scene.add(object);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true });
  return Buffer.from(result);
}

// PNG encoder and tiny rasterizer -------------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const inside = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
/** Draws polygons with 4x supersampling. `shade(x, y)` returns [r, g, b]. */
function rasterize(width, height, layers) {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (const [sx, sy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        for (let l = layers.length - 1; l >= 0; l--) {
          const layer = layers[l];
          if (inside(layer.poly, x + sx, y + sy)) {
            const [cr, cg, cb] = layer.shade(x + sx, y + sy);
            r += cr;
            g += cg;
            b += cb;
            a += 255;
            break;
          }
        }
      }
      const i = (y * width + x) * 4;
      const n = a / 255;
      if (n > 0) {
        out[i] = Math.round(r / n);
        out[i + 1] = Math.round(g / n);
        out[i + 2] = Math.round(b / n);
      }
      out[i + 3] = Math.round(a / 4);
    }
  }
  return out;
}
const ellipse = (cx, cy, rx, ry, n = 64) =>
  Array.from({ length: n }, (_, i) => [
    cx + Math.cos((i / n) * Math.PI * 2) * rx,
    cy + Math.sin((i / n) * Math.PI * 2) * ry,
  ]);

/** Front facing t-shirt, 512x600, wearer's left shoulder on the image right. */
function tshirt(base) {
  const W = 512;
  const H = 600;
  const body = [
    [150, 70],
    [205, 40],
    [230, 62],
    [256, 70],
    [282, 62],
    [307, 40],
    [362, 70],
    [470, 150],
    [430, 235],
    [380, 205],
    [385, 590],
    [127, 590],
    [132, 205],
    [82, 235],
    [42, 150],
  ];
  const collar = ellipse(256, 46, 46, 30);
  const shade = (x, y) => {
    const fold = 0.88 + 0.12 * Math.cos((x / W) * Math.PI * 3) - (y / H) * 0.12;
    return base.map((c) => Math.max(0, Math.min(255, c * fold)));
  };
  const pixels = rasterize(W, H, [
    { poly: body, shade },
    // Inside of the back of the shirt, visible through the neckline.
    { poly: collar, shade: () => base.map((c) => c * 0.55) },
  ]);
  // The upper half of the neckline is open (transparent).
  for (let y = 0; y < 46; y++)
    for (let x = 0; x < W; x++)
      if (inside(collar, x + 0.5, y + 0.5)) pixels[(y * W + x) * 4 + 3] = 0;
  return {
    png: encodePng(W, H, pixels),
    anchors: {
      leftShoulder: [352, 78],
      rightShoulder: [160, 78],
      leftHip: [378, 560],
      rightHip: [134, 560],
    },
  };
}

/** Moustache sticker, 400x140: two tilted ellipses that lift toward the tips. */
function moustache() {
  const W = 400;
  const H = 140;
  const half = (side) => {
    const angle = side * -0.2;
    return ellipse(0, 0, 92, 24, 72).map(([x, y]) => [
      200 + side * 84 + x * Math.cos(angle) - y * Math.sin(angle),
      74 + x * Math.sin(angle) + y * Math.cos(angle),
    ]);
  };
  const shade = (_x, y) => [52 + y * 0.15, 34, 22];
  return encodePng(
    W,
    H,
    rasterize(W, H, [
      { poly: half(-1), shade },
      { poly: half(1), shade },
    ]),
  );
}

// SVG thumbnails -----------------------------------------------------------------
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128"><rect width="64" height="64" rx="12" fill="#f3f4f6"/>${body}</svg>\n`;
const THUMBS = {
  'glasses-round': svg(
    '<circle cx="21" cy="32" r="10" fill="none" stroke="#111" stroke-width="3"/><circle cx="43" cy="32" r="10" fill="none" stroke="#111" stroke-width="3"/><path d="M31 31q1-3 2 0" stroke="#111" stroke-width="3" fill="none"/>',
  ),
  'glasses-aviator': svg(
    '<path d="M8 26q12-4 22 0q0 14-10 14T8 26zM34 26q10-4 22 0q-2 14-12 14T34 26z" fill="#4b5563" stroke="#c9a227" stroke-width="2"/>',
  ),
  cap: svg(
    '<path d="M14 38a18 18 0 0 1 36 0z" fill="#1f3a8a"/><path d="M10 38h44q-4 6-22 6T10 38z" fill="#172554"/>',
  ),
  earrings: svg(
    '<circle cx="32" cy="18" r="3" fill="#d4a537"/><path d="M32 21v12" stroke="#d4a537" stroke-width="2"/><circle cx="32" cy="40" r="7" fill="#f5f0e6" stroke="#ddd"/>',
  ),
  watch: svg(
    '<rect x="24" y="6" width="16" height="52" rx="4" fill="#2b2b2b"/><circle cx="32" cy="32" r="13" fill="#f8fafc" stroke="#9ca3af" stroke-width="3"/><path d="M32 32V24M32 32h6" stroke="#111" stroke-width="2"/>',
  ),
  ring: svg(
    '<circle cx="32" cy="36" r="13" fill="none" stroke="#e0b44c" stroke-width="5"/><path d="M27 21l5-7 5 7-5 4z" fill="#bfe9ff" stroke="#7cc4e4"/>',
  ),
  moustache: svg(
    '<path d="M32 30q-10-8-22 2q8 6 22-2zM32 30q10-8 22 2q-8 6-22-2z" fill="#3a2a1c"/>',
  ),
  tshirt: svg(
    '<path d="M20 14l-10 8 5 9 5-3v28h24V28l5 3 5-9-10-8q-4 5-12 5t-12-5z" fill="#0f766e"/>',
  ),
  look: svg(
    '<circle cx="32" cy="32" r="18" fill="#f2d3c4"/><path d="M24 40q8 5 16 0q-8 2-16 0z" fill="#b0123a"/><ellipse cx="25" cy="28" rx="4" ry="2" fill="#6d4c7d"/><ellipse cx="39" cy="28" rx="4" ry="2" fill="#6d4c7d"/>',
  ),
};

// Manifests -------------------------------------------------------------------------
const schema = 'https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json';
const manifest = (data) => JSON.stringify({ $schema: schema, version: 1, ...data }, null, 2) + '\n';
const shades = (list) =>
  list.map(([id, name, color, extra]) => ({
    id,
    name,
    swatch: color,
    overrides: { color, ...extra },
  }));

function manifests(tshirtAnchors) {
  return {
    'lipstick.json': manifest({
      id: 'lipstick-velvet',
      type: 'makeup.lips',
      name: 'Velvet Lipstick',
      color: '#B0123A',
      finish: 'satin',
      variants: shades([
        ['ruby', 'Ruby', '#B0123A'],
        ['rosewood', 'Rosewood', '#8E3B46'],
        ['nude', 'Nude Beige', '#C48A7A', { finish: 'matte' }],
        ['coral', 'Coral Gloss', '#E2584D', { finish: 'gloss' }],
        ['berry', 'Berry', '#6E1E4A'],
        ['champagne', 'Champagne Shimmer', '#C99A84', { finish: 'shimmer' }],
      ]),
      defaultVariantId: 'ruby',
      meta: { sku: 'LIP-001', price: 19 },
    }),
    'blush.json': manifest({
      id: 'blush-glow',
      type: 'makeup.blush',
      name: 'Glow Blush',
      color: '#E8838B',
      variants: shades([
        ['petal', 'Petal', '#E8838B'],
        ['peach', 'Peach', '#F0A07A'],
        ['plum', 'Plum', '#B0546E'],
      ]),
    }),
    'eyeshadow.json': manifest({
      id: 'eyeshadow-trio',
      type: 'makeup.eyeshadow',
      name: 'Eyeshadow Trio',
      color: '#6D4C7D',
      variants: shades([
        ['amethyst', 'Amethyst', '#6D4C7D'],
        ['bronze', 'Bronze Shimmer', '#9C6B3C', { finish: 'shimmer' }],
        ['taupe', 'Satin Taupe', '#8A7568', { finish: 'satin' }],
      ]),
    }),
    'eyeliner.json': manifest({
      id: 'eyeliner-wing',
      type: 'makeup.eyeliner',
      name: 'Winged Liner',
      color: '#141414',
      wing: true,
      thickness: 0.45,
    }),
    'brows.json': manifest({
      id: 'brow-tint',
      type: 'makeup.brows',
      name: 'Brow Tint',
      color: '#4A3426',
      opacity: 0.45,
    }),
    'foundation.json': manifest({
      id: 'foundation-skin',
      type: 'makeup.foundation',
      name: 'Skin Tint',
      color: '#D9A98A',
      opacity: 0.3,
      coverage: 0.45,
    }),
    'look.json': manifest({
      id: 'look-evening',
      type: 'makeup.look',
      name: 'Evening Look',
      thumbnail: 'thumbs/look.svg',
      layers: [
        { type: 'makeup.foundation', color: '#D9A98A', opacity: 0.25 },
        { type: 'makeup.blush', color: '#D9707A', opacity: 0.3 },
        { type: 'makeup.eyeshadow', color: '#6D4C7D', opacity: 0.45, finish: 'shimmer' },
        { type: 'makeup.eyeliner', color: '#111111', wing: true },
        { type: 'makeup.lips', color: '#9E1030', finish: 'gloss' },
      ],
    }),
    'hair.json': manifest({
      id: 'hair-color',
      type: 'hair.color',
      name: 'Hair Color',
      color: '#7A2E1E',
      variants: shades([
        ['auburn', 'Auburn', '#7A2E1E'],
        ['honey', 'Honey Blonde', '#C59A55'],
        ['violet', 'Violet', '#5B2A86'],
      ]),
    }),
    'glasses-round.json': manifest({
      id: 'glasses-round',
      type: 'glasses',
      name: 'Round Frames',
      model: 'models3d/glasses-round.glb',
      thumbnail: 'thumbs/glasses-round.svg',
      meta: { sku: 'EYE-ROUND' },
    }),
    'glasses-aviator.json': manifest({
      id: 'glasses-aviator',
      type: 'glasses',
      name: 'Aviator',
      model: 'models3d/glasses-aviator.glb',
      thumbnail: 'thumbs/glasses-aviator.svg',
      meta: { sku: 'EYE-AVI' },
    }),
    'cap.json': manifest({
      id: 'cap-classic',
      type: 'hat',
      name: 'Classic Cap',
      model: 'models3d/cap.glb',
      thumbnail: 'thumbs/cap.svg',
    }),
    'earrings.json': manifest({
      id: 'earrings-pearl',
      type: 'earrings',
      name: 'Pearl Drops',
      model: 'models3d/earring.glb',
      thumbnail: 'thumbs/earrings.svg',
    }),
    'moustache.json': manifest({
      id: 'sticker-moustache',
      type: 'face.overlay2d',
      name: 'Moustache',
      image: 'images/moustache.png',
      anchor: 'mouth',
      scale: 0.55,
      offset: [0, -0.09],
      thumbnail: 'thumbs/moustache.svg',
    }),
    'watch.json': manifest({
      id: 'watch-classic',
      type: 'watch',
      name: 'Classic Watch',
      model: 'models3d/watch.glb',
      thumbnail: 'thumbs/watch.svg',
      wristWidthMm: 60,
    }),
    'ring.json': manifest({
      id: 'ring-solitaire',
      type: 'ring',
      name: 'Solitaire Ring',
      model: 'models3d/ring.glb',
      thumbnail: 'thumbs/ring.svg',
      sizeMm: 18,
      variants: [
        { id: 'ring-finger', name: 'Ring finger', overrides: { finger: 'ring' } },
        { id: 'index-finger', name: 'Index finger', overrides: { finger: 'index' } },
      ],
    }),
    'tshirt.json': manifest({
      id: 'tshirt-basic',
      type: 'clothing.top',
      name: 'Basic Tee (experimental)',
      image: 'images/tshirt-teal.png',
      anchors: tshirtAnchors,
      thumbnail: 'thumbs/tshirt.svg',
      variants: [
        { id: 'teal', name: 'Teal', swatch: '#0F766E' },
        {
          id: 'coral',
          name: 'Coral',
          swatch: '#E2584D',
          overrides: { image: 'images/tshirt-coral.png' },
        },
      ],
    }),
  };
}

const CATALOG = {
  Makeup: [
    'lipstick.json',
    'blush.json',
    'eyeshadow.json',
    'eyeliner.json',
    'brows.json',
    'foundation.json',
    'look.json',
  ],
  Hair: ['hair.json'],
  Eyewear: ['glasses-round.json', 'glasses-aviator.json'],
  Headwear: ['cap.json'],
  Jewelry: ['earrings.json', 'ring.json'],
  Watches: ['watch.json'],
  Stickers: ['moustache.json'],
  'Clothing (experimental)': ['tshirt.json'],
};

// Build ------------------------------------------------------------------------------
console.log('building models...');
files.set(
  'models3d/glasses-round.glb',
  await exportGlb(
    glasses({
      name: 'glasses-round',
      rimShape: () => ringShape(24, 21.5),
      frame: plastic(0x1f1f1f, 0.35),
      lensColor: 0xffffff,
      lensOpacity: 0.12,
    }),
  ),
);
files.set(
  'models3d/glasses-aviator.glb',
  await exportGlb(
    glasses({
      name: 'glasses-aviator',
      rimShape: aviatorShape,
      frame: metal(0xc9a227, 0.2),
      lensColor: 0x2f3b2f,
      lensOpacity: 0.72,
    }),
  ),
);
files.set('models3d/cap.glb', await exportGlb(cap()));
files.set('models3d/earring.glb', await exportGlb(earring()));
files.set('models3d/watch.glb', await exportGlb(watch()));
files.set('models3d/ring.glb', await exportGlb(ring()));
console.log('building images...');
const teal = tshirt([15, 118, 110]);
files.set('images/tshirt-teal.png', teal.png);
files.set('images/tshirt-coral.png', tshirt([226, 88, 77]).png);
files.set('images/moustache.png', moustache());
for (const [name, content] of Object.entries(THUMBS)) files.set(`thumbs/${name}.svg`, content);
for (const [name, content] of Object.entries(manifests(teal.anchors))) files.set(name, content);
files.set('catalog.json', JSON.stringify(CATALOG, null, 2) + '\n');

let targets = 0;
for (const example of EXAMPLES) {
  const dir = join(publicDir(example), 'assets');
  for (const [rel, content] of files) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  targets++;
}
// A small committed subset in /samples, served by jsDelivr from GitHub for the React Native
// example: https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples/<file>
const SAMPLES = [
  'lipstick.json',
  'look.json',
  'thumbs/look.svg',
  'hair.json',
  'eyeshadow.json',
  'glasses-aviator.json',
  'models3d/glasses-aviator.glb',
  'thumbs/glasses-aviator.svg',
  'glasses-round.json',
  'models3d/glasses-round.glb',
  'thumbs/glasses-round.svg',
  'earrings.json',
  'models3d/earring.glb',
  'thumbs/earrings.svg',
  'moustache.json',
  'images/moustache.png',
  'thumbs/moustache.svg',
];
for (const rel of SAMPLES) {
  const full = join(root, 'samples', rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, files.get(rel));
}

// Also keep a copy for tests and tooling.
const cacheDir = join(root, '.cache', 'assets');
for (const [rel, content] of files) {
  mkdirSync(join(cacheDir, rel, '..'), { recursive: true });
  writeFileSync(join(cacheDir, rel), content);
}
console.log(`wrote ${files.size} files to ${targets} example(s) and .cache/assets`);
