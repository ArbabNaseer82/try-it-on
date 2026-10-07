import type { ClothingAnchors } from '../domain/asset.types';
import type { Vec2 } from '../domain/tracking.types';
import type { BodyRig } from './body-anchors';

/** How much narrower a sleeve opening sits on the arm than in a flat lay photo. */
const SLEEVE_DRAPE = 0.78;

const OPTIONAL_POINTS = [
  'neck',
  'leftArmpit',
  'rightArmpit',
  'leftSleeve',
  'rightSleeve',
  'leftWaist',
  'rightWaist',
] as const;

/** True when a garment marks more than its four corners, which turns on fitted mode. */
export function isFittedGarment(anchors: ClothingAnchors): boolean {
  return OPTIONAL_POINTS.some((key) => anchors[key] !== undefined);
}

export interface GarmentControls {
  /** Garment image pixels. */
  src: Vec2[];
  /** Frame pixels. */
  dst: Vec2[];
}

const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: Vec2) => Math.hypot(a[0], a[1]) || 1e-9;
const unit = (a: Vec2): Vec2 => [a[0] / len(a), a[1] / len(a)];
const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const rotate = ([x, y]: Vec2, angle: number): Vec2 => [
  x * Math.cos(angle) - y * Math.sin(angle),
  x * Math.sin(angle) + y * Math.cos(angle),
];

/** Point on a polyline of [t, point] pairs at height t, extrapolating past both ends. */
function along(points: [number, Vec2][], t: number): Vec2 {
  if (points.length === 1) return points[0]![1];
  let i = 0;
  while (i < points.length - 2 && t > points[i + 1]![0]) i++;
  const [t0, p0] = points[i]!;
  const [t1, p1] = points[i + 1]!;
  return lerp(p0, p1, t1 === t0 ? 0 : (t - t0) / (t1 - t0));
}

/**
 * Pairs garment points with body points for the moving least squares warp:
 * shoulders and neckline to the shoulders and neck, side seams to the measured torso outline at
 * every rig level (so the shirt follows the curve of the body), hem corners to the hips, and
 * each sleeve rotated onto its upper arm. `fit` loosens (above 1) or tightens the garment
 * around the body center line.
 */
export function computeGarmentControls(
  anchors: ClothingAnchors,
  rig: BodyRig,
  frameWidth: number,
  frameHeight: number,
  fit = 1.06,
): GarmentControls {
  const px = (p: Vec2): Vec2 => [p[0] * frameWidth, p[1] * frameHeight];
  const src: Vec2[] = [];
  const dst: Vec2[] = [];
  const pair = (g: Vec2, b: Vec2) => {
    src.push(g);
    dst.push(b);
  };

  // Body outline per side as [level, point], starting at the shoulder tip (level 0).
  const left = rig.levels.map((t, i): [number, Vec2] => [t, px(rig.leftSide[i]!)]);
  const right = rig.levels.map((t, i): [number, Vec2] => [t, px(rig.rightSide[i]!)]);
  const bLS = px(rig.leftShoulder);
  const bRS = px(rig.rightShoulder);
  left.unshift([0, bLS]);
  right.unshift([0, bRS]);
  const center = (t: number) => mid(along(left, t), along(right, t));
  const loose = (p: Vec2, c: Vec2) => add(c, sub(p, c), fit);

  // Garment height fraction: 0 on the shoulder line, 1 on the hem corners.
  const gTop = mid(anchors.leftShoulder, anchors.rightShoulder);
  const gAxis = sub(mid(anchors.leftHip, anchors.rightHip), gTop);
  const gLevel = (p: Vec2) => {
    const d = sub(p, gTop);
    return (d[0] * gAxis[0] + d[1] * gAxis[1]) / (gAxis[0] ** 2 + gAxis[1] ** 2 || 1);
  };

  const shoulderCenter = mid(bLS, bRS);
  const bodyLS = loose(bLS, shoulderCenter);
  const bodyRS = loose(bRS, shoulderCenter);
  pair(anchors.leftShoulder, bodyLS);
  pair(anchors.rightShoulder, bodyRS);
  if (anchors.neck) pair(anchors.neck, px(rig.neck));

  for (const side of ['left', 'right'] as const) {
    const outline = side === 'left' ? left : right;
    const hem = side === 'left' ? anchors.leftHip : anchors.rightHip;
    const armpit = side === 'left' ? anchors.leftArmpit : anchors.rightArmpit;
    const waist = side === 'left' ? anchors.leftWaist : anchors.rightWaist;
    // Garment side seam from the armpit through the waist to the hem.
    const seam: [number, Vec2][] = [armpit, waist, hem]
      .filter((p): p is Vec2 => p !== undefined)
      .map((p) => [gLevel(p), p]);
    const start = seam[0]![0];
    const levels = new Set([
      start,
      ...seam.map((s) => s[0]),
      ...rig.levels.filter((t) => t > start),
    ]);
    for (const t of levels) pair(along(seam, t), loose(along(outline, t), center(t)));

    // Sleeves turn with the upper arm and keep their size relative to the shoulders.
    const sleeve = side === 'left' ? anchors.leftSleeve : anchors.rightSleeve;
    if (sleeve) {
      const gShoulder = side === 'left' ? anchors.leftShoulder : anchors.rightShoulder;
      const bShoulder = side === 'left' ? bodyLS : bodyRS;
      const elbow = px(side === 'left' ? rig.leftElbow : rig.rightElbow);
      const v = sub(sleeve, gShoulder);
      const k = len(sub(bodyLS, bodyRS)) / len(sub(anchors.leftShoulder, anchors.rightShoulder));
      const arm = unit(sub(elbow, bShoulder));
      const turn = Math.atan2(arm[1], arm[0]) - Math.atan2(v[1], v[0]);
      const length = len(v) * k;
      const end = add(bShoulder, arm, length);
      const across = unit([-v[1], v[0]]);
      const half = len(v) * 0.32;
      // A worn sleeve hangs closer to the arm than the flat product photo shows it.
      const drape = half * k * SLEEVE_DRAPE;
      pair(sleeve, end);
      pair(add(sleeve, across, half), add(end, rotate(across, turn), drape));
      pair(add(sleeve, across, -half), add(end, rotate(across, turn), -drape));
      pair(add(gShoulder, v, 0.5), add(bShoulder, arm, length * 0.5));
    }
  }
  return { src, dst };
}
