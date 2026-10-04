import type { Matrix4, Quat, Vec3 } from '../domain/tracking.types';
import { quatFromBasis } from './quat';

/** Column major 4x4 identity. */
export function mat4Identity(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** Multiplies two column major matrices: out = a * b. */
export function mat4Multiply(a: Matrix4, b: Matrix4): number[] {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Transforms a point by a column major matrix (w = 1). */
export function mat4TransformPoint(m: Matrix4, p: Vec3): Vec3 {
  const at = (i: number) => m[i] ?? 0;
  const x = p[0];
  const y = p[1];
  const z = p[2];
  const w = at(3) * x + at(7) * y + at(11) * z + at(15) || 1;
  return [
    (at(0) * x + at(4) * y + at(8) * z + at(12)) / w,
    (at(1) * x + at(5) * y + at(9) * z + at(13)) / w,
    (at(2) * x + at(6) * y + at(10) * z + at(14)) / w,
  ];
}

export interface Decomposed {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

/** Splits an affine column major matrix into translation, rotation and scale. */
export function mat4Decompose(m: Matrix4): Decomposed {
  const at = (i: number) => m[i] ?? 0;
  const sx = Math.hypot(at(0), at(1), at(2)) || 1;
  const sy = Math.hypot(at(4), at(5), at(6)) || 1;
  const sz = Math.hypot(at(8), at(9), at(10)) || 1;
  const rotation = quatFromBasis(
    [at(0) / sx, at(1) / sx, at(2) / sx],
    [at(4) / sy, at(5) / sy, at(6) / sy],
    [at(8) / sz, at(9) / sz, at(10) / sz],
  );
  return { position: [at(12), at(13), at(14)], rotation, scale: [sx, sy, sz] };
}

/** Builds a column major matrix from translation, rotation and uniform or per axis scale. */
export function mat4Compose(position: Vec3, rotation: Quat, scale: Vec3 | number = 1): number[] {
  const [x, y, z, w] = rotation;
  const [sx, sy, sz] = typeof scale === 'number' ? [scale, scale, scale] : scale;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    position[0],
    position[1],
    position[2],
    1,
  ];
}
