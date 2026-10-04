import { describe, expect, it } from 'vitest';
import {
  OneEuroFilter,
  VectorFilter,
  applyHomography,
  computeHomography,
  mat4Compose,
  mat4Decompose,
  mat4Identity,
  mat4Multiply,
  mat4TransformPoint,
  polygonArea,
  quatAngle,
  quatFromBasis,
  quatFromEuler,
  quatMultiply,
  quatNormalize,
  quatRotateVec3,
  quatSlerp,
  triangulate,
  warpGrid,
  type Quat,
  type Vec2,
} from '../src';
import {
  add3,
  clamp,
  cross3,
  distance2,
  dot3,
  length3,
  lerp,
  lerp2,
  lerp3,
  normalize3,
  scale3,
  sub3,
  vec3,
} from '../src/math/vec';

const close = (a: readonly number[], b: readonly number[], eps = 1e-6) =>
  a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < eps);

describe('vec', () => {
  it('basic operations', () => {
    expect(vec3()).toEqual([0, 0, 0]);
    expect(add3([1, 2, 3], [1, 1, 1])).toEqual([2, 3, 4]);
    expect(sub3([1, 2, 3], [1, 1, 1])).toEqual([0, 1, 2]);
    expect(scale3([1, 2, 3], 2)).toEqual([2, 4, 6]);
    expect(dot3([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(cross3([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(length3([3, 4, 0])).toBe(5);
    expect(normalize3([0, 0, 0])).toEqual([0, 0, 0]);
    expect(normalize3([0, 3, 0])).toEqual([0, 1, 0]);
    expect(lerp3([0, 0, 0], [2, 2, 2], 0.5)).toEqual([1, 1, 1]);
    expect(distance2([0, 0], [3, 4])).toBe(5);
    expect(lerp2([0, 0], [2, 4], 0.5)).toEqual([1, 2]);
    expect(lerp(0, 10, 0.3)).toBeCloseTo(3);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('quat and mat4', () => {
  it('euler, rotate and multiply', () => {
    const q = quatFromEuler(0, Math.PI / 2, 0);
    expect(close(quatRotateVec3(q, [1, 0, 0]), [0, 0, -1])).toBe(true);
    const qq = quatMultiply(q, q);
    expect(close(quatRotateVec3(qq, [1, 0, 0]), [-1, 0, 0])).toBe(true);
    expect(quatNormalize([0, 0, 0, 0])).toEqual([0, 0, 0, 1]);
  });

  it('basis round trips through every branch', () => {
    const rotations: Quat[] = [
      quatFromEuler(0.1, 0.2, 0.3),
      quatFromEuler(Math.PI, 0, 0),
      quatFromEuler(0, Math.PI, 0),
      quatFromEuler(0, 0, Math.PI),
    ];
    for (const q of rotations) {
      const basis = quatFromBasis(
        quatRotateVec3(q, [1, 0, 0]),
        quatRotateVec3(q, [0, 1, 0]),
        quatRotateVec3(q, [0, 0, 1]),
      );
      expect(quatAngle(basis, q)).toBeLessThan(1e-5);
    }
  });

  it('slerp follows the short path', () => {
    const a = quatFromEuler(0, 0, 0);
    const b = quatFromEuler(0, 0, Math.PI / 2);
    const mid = quatSlerp(a, b, 0.5);
    expect(quatAngle(mid, quatFromEuler(0, 0, Math.PI / 4))).toBeLessThan(1e-6);
    const negB: Quat = [-b[0], -b[1], -b[2], -b[3]];
    expect(quatAngle(quatSlerp(a, negB, 0.5), mid)).toBeLessThan(1e-6);
    expect(quatAngle(quatSlerp(a, a, 0.5), a)).toBeLessThan(1e-6);
  });

  it('compose, decompose, multiply, transform', () => {
    const q = quatFromEuler(0.3, -0.2, 0.1);
    const m = mat4Compose([1, 2, 3], q, 2);
    const d = mat4Decompose(m);
    expect(close(d.position, [1, 2, 3])).toBe(true);
    expect(close(d.scale, [2, 2, 2])).toBe(true);
    expect(quatAngle(d.rotation, q)).toBeLessThan(1e-5);
    expect(mat4Multiply(mat4Identity(), m)).toEqual(m.map((v) => v + 0));
    expect(
      close(
        mat4TransformPoint(mat4Compose([1, 0, 0], [0, 0, 0, 1], [1, 2, 3]), [1, 1, 1]),
        [2, 2, 3],
      ),
    ).toBe(true);
  });
});

describe('OneEuroFilter', () => {
  it('passes the first value, smooths jitter and resets', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    expect(f.filter(10, 0)).toBe(10);
    let out = 10;
    for (let i = 1; i <= 30; i++) out = f.filter(i % 2 === 0 ? 10.5 : 9.5, i * 33);
    expect(Math.abs(out - 10)).toBeLessThan(0.5);
    f.reset();
    expect(f.filter(42, 2000)).toBe(42);
  });

  it('beta reduces lag on fast motion', () => {
    const slow = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    const fast = new OneEuroFilter({ minCutoff: 1, beta: 1 });
    let a = 0;
    let b = 0;
    for (let i = 0; i < 10; i++) {
      a = slow.filter(i * 10, i * 16);
      b = fast.filter(i * 10, i * 16);
    }
    expect(b).toBeGreaterThan(a);
  });

  it('vector filter filters each component', () => {
    const v = new VectorFilter();
    expect(v.filter([1, 2, 3], 0)).toEqual([1, 2, 3]);
    const next = v.filter([2, 3, 4], 16);
    expect(next.length).toBe(3);
    v.reset();
    expect(v.filter([5, 5, 5], 32)).toEqual([5, 5, 5]);
  });
});

describe('homography', () => {
  it('maps the 4 source points to the destination points', () => {
    const src: Vec2[] = [
      [0, 0],
      [100, 0],
      [100, 200],
      [0, 200],
    ];
    const dst: Vec2[] = [
      [0.3, 0.2],
      [0.7, 0.25],
      [0.65, 0.8],
      [0.35, 0.78],
    ];
    const h = computeHomography(src, dst);
    expect(h).not.toBeNull();
    src.forEach((p, i) => expect(close(applyHomography(h!, p), dst[i]!, 1e-9)).toBe(true));
  });

  it('returns null for degenerate input', () => {
    expect(
      computeHomography(
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
        ],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ),
    ).toBeNull();
    expect(computeHomography([[0, 0]], [[0, 0]])).toBeNull();
  });

  it('warpGrid builds a subdivided mesh', () => {
    const h = computeHomography(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ],
    )!;
    const grid = warpGrid(h, 1, 1, 8);
    expect(grid.positions.length).toBe(81 * 2);
    expect(grid.indices.length).toBe(64 * 6);
    expect(grid.positions[grid.positions.length - 2]).toBeCloseTo(2);
    expect(grid.uvs[grid.uvs.length - 1]).toBe(1);
  });
});

describe('triangulate', () => {
  const area = (pts: Vec2[], idx: number[]) => {
    let total = 0;
    for (let i = 0; i < idx.length; i += 3) {
      total += Math.abs(polygonArea([pts[idx[i]!]!, pts[idx[i + 1]!]!, pts[idx[i + 2]!]!]));
    }
    return total;
  };

  it('triangulates convex and concave polygons in both windings', () => {
    const square: Vec2[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(area(square, triangulate(square))).toBeCloseTo(1);
    expect(area([...square].reverse(), triangulate([...square].reverse()))).toBeCloseTo(1);
    const lShape: Vec2[] = [
      [0, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [0, 2],
    ];
    const idx = triangulate(lShape);
    expect(idx.length).toBe(12);
    expect(area(lShape, idx)).toBeCloseTo(3);
  });

  it('handles tiny inputs and self intersecting polygons without hanging', () => {
    expect(
      triangulate([
        [0, 0],
        [1, 1],
      ]),
    ).toEqual([]);
    const bowtie: Vec2[] = [
      [0, 0],
      [1, 1],
      [1, 0],
      [0, 1],
    ];
    expect(triangulate(bowtie).length % 3).toBe(0);
  });
});
