import type { Vec2 } from '../domain/tracking.types';

/** 3x3 homography in row major order (9 numbers, h[8] normalized to 1). */
export type Homography = [number, number, number, number, number, number, number, number, number];

/**
 * Solves the perspective transform that maps 4 source points onto 4 destination points.
 * Returns null when the points are degenerate (three collinear points).
 */
export function computeHomography(src: readonly Vec2[], dst: readonly Vec2[]): Homography | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  // Build the 8x8 linear system A * h = b.
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i] as Vec2;
    const [u, v] = dst[i] as Vec2;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(a, b);
  if (!h) return null;
  return [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!, 1];
}

/** Applies a homography to a point. */
export function applyHomography(h: Homography, p: Vec2): Vec2 {
  const [x, y] = p;
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

/** Gaussian elimination with partial pivoting. Returns null for singular systems. */
function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-10) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const pr = m[col]!;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const r = m[row]!;
      const factor = r[col]! / pr[col]!;
      for (let k = col; k <= n; k++) r[k] = r[k]! - factor * pr[k]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

/**
 * Builds a subdivided grid mesh (positions in destination space, UVs in 0..1) warped by a
 * homography. Used to render garments so they bend smoothly instead of as one flat quad.
 */
export function warpGrid(
  h: Homography,
  imageWidth: number,
  imageHeight: number,
  segments = 8,
): { positions: Float32Array; uvs: Float32Array; indices: Uint16Array } {
  const verts = (segments + 1) * (segments + 1);
  const positions = new Float32Array(verts * 2);
  const uvs = new Float32Array(verts * 2);
  const indices = new Uint16Array(segments * segments * 6);
  let p = 0;
  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const v = j / segments;
      const [x, y] = applyHomography(h, [u * imageWidth, v * imageHeight]);
      positions[p] = x;
      positions[p + 1] = y;
      uvs[p] = u;
      uvs[p + 1] = v;
      p += 2;
    }
  }
  let k = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { positions, uvs, indices };
}
