import type { Vec2 } from '../domain/tracking.types';

/** Signed area of a polygon. Positive for counter clockwise in a y up system. */
export function polygonArea(points: readonly Vec2[]): number {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i] as Vec2;
    const [xj, yj] = points[j] as Vec2;
    area += (xj - xi) * (yj + yi);
  }
  return area / 2;
}

function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
  const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
  const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/**
 * Ear clipping triangulation for a simple polygon. Returns indices into `points`.
 * Robust enough for face regions (20 to 40 points per polygon, computed every frame).
 */
export function triangulate(points: readonly Vec2[]): number[] {
  const n = points.length;
  if (n < 3) return [];
  const order = Array.from({ length: n }, (_, i) => i);
  // Normalize winding so convexity tests are consistent.
  if (polygonArea(points) < 0) order.reverse();
  const out: number[] = [];
  let guard = 0;
  while (order.length > 3 && guard < n * n) {
    guard++;
    let clipped = false;
    for (let i = 0; i < order.length; i++) {
      const ia = order[(i + order.length - 1) % order.length] as number;
      const ib = order[i] as number;
      const ic = order[(i + 1) % order.length] as number;
      const a = points[ia] as Vec2;
      const b = points[ib] as Vec2;
      const c = points[ic] as Vec2;
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross <= 0) continue; // reflex or degenerate in this winding
      let inside = false;
      for (const idx of order) {
        if (idx === ia || idx === ib || idx === ic) continue;
        if (pointInTriangle(points[idx] as Vec2, a, b, c)) {
          inside = true;
          break;
        }
      }
      if (inside) continue;
      out.push(ia, ib, ic);
      order.splice(i, 1);
      clipped = true;
      break;
    }
    // Self intersecting input: fall back to a fan so we never hang.
    if (!clipped) break;
  }
  if (order.length >= 3) {
    for (let i = 1; i < order.length - 1; i++) out.push(order[0]!, order[i]!, order[i + 1]!);
  }
  return out;
}
