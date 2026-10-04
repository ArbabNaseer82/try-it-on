import type { CameraModel, Landmark, Vec3 } from '../domain/tracking.types';

/**
 * Vertical field of view used by MediaPipe face geometry when it computes the facial
 * transformation matrix (perspective camera, near 1, far 10000, units in centimeters).
 * 3D renderers must use the same value so models line up with the face.
 */
export const DEFAULT_FOV_Y = 63;

export function tanHalfFov(camera: CameraModel): number {
  return Math.tan((camera.fovY * Math.PI) / 360);
}

/** Width of the visible image plane in centimeters at a given depth. */
export function imageWidthAtDepth(camera: CameraModel, depth: number): number {
  return 2 * depth * tanHalfFov(camera) * camera.aspect;
}

/**
 * Converts a normalized image point at a positive distance `depth` (cm) into camera space.
 * Camera looks down -Z, Y is up, X is right in the unmirrored image.
 */
export function unproject(camera: CameraModel, x: number, y: number, depth: number): Vec3 {
  const t = tanHalfFov(camera);
  return [(x * 2 - 1) * depth * t * camera.aspect, (1 - y * 2) * depth * t, -depth];
}

/** Projects a camera space point back to normalized image coordinates. */
export function project(camera: CameraModel, p: Vec3): [number, number] {
  const t = tanHalfFov(camera);
  const depth = -p[2] || 1e-6;
  return [(p[0] / (depth * t * camera.aspect) + 1) / 2, (1 - p[1] / (depth * t)) / 2];
}

/** Unprojects a landmark using its relative z (same scale as x) around a reference depth. */
export function unprojectLandmark(camera: CameraModel, lm: Landmark, referenceDepth: number): Vec3 {
  const depth = referenceDepth + lm.z * imageWidthAtDepth(camera, referenceDepth);
  return unproject(camera, lm.x, lm.y, Math.max(depth, 1));
}

/** Distance between two landmarks in image width units, corrected for aspect ratio. */
export function imageDistance(a: Landmark, b: Landmark, aspect: number): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) / aspect);
}
