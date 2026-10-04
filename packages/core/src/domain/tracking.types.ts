/** A landmark in normalized image coordinates: x and y in [0, 1], z relative depth. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** 4x4 matrix stored column major in 16 numbers (same layout as WebGL and three.js). */
export type Matrix4 = number[];

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
/** Quaternion as [x, y, z, w]. */
export type Quat = [number, number, number, number];

/** Pose of a 3D anchor in camera space. Units are centimeters, camera looks down -Z, Y is up. */
export interface AnchorPose {
  position: Vec3;
  rotation: Quat;
  scale: number;
}

/** 2D placement in normalized image coordinates, used by flat overlays. */
export interface Anchor2D {
  x: number;
  y: number;
  /** Rotation around the view axis in radians (head roll). */
  angle: number;
  /** Reference size in normalized image width units (face width, palm width). */
  size: number;
}

export interface FaceResult {
  landmarks: Landmark[];
  /** Facial transformation matrix (canonical face to camera space), column major. */
  matrix: number[] | null;
}

export interface HandResult {
  landmarks: Landmark[];
  /** World landmarks in meters, origin at the hand center. */
  worldLandmarks: Landmark[];
  handedness: 'Left' | 'Right';
}

export interface PoseResult {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

/** A single channel mask, values 0..255, row major. */
export interface MaskResult {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Everything detected for one video frame. Lives on the fast path, never in the store. */
export interface FrameResults {
  timestamp: number;
  face: FaceResult | null;
  hand: HandResult | null;
  pose: PoseResult | null;
  hairMask: MaskResult | null;
}

/** Camera description shared by anchor math so 3D renderers match the projection. */
export interface CameraModel {
  /** Vertical field of view in degrees. */
  fovY: number;
  /** Image width divided by height. */
  aspect: number;
}
