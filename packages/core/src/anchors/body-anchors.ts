import { POSE } from '../domain/landmarks';
import type { Landmark, MaskResult, PoseResult, Vec2 } from '../domain/tracking.types';

export interface TorsoQuad {
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
}

export interface BodyAnchors {
  /** False when shoulders or hips are not confidently detected. */
  visible: boolean;
  /** Torso corners in normalized image coordinates after padding. */
  torso: TorsoQuad;
  /** Shoulder width in normalized image width units (before padding). */
  shoulderWidth: number;
  /** Detailed body points for fitted garments. */
  rig: BodyRig;
}

/**
 * Body points a fitted garment is attached to, in normalized image coordinates. Left and right
 * are the wearer's sides (a front facing wearer's left is on the right of the image).
 */
export interface BodyRig {
  /** Front of the neck, where a crew neckline sits. */
  neck: Vec2;
  /** Top of each shoulder, where the shoulder seam sits. */
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftElbow: Vec2;
  rightElbow: Vec2;
  /** Sides of the body at hip height. */
  leftHip: Vec2;
  rightHip: Vec2;
  /** Torso height fractions (0 = shoulder line, 1 = hip line) of the outline points below. */
  levels: number[];
  /** Torso outline at each level. */
  leftSide: Vec2[];
  rightSide: Vec2[];
  /** True when the outline was measured from the segmentation mask, false when estimated. */
  measured: boolean;
}

export interface BodyAnchorOptions {
  aspect: number;
  /** Width multiplier applied around the torso center line. Default 1.15. */
  padding?: number;
  /** Minimum landmark visibility. Default 0.5. */
  minVisibility?: number;
  /** Lifts shoulders toward the neck line, as a fraction of torso height. Default 0.06. */
  shoulderLift?: number;
}

/** Computes the padded torso quad used by the experimental clothing overlay. */
export function computeBodyAnchors(
  pose: PoseResult,
  options: BodyAnchorOptions,
): BodyAnchors | null {
  const lm = pose.landmarks;
  const ls = lm[POSE.LEFT_SHOULDER];
  const rs = lm[POSE.RIGHT_SHOULDER];
  const lh = lm[POSE.LEFT_HIP];
  const rh = lm[POSE.RIGHT_HIP];
  if (!ls || !rs || !lh || !rh) return null;
  const padding = options.padding ?? 1.15;
  const minVis = options.minVisibility ?? 0.5;
  const lift = options.shoulderLift ?? 0.06;
  const inFrame = (l: Landmark) => l.x >= -0.05 && l.x <= 1.05 && l.y >= -0.05 && l.y <= 1.05;
  const confident = (l: Landmark) => (l.visibility ?? 1) >= minVis && inFrame(l);
  // Waist up framing is the common case: hips just below the frame are extrapolated by the
  // tracker and are good enough to fit a garment, as long as both shoulders are clearly seen.
  const belowFrame = (l: Landmark) => l.y > 0.95 && l.y < 1.8;
  const hipOk = (l: Landmark) => confident(l) || belowFrame(l);
  const visible =
    confident(ls) && confident(rs) && hipOk(lh) && hipOk(rh) && lh.y > ls.y && rh.y > rs.y;

  const widen = (a: Landmark, b: Landmark, k: number): [Vec2, Vec2] => {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    return [
      [cx + (a.x - cx) * k, cy + (a.y - cy) * k],
      [cx + (b.x - cx) * k, cy + (b.y - cy) * k],
    ];
  };
  const [lsP, rsP] = widen(ls, rs, padding);
  const [lhP, rhP] = widen(lh, rh, padding * 1.1);
  const torsoHeight = (lh.y + rh.y) / 2 - (ls.y + rs.y) / 2 || 0;
  lsP[1] -= torsoHeight * lift;
  rsP[1] -= torsoHeight * lift;

  return {
    visible,
    torso: { leftShoulder: lsP, rightShoulder: rsP, leftHip: lhP, rightHip: rhP },
    shoulderWidth: Math.hypot(ls.x - rs.x, (ls.y - rs.y) / options.aspect),
    rig: computeBodyRig(pose, options.aspect, minVis),
  };
}

/** Outline levels between the shoulder line (0) and the hip line (1). */
export const BODY_RIG_LEVELS = [0.2, 0.35, 0.5, 0.65, 0.8, 1];

