import type { RingFinger } from '../domain/asset.types';
import { FINGER_SEGMENTS, HAND } from '../domain/landmarks';
import type { AnchorPose, CameraModel, HandResult, Landmark, Vec3 } from '../domain/tracking.types';
import { quatFromBasis } from '../math/quat';
import { cross3, dot3, length3, lerp3, normalize3, scale3, sub3 } from '../math/vec';
import { tanHalfFov, unprojectLandmark } from './camera';

export interface HandAnchorConfig {
  /** Ring position between the finger base (0) and the first joint (1). */
  ringPosition: number;
  /**
   * MediaPipe labels handedness as if the input image were mirrored (selfie view).
   * TryOnIt feeds unmirrored frames, so labels are swapped by default.
   */
  handednessFromMirroredInput: boolean;
  /**
   * How much the back of the hand turns away from the camera because of depth (0) or stays
   * facing it (1). Single camera depth is the noisiest signal, so the default keeps a fifth of it.
   */
  depthDamping: number;
}

export const HAND_ANCHOR_DEFAULTS: HandAnchorConfig = {
  ringPosition: 0.4,
  handednessFromMirroredInput: true,
  depthDamping: 0.8,
};

export interface HandAnchors {
  /** Wrist frame: Y toward the fingers, Z out of the back of the hand, X across the wrist. */
  wrist: AnchorPose;
  rings: Record<RingFinger, AnchorPose>;
  /** The real hand side of the person. */
  side: 'left' | 'right';
  /** Real palm width (index base to pinky base) in centimeters. */
  palmWidthCm: number;
  /** Distance from the camera to the wrist in centimeters. */
  depth: number;
}

export interface HandAnchorOptions {
  camera: CameraModel;
  config?: Partial<HandAnchorConfig>;
}

/** World landmarks (meters, image axes) to camera space axes (centimeters, Y up, Z to viewer). */
function toCamera(l: Landmark): Vec3 {
  return [l.x * 100, -l.y * 100, -l.z * 100];
}

/** Estimates the camera to wrist distance by comparing metric bone lengths with image lengths. */
function estimateDepth(hand: HandResult, camera: CameraModel): number {
  const pairs: [number, number][] = [
    [HAND.WRIST, HAND.INDEX_MCP],
    [HAND.WRIST, HAND.PINKY_MCP],
    [HAND.INDEX_MCP, HAND.PINKY_MCP],
    [HAND.WRIST, HAND.MIDDLE_MCP],
  ];
  let world = 0;
  let image = 0;
  for (const [a, b] of pairs) {
    const wa = hand.worldLandmarks[a];
    const wb = hand.worldLandmarks[b];
    const ia = hand.landmarks[a];
    const ib = hand.landmarks[b];
    if (!wa || !wb || !ia || !ib) continue;
    // Only the components parallel to the image plane are comparable.
    world += Math.hypot(wa.x - wb.x, wa.y - wb.y) * 100;
    image += Math.hypot((ia.x - ib.x) * camera.aspect, ia.y - ib.y);
  }
  if (image <= 1e-6) return 40;
  // `image` is in image height units. Height of the image plane at depth d is 2 d tan(fov/2).
  return world / (image * 2 * tanHalfFov(camera));
}

/** Computes wrist and finger frames for watches and rings. */
export function computeHandAnchors(
  hand: HandResult,
  options: HandAnchorOptions,
): HandAnchors | null {
  if (hand.landmarks.length < 21 || hand.worldLandmarks.length < 21) return null;
  const config = { ...HAND_ANCHOR_DEFAULTS, ...options.config };
  const { camera } = options;
  const world = (i: number) => toCamera(hand.worldLandmarks[i] as Landmark);
  const depth = estimateDepth(hand, camera);
  const wristLm = hand.landmarks[HAND.WRIST] as Landmark;
  // Hand landmark z is relative to the wrist, so the wrist sits exactly at `depth`.
  const image = (i: number) =>
    unprojectLandmark(
      camera,
      { ...(hand.landmarks[i] as Landmark), z: (hand.landmarks[i] as Landmark).z - wristLm.z },
      depth,
    );

  const label = hand.handedness;
  const isRight = config.handednessFromMirroredInput ? label === 'Left' : label === 'Right';

  const yRaw = normalize3(sub3(world(HAND.MIDDLE_MCP), world(HAND.WRIST)));
  // Trackers see the camera image un-mirrored: on the back of a right hand the index knuckle is
  // on the image right. Crossing the knuckle line with the finger direction then points Z out of
  // the back of the hand, toward the camera, which is where a watch face sits.
  const across = isRight
    ? sub3(world(HAND.INDEX_MCP), world(HAND.PINKY_MCP))
    : sub3(world(HAND.PINKY_MCP), world(HAND.INDEX_MCP));
  const zRaw = normalize3(cross3(across, yRaw));
  // Depth from a single camera is the noisiest part of the hand pose. Pull the back of the hand
  // toward the line of sight (wrist to camera, the camera sits at the origin), keeping whichever
  // side faces it, then square the finger direction against it so it keeps its on-screen angle.
  const wristPosition = image(HAND.WRIST);
  const sight = normalize3(scale3(wristPosition, -1));
  const facing = dot3(zRaw, sight) < 0 ? scale3(sight, -1) : sight;
  const zAxis = normalize3(lerp3(zRaw, facing, config.depthDamping));
  const yAxis = normalize3(sub3(yRaw, scale3(zAxis, dot3(yRaw, zAxis))));
  const xAxis = cross3(yAxis, zAxis);
  const palmRotation = quatFromBasis(xAxis, yAxis, zAxis);

  const fingerPose = (finger: RingFinger): AnchorPose => {
    const [base, joint] = FINGER_SEGMENTS[finger];
    const position = lerp3(image(base), image(joint), config.ringPosition);
    const fy = normalize3(sub3(world(joint), world(base)));
    const fx = normalize3(sub3(xAxis, scale3(fy, dot3(xAxis, fy))));
    const fz = cross3(fx, fy);
    return { position, rotation: quatFromBasis(fx, fy, fz), scale: 1 };
  };

  return {
    wrist: { position: wristPosition, rotation: palmRotation, scale: 1 },
    rings: {
      index: fingerPose('index'),
      middle: fingerPose('middle'),
      ring: fingerPose('ring'),
      pinky: fingerPose('pinky'),
    },
    side: isRight ? 'right' : 'left',
    palmWidthCm: length3(sub3(world(HAND.INDEX_MCP), world(HAND.PINKY_MCP))),
    depth,
  };
}
