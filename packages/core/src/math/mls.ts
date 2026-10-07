import type { Vec2 } from '../domain/tracking.types';

/**
 * Moving least squares image deformation, similarity variant (Schaefer, McPhail and Warren,
 * "Image Deformation Using Moving Least Squares", 2006).
 *
 * Every point gets its own rotation, uniform scale and translation, fitted to the control
 * points and weighted toward the closest ones. The result passes exactly through every control
 * point and bends smoothly in between, which is what a garment needs: sleeves turn with the
 * arms while the chest keeps its print undistorted.
 *
 * Both point sets must use the same isotropic units (pixels, not normalized x and y).
 * `alpha` controls how local the fit is: higher values follow nearby points more closely.
 */
export function createMlsDeformer(
  src: readonly Vec2[],
  dst: readonly Vec2[],
  alpha = 1.5,
): (point: Vec2) => Vec2 {
  const n = Math.min(src.length, dst.length);
  const weights = new Float64Array(n);
  return ([vx, vy]) => {
    if (n === 0) return [vx, vy];
    let sum = 0;
    let px = 0;
    let py = 0;
    let qx = 0;
    let qy = 0;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = src[i] as Vec2;
      const [tx, ty] = dst[i] as Vec2;
      const d2 = (sx - vx) ** 2 + (sy - vy) ** 2;
      if (d2 < 1e-12) return [tx, ty];
      const w = 1 / d2 ** alpha;
      weights[i] = w;
      sum += w;
      px += w * sx;
      py += w * sy;
      qx += w * tx;
      qy += w * ty;
    }
    px /= sum;
    py /= sum;
    qx /= sum;
    qy /= sum;
    // Best similarity as a complex number: M = sum(w q^ conj(p^)) / sum(w |p^|^2).
    let re = 0;
    let im = 0;
    let mu = 0;
    for (let i = 0; i < n; i++) {
      const w = weights[i] as number;
      const ax = (src[i] as Vec2)[0] - px;
      const ay = (src[i] as Vec2)[1] - py;
      const bx = (dst[i] as Vec2)[0] - qx;
      const by = (dst[i] as Vec2)[1] - qy;
      re += w * (bx * ax + by * ay);
      im += w * (by * ax - bx * ay);
      mu += w * (ax * ax + ay * ay);
    }
    const dx = vx - px;
    const dy = vy - py;
    if (mu < 1e-12) return [qx + dx, qy + dy];
    re /= mu;
    im /= mu;
    return [qx + re * dx - im * dy, qy + im * dx + re * dy];
  };
}

/**
 * Builds a subdivided grid over an image (UVs 0..1) whose vertices are moved by `map`, which
 * receives image pixel coordinates. Same layout as `warpGrid`.
 */
export function deformGrid(
  map: (point: Vec2) => Vec2,
  imageWidth: number,
  imageHeight: number,
  columns = 24,
  rows = 24,
): { positions: Float32Array; uvs: Float32Array; indices: Uint16Array } {
  const verts = (columns + 1) * (rows + 1);
  const positions = new Float32Array(verts * 2);
  const uvs = new Float32Array(verts * 2);
  const indices = new Uint16Array(columns * rows * 6);
  let p = 0;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const u = i / columns;
      const v = j / rows;
      const [x, y] = map([u * imageWidth, v * imageHeight]);
      positions[p] = x;
      positions[p + 1] = y;
      uvs[p] = u;
      uvs[p + 1] = v;
      p += 2;
    }
  }
  let k = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { positions, uvs, indices };
}
