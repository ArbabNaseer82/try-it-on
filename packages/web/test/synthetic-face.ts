import type { Landmark } from '@tryonit/core';
import { FACE, FACE_REGIONS } from '@tryonit/core';

/** Places every region ring on a small ellipse so geometry builders get valid polygons. */
export function syntheticFace(): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const ellipse = (indices: readonly number[], cx: number, cy: number, rx: number, ry: number) => {
    indices.forEach((index, i) => {
      const a = (i / indices.length) * Math.PI * 2;
      lm[index] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, z: 0 };
    });
  };
  ellipse(FACE_REGIONS.FACE_OVAL, 0.5, 0.5, 0.15, 0.22);
  ellipse(FACE_REGIONS.LIPS_OUTER, 0.5, 0.63, 0.045, 0.02);
  ellipse(FACE_REGIONS.LIPS_INNER, 0.5, 0.63, 0.03, 0.006);
  ellipse(FACE_REGIONS.RIGHT_EYE, 0.44, 0.45, 0.025, 0.008);
  ellipse(FACE_REGIONS.LEFT_EYE, 0.56, 0.45, 0.025, 0.008);
  ellipse(FACE_REGIONS.RIGHT_BROW, 0.44, 0.4, 0.03, 0.006);
  ellipse(FACE_REGIONS.LEFT_BROW, 0.56, 0.4, 0.03, 0.006);
  FACE_REGIONS.RIGHT_UPPER_LASH.forEach(
    (idx, i) =>
      (lm[idx] = { x: 0.415 + i * 0.006, y: 0.443 - Math.sin((i / 8) * Math.PI) * 0.006, z: 0 }),
  );
  FACE_REGIONS.LEFT_UPPER_LASH.forEach(
    (idx, i) =>
      (lm[idx] = { x: 0.585 - i * 0.006, y: 0.443 - Math.sin((i / 8) * Math.PI) * 0.006, z: 0 }),
  );
  FACE_REGIONS.RIGHT_BROW_LOWER.forEach(
    (idx, i) => (lm[idx] = { x: 0.41 + i * 0.012, y: 0.405, z: 0 }),
  );
  FACE_REGIONS.LEFT_BROW_LOWER.forEach(
    (idx, i) => (lm[idx] = { x: 0.59 - i * 0.012, y: 0.405, z: 0 }),
  );
  lm[FACE.RIGHT_FACE_EDGE] = { x: 0.35, y: 0.47, z: 0 };
  lm[FACE.LEFT_FACE_EDGE] = { x: 0.65, y: 0.47, z: 0 };
  lm[FACE.RIGHT_CHEEK] = { x: 0.42, y: 0.56, z: 0 };
  lm[FACE.LEFT_CHEEK] = { x: 0.58, y: 0.56, z: 0 };
  return lm;
}
