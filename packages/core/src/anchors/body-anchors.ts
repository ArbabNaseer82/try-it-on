import { POSE } from '../domain/landmarks';
import type { Landmark, PoseResult, Vec2 } from '../domain/tracking.types';

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
  const visible = confident(ls) && confident(rs) && confident(lh) && confident(rh);

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
  };
}