/**
 * Derives the fitted garment rig from pose landmarks. Shoulder and hip landmarks are joints,
 * inside the body, so the rig moves them out to where fabric sits. With a segmentation mask
 * the torso outline is measured row by row (the curve of the body); otherwise it is estimated
 * from shoulder and hip width with a gentle waist taper.
 */
export function computeBodyRig(pose: PoseResult, aspect: number, minVisibility = 0.5): BodyRig {
  const lm = pose.landmarks;
  // Work in isotropic units (x scaled by the aspect ratio) so distances and angles are real.
  const iso = (l: Landmark): Vec2 => [l.x * aspect, l.y];
  const out = ([x, y]: Vec2): Vec2 => [x / aspect, y];
  const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
  const len = (a: Vec2) => Math.hypot(a[0], a[1]) || 1e-9;
  const unit = (a: Vec2): Vec2 => [a[0] / len(a), a[1] / len(a)];
  const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  const at = (i: number) => lm[i] as Landmark;

  const ls = iso(at(POSE.LEFT_SHOULDER));
  const rs = iso(at(POSE.RIGHT_SHOULDER));
  const lh = iso(at(POSE.LEFT_HIP));
  const rh = iso(at(POSE.RIGHT_HIP));
  const sMid = lerp(ls, rs, 0.5);
  const hMid = lerp(lh, rh, 0.5);
  const sw = len(sub(ls, rs));
  const down = unit(sub(hMid, sMid));
  const up: Vec2 = [-down[0], -down[1]];
  const across = unit(sub(ls, rs));
  const torso = len(sub(hMid, sMid));

  const shoulderTip = (joint: Vec2, side: 1 | -1) =>
    add(add(joint, across, side * 0.08 * sw), up, 0.1 * sw);
  const hipHalf = Math.max(len(sub(lh, rh)) * 0.5 * 1.45, sw * 0.43);
  const chestHalf = sw * 0.5;
  const expected = (t: number) =>
    (chestHalf + (hipHalf - chestHalf) * t) * (1 - 0.05 * Math.sin(Math.PI * t));

  const mask = pose.mask ?? null;
  const inside = (p: Vec2) => maskValue(mask, p[0] / aspect, p[1]) >= 128;
  let measured = mask !== null;
  const leftSide: Vec2[] = [];
  const rightSide: Vec2[] = [];
  for (const t of BODY_RIG_LEVELS) {
    const c = lerp(sMid, hMid, t);
    const guess = expected(t);
    for (const [side, list] of [
      [1, leftSide],
      [-1, rightSide],
    ] as const) {
      let half = guess;
      if (mask && inside(c)) {
        // March outward until the mask ends. Arms resting on the torso make the mask wider than
        // the body, so implausible widths fall back to the estimate.
        const step = torso * 0.004;
        let d = 0;
        while (d < guess * 1.5 && inside(add(c, across, side * (d + step)))) d += step;
        if (d > guess * 0.7 && d < guess * 1.3) half = d;
        else measured = false;
      } else measured = false;
      list.push(out(add(c, across, side * half)));
    }
  }

  const elbow = (i: number, joint: Vec2, side: 1 | -1): Vec2 => {
    const e = at(i);
    if (e && (e.visibility ?? 1) >= minVisibility) return iso(e);
    return add(add(joint, down, torso * 0.6), across, side * sw * 0.12);
  };

  return {
    neck: out(add(sMid, up, 0.11 * sw)),
    leftShoulder: out(shoulderTip(ls, 1)),
    rightShoulder: out(shoulderTip(rs, -1)),
    leftElbow: out(elbow(POSE.LEFT_ELBOW, ls, 1)),
    rightElbow: out(elbow(POSE.RIGHT_ELBOW, rs, -1)),
    leftHip: out(add(hMid, across, hipHalf)),
    rightHip: out(add(hMid, across, -hipHalf)),
    levels: [...BODY_RIG_LEVELS],
    leftSide,
    rightSide,
    measured,
  };
}

/** Mask value (0..255) at a normalized image point, 0 outside the mask. */
function maskValue(mask: MaskResult | null, x: number, y: number): number {
  if (!mask) return 0;
  const px = Math.floor(x * mask.width);
  const py = Math.floor(y * mask.height);
  if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return 0;
  return mask.data[py * mask.width + px] ?? 0;
}
