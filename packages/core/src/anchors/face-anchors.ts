import type { FaceOverlayAnchor } from '../domain/asset.types';
import { FACE } from '../domain/landmarks';
import type {
  Anchor2D,
  AnchorPose,
  CameraModel,
  FaceResult,
  Landmark,
  Quat,
  Vec3,
} from '../domain/tracking.types';
import { mat4Decompose } from '../math/mat4';
import { quatFromBasis, quatRotateVec3 } from '../math/quat';
import { add3, cross3, lerp3, normalize3, sub3 } from '../math/vec';
import { imageDistance, imageWidthAtDepth, unproject, unprojectLandmark } from './camera';

/** Tunable offsets in head space, centimeters. */
export interface FaceAnchorConfig {
  /** Typical real face width (234 to 454) used to estimate depth when no matrix is available. */
  averageFaceWidthCm: number;
  /** Ear lobe position between the face edge (0) and the jaw corner (1). */
  earLobeBlend: number;
  /** Extra offset applied to ear lobes in head space. */
  earLobeOffset: Vec3;
  /** Yaw in radians after which the far ear is hidden. */
  earHideYaw: number;
  /** Head occluder ellipsoid center relative to the nose bridge, head space. */
  occluderOffset: Vec3;
  /** Head occluder ellipsoid radii. */
  occluderRadii: Vec3;
}

export const FACE_ANCHOR_DEFAULTS: FaceAnchorConfig = {
  averageFaceWidthCm: 14.5,
  earLobeBlend: 0.55,
  earLobeOffset: [0, -0.6, -1.2],
  earHideYaw: 0.45,
  // The ellipsoid front must stay behind the eyes (z = -1.5 cm from the nose bridge), otherwise
  // it hides the middle of glasses frames. Back of the head at about -20.5 cm.
  occluderOffset: [0, 1.5, -11],
  occluderRadii: [7.4, 10.5, 9.5],
};

export interface FaceAnchors {
  /** Head rotation and the canonical origin position. */
  head: AnchorPose;
  noseBridge: AnchorPose;
  forehead: AnchorPose;
  leftEar: AnchorPose;
  rightEar: AnchorPose;
  /** Center of the invisible head occluder. Uses `config.occluderRadii` as radii. */
  occluder: AnchorPose;
  yaw: number;
  pitch: number;
  roll: number;
  leftEarVisible: boolean;
  rightEarVisible: boolean;
  /** Face width in normalized image width units. */
  faceWidth: number;
  /** Distance from the camera to the head in centimeters. */
  depth: number;
  /** Flat anchors for 2D overlays. */
  overlay: Record<FaceOverlayAnchor, Anchor2D>;
}

export interface FaceAnchorOptions {
  camera: CameraModel;
  /** Multiplier for 3D models, usually from `estimateMetricScale`. Default 1. */
  scaleFactor?: number;
  config?: Partial<FaceAnchorConfig>;
}

function mid(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function rotationFromLandmarks(points: { left: Vec3; right: Vec3; top: Vec3; bottom: Vec3 }): Quat {
  const xAxis = normalize3(sub3(points.left, points.right));
  const up = normalize3(sub3(points.top, points.bottom));
  const zAxis = normalize3(cross3(xAxis, up));
  const yAxis = cross3(zAxis, xAxis);
  return quatFromBasis(xAxis, yAxis, zAxis);
}

/**
 * Turns face landmarks (and the optional facial transformation matrix) into 3D anchor poses
 * in camera space plus 2D anchors for flat overlays.
 */
export function computeFaceAnchors(
  face: FaceResult,
  options: FaceAnchorOptions,
): FaceAnchors | null {
  const lm = face.landmarks;
  if (lm.length < 468) return null;
  const config = { ...FACE_ANCHOR_DEFAULTS, ...options.config };
  const { camera } = options;
  const scale = options.scaleFactor ?? 1;
  const get = (i: number) => lm[i] as Landmark;

  const faceWidth = imageDistance(
    get(FACE.RIGHT_FACE_EDGE),
    get(FACE.LEFT_FACE_EDGE),
    camera.aspect,
  );
  const decomposed = face.matrix && face.matrix.length === 16 ? mat4Decompose(face.matrix) : null;
  const depth =
    decomposed && decomposed.position[2] < -1
      ? -decomposed.position[2]
      : config.averageFaceWidthCm / Math.max(faceWidth * imageWidthAtDepth(camera, 1), 1e-6);

  const point = (l: Landmark) => unprojectLandmark(camera, l, depth);
  const rotation =
    decomposed?.rotation ??
    rotationFromLandmarks({
      left: point(get(FACE.LEFT_FACE_EDGE)),
      right: point(get(FACE.RIGHT_FACE_EDGE)),
      top: point(get(FACE.FOREHEAD)),
      bottom: point(get(FACE.CHIN)),
    });

  const local = (p: Vec3, offset: Vec3): Vec3 => add3(p, quatRotateVec3(rotation, offset));
  const pose = (position: Vec3): AnchorPose => ({ position, rotation, scale });

  const noseBridge = point(get(FACE.NOSE_BRIDGE));
  const earLobe = (edge: number, jaw: number, side: 1 | -1): Vec3 => {
    const p = lerp3(point(get(edge)), point(get(jaw)), config.earLobeBlend);
    const [ox, oy, oz] = config.earLobeOffset;
    return local(p, [ox * side, oy, oz]);
  };

  const forward = quatRotateVec3(rotation, [0, 0, 1]);
  const right = quatRotateVec3(rotation, [1, 0, 0]);
  const yaw = Math.atan2(forward[0], forward[2]);
  const pitch = Math.asin(Math.max(-1, Math.min(1, forward[1])));
  const roll = Math.atan2(right[1], right[0]);

  const re = get(FACE.RIGHT_EYE_OUTER);
  const le = get(FACE.LEFT_EYE_OUTER);
  const roll2d = Math.atan2((le.y - re.y) / camera.aspect, le.x - re.x);
  const anchor2d = (l: Landmark): Anchor2D => ({ x: l.x, y: l.y, angle: roll2d, size: faceWidth });

  return {
    head: pose(decomposed ? decomposed.position : unproject(camera, 0.5, 0.5, depth)),
    noseBridge: pose(noseBridge),
    forehead: pose(point(get(FACE.FOREHEAD))),
    leftEar: pose(earLobe(FACE.LEFT_FACE_EDGE, FACE.LEFT_JAW, 1)),
    rightEar: pose(earLobe(FACE.RIGHT_FACE_EDGE, FACE.RIGHT_JAW, -1)),
    occluder: pose(local(noseBridge, config.occluderOffset)),
    yaw,
    pitch,
    roll,
    leftEarVisible: yaw < config.earHideYaw,
    rightEarVisible: yaw > -config.earHideYaw,
    faceWidth,
    depth,
    overlay: {
      forehead: anchor2d(mid(get(FACE.FOREHEAD), get(FACE.GLABELLA))),
      eyes: anchor2d(mid(re, le)),
      noseBridge: anchor2d(get(FACE.NOSE_BRIDGE)),
      noseTip: anchor2d(get(FACE.NOSE_TIP)),
      mouth: anchor2d(mid(get(FACE.UPPER_LIP_CENTER), get(FACE.LOWER_LIP_CENTER))),
      chin: anchor2d(get(FACE.CHIN)),
      leftCheek: anchor2d(get(FACE.LEFT_CHEEK)),
      rightCheek: anchor2d(get(FACE.RIGHT_CHEEK)),
    },
  };
}
