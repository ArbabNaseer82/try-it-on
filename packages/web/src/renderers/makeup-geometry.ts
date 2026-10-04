import {
  FACE,
  FACE_REGIONS,
  triangulate,
  type Landmark,
  type MakeupLayer,
  type Vec2,
} from '@tryonit/core';

/** One draw call for the mask pass, in normalized image coordinates. */
export interface MaskShape {
  /** Triangle list positions (x, y pairs). */
  positions: number[];
  /** Local coordinates for disc shapes (x, y pairs, -1..1). Empty for polygons. */
  local: number[];
  value: number;
  disc: boolean;
}

export interface LayerGeometry {
  shapes: MaskShape[];
  /** Feather radius in pixels of the full resolution frame. */
  featherPx: number;
}

interface Ctx {
  lm: readonly Landmark[];
  width: number;
  height: number;
}

const px = (c: Ctx, i: number): Vec2 => {
  const l = c.lm[i] as Landmark;
  return [l.x * c.width, l.y * c.height];
};
const toNorm = (c: Ctx, p: Vec2): Vec2 => [p[0] / c.width, p[1] / c.height];
const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function polygonShape(c: Ctx, points: Vec2[], value: number): MaskShape {
  const indices = triangulate(points);
  const positions: number[] = [];
  for (const i of indices) {
    const [x, y] = toNorm(c, points[i] as Vec2);
    positions.push(x, y);
  }
  return { positions, local: [], value, disc: false };
}

const ring = (c: Ctx, indices: readonly number[]) => indices.map((i) => px(c, i));

function discShape(
  c: Ctx,
  center: Vec2,
  rx: number,
  ry: number,
  angle: number,
  value: number,
): MaskShape {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corner = (lx: number, ly: number): Vec2 =>
    toNorm(c, [
      center[0] + lx * rx * cos - ly * ry * sin,
      center[1] + lx * rx * sin + ly * ry * cos,
    ]);
  const quad: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  const positions: number[] = [];
  const local: number[] = [];
  for (const [lx, ly] of quad) {
    positions.push(...corner(lx, ly));
    local.push(lx, ly);
  }
  return { positions, local, value, disc: true };
}

/** Thick polyline as triangles, `widths` per point, offset along `normals`. */
function stripShape(
  c: Ctx,
  points: Vec2[],
  normals: Vec2[],
  widths: number[],
  inner: number,
): MaskShape {
  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as Vec2;
    const b = points[i + 1] as Vec2;
    const na = normals[i] as Vec2;
    const nb = normals[i + 1] as Vec2;
    const wa = widths[i] as number;
    const wb = widths[i + 1] as number;
    const a0: Vec2 = [a[0] - na[0] * wa * inner, a[1] - na[1] * wa * inner];
    const a1: Vec2 = [a[0] + na[0] * wa, a[1] + na[1] * wa];
    const b0: Vec2 = [b[0] - nb[0] * wb * inner, b[1] - nb[1] * wb * inner];
    const b1: Vec2 = [b[0] + nb[0] * wb, b[1] + nb[1] * wb];
    for (const p of [a0, a1, b0, b0, a1, b1]) positions.push(...toNorm(c, p));
  }
  return { positions, local: [], value: 1, disc: false };
}

function centroid(points: Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

/** Normals of a polyline pointing away from `away`. */
function normalsAway(points: Vec2[], away: Vec2): Vec2[] {
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)] as Vec2;
    const next = points[Math.min(points.length - 1, i + 1)] as Vec2;
    let n: Vec2 = [-(next[1] - prev[1]), next[0] - prev[0]];
    const len = Math.hypot(n[0], n[1]) || 1;
    n = [n[0] / len, n[1] / len];
    if ((p[0] - away[0]) * n[0] + (p[1] - away[1]) * n[1] < 0) n = [-n[0], -n[1]];
    return n;
  });
}

function eyeWidth(c: Ctx, side: 'left' | 'right'): number {
  return side === 'left'
    ? dist(px(c, FACE.LEFT_EYE_OUTER), px(c, FACE.LEFT_EYE_INNER))
    : dist(px(c, FACE.RIGHT_EYE_OUTER), px(c, FACE.RIGHT_EYE_INNER));
}

const SIDES = [
  {
    side: 'right',
    lash: FACE_REGIONS.RIGHT_UPPER_LASH,
    eye: FACE_REGIONS.RIGHT_EYE,
    browLower: FACE_REGIONS.RIGHT_BROW_LOWER,
    brow: FACE_REGIONS.RIGHT_BROW,
    cheek: FACE.RIGHT_CHEEK,
    edge: FACE.RIGHT_FACE_EDGE,
  },
  {
    side: 'left',
    lash: FACE_REGIONS.LEFT_UPPER_LASH,
    eye: FACE_REGIONS.LEFT_EYE,
    browLower: FACE_REGIONS.LEFT_BROW_LOWER,
    brow: FACE_REGIONS.LEFT_BROW,
    cheek: FACE.LEFT_CHEEK,
    edge: FACE.LEFT_FACE_EDGE,
  },
] as const;

/**
 * Builds the mask geometry of one makeup layer from (smoothed) face landmarks.
 * Pure function, no GL, so it can be unit tested.
 */
export function buildLayerGeometry(
  layer: MakeupLayer,
  landmarks: readonly Landmark[],
  width: number,
  height: number,
): LayerGeometry {
  const c: Ctx = { lm: landmarks, width, height };
  const faceWidth = dist(px(c, FACE.RIGHT_FACE_EDGE), px(c, FACE.LEFT_FACE_EDGE));
  switch (layer.type) {
    case 'makeup.lips':
      return {
        shapes: [
          polygonShape(c, ring(c, FACE_REGIONS.LIPS_OUTER), 1),
          polygonShape(c, ring(c, FACE_REGIONS.LIPS_INNER), 0),
        ],
        featherPx: Math.max(1.5, faceWidth * 0.008),
      };
    case 'makeup.foundation':
      return {
        shapes: [
          polygonShape(c, ring(c, FACE_REGIONS.FACE_OVAL), 1),
          ...SIDES.flatMap((s) => [
            polygonShape(c, ring(c, s.eye), 0),
            polygonShape(c, ring(c, s.brow), 0),
          ]),
          polygonShape(c, ring(c, FACE_REGIONS.LIPS_OUTER), 0),
        ],
        featherPx: Math.max(3, faceWidth * 0.035),
      };
    case 'makeup.brows':
      return {
        shapes: SIDES.map((s) => polygonShape(c, ring(c, s.brow), 1)),
        featherPx: Math.max(1.5, faceWidth * 0.01),
      };
    case 'makeup.blush': {
      const size = layer.size ?? 0.5;
      const rx = faceWidth * (0.08 + 0.1 * size);
      const re = px(c, FACE.RIGHT_EYE_OUTER);
      const le = px(c, FACE.LEFT_EYE_OUTER);
      const angle = Math.atan2(le[1] - re[1], le[0] - re[0]);
      return {
        shapes: SIDES.map((s) => {
          const center = lerp2(px(c, s.cheek), px(c, s.edge), 0.28);
          center[1] -= faceWidth * 0.02;
          return discShape(c, center, rx, rx * 0.72, angle, 1);
        }),
        featherPx: Math.max(2, faceWidth * 0.02),
      };
    }
    case 'makeup.eyeshadow': {
      const shapes: MaskShape[] = [];
      let feather = 2;
      for (const s of SIDES) {
        const lash = ring(c, s.lash);
        const brow = ring(c, s.browLower);
        // Upper edge: halfway between the lash line and the lower brow edge.
        const top = brow.map((b, j) =>
          lerp2(lash[Math.round((j * (lash.length - 1)) / (brow.length - 1))] as Vec2, b, 0.55),
        );
        shapes.push(polygonShape(c, [...lash, ...top.reverse()], 1));
        shapes.push(polygonShape(c, ring(c, s.eye), 0));
        feather = Math.max(feather, eyeWidth(c, s.side) * 0.14);
      }
      return { shapes, featherPx: feather };
    }
    case 'makeup.eyeliner': {
      const shapes: MaskShape[] = [];
      const thickness = layer.thickness ?? 0.35;
      for (const s of SIDES) {
        const lash = ring(c, s.lash);
        const ew = eyeWidth(c, s.side);
        const center = centroid(ring(c, s.eye));
        const normals = normalsAway(lash, center);
        const base = 1 + ew * (0.02 + 0.09 * thickness);
        // Thick at the outer corner, tapering toward the inner corner.
        const widths = lash.map((_, i) => base * (1 - (0.65 * i) / (lash.length - 1)));
        shapes.push(stripShape(c, lash, normals, widths, 0.25));
        if (layer.wing) {
          const p0 = lash[0] as Vec2;
          const p2 = lash[2] as Vec2;
          const n0 = normals[0] as Vec2;
          const d: Vec2 = [p0[0] - p2[0], p0[1] - p2[1]];
          const dl = Math.hypot(d[0], d[1]) || 1;
          const dir: Vec2 = [(d[0] / dl) * 0.8 + n0[0] * 0.6, (d[1] / dl) * 0.8 + n0[1] * 0.6];
          const tip: Vec2 = [p0[0] + dir[0] * ew * 0.3, p0[1] + dir[1] * ew * 0.3];
          const w = widths[0] as number;
          const tri = [
            [p0[0] + n0[0] * w, p0[1] + n0[1] * w],
            [p0[0] - n0[0] * w * 0.25, p0[1] - n0[1] * w * 0.25],
            tip,
          ] as Vec2[];
          shapes.push({
            positions: tri.flatMap((p) => toNorm(c, p)),
            local: [],
            value: 1,
            disc: false,
          });
        }
      }
      return { shapes, featherPx: Math.max(0.8, faceWidth * 0.003) };
    }
  }
}

/** Draw order for a full look: base first, details last. */
export const LAYER_ORDER: Record<MakeupLayer['type'], number> = {
  'makeup.foundation': 0,
  'makeup.blush': 1,
  'makeup.brows': 2,
  'makeup.eyeshadow': 3,
  'makeup.eyeliner': 4,
  'makeup.lips': 5,
};
