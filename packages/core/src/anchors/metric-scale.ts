import { FACE } from '../domain/landmarks';
import type { Landmark } from '../domain/tracking.types';
import { clamp } from '../math/vec';
import { imageDistance } from './camera';

/** Average adult human iris diameter in millimeters (horizontal visible iris diameter). */
export const DEFAULT_IRIS_DIAMETER_MM = 11.7;
/**
 * Approximate distance between landmarks 234 and 454 on the MediaPipe canonical face model.
 * The facial transformation matrix places an average sized head, so 3D models are corrected
 * by `canonical / measured` to keep real world proportions.
 */
export const CANONICAL_FACE_WIDTH_MM = 145;

export interface MetricScaleOptions {
  aspect: number;
  irisDiameterMm?: number;
  canonicalFaceWidthMm?: number;
  /** Clamp range for the correction factor. Default [0.8, 1.25]. */
  range?: [number, number];
}

export interface MetricScale {
  /** Millimeters per normalized image width unit. */
  mmPerUnit: number;
  /** Estimated real face width in millimeters (landmarks 234 to 454). */
  faceWidthMm: number;
  /** Multiply 3D model scale by this to keep real world size relative to the face. */
  scaleFactor: number;
}

/**
 * Estimates real world scale from the iris diameter. Returns null when the 478 point model
 * (with iris landmarks) is not available or the eyes are not measurable.
 */
export function estimateMetricScale(
  landmarks: readonly Landmark[],
  options: MetricScaleOptions,
): MetricScale | null {
  if (landmarks.length < 478) return null;
  const iris = options.irisDiameterMm ?? DEFAULT_IRIS_DIAMETER_MM;
  const canonical = options.canonicalFaceWidthMm ?? CANONICAL_FACE_WIDTH_MM;
  const [lo, hi] = options.range ?? [0.8, 1.25];
  const diameter = (ring: readonly number[]) => {
    const [, r, t, l, b] = ring.map((i) => landmarks[i] as Landmark);
    if (!r || !t || !l || !b) return 0;
    return (imageDistance(r, l, options.aspect) + imageDistance(t, b, options.aspect)) / 2;
  };
  const irisUnits = (diameter(FACE.RIGHT_IRIS) + diameter(FACE.LEFT_IRIS)) / 2;
  if (irisUnits <= 1e-6) return null;
  const mmPerUnit = iris / irisUnits;
  const faceUnits = imageDistance(
    landmarks[FACE.RIGHT_FACE_EDGE] as Landmark,
    landmarks[FACE.LEFT_FACE_EDGE] as Landmark,
    options.aspect,
  );
  const faceWidthMm = faceUnits * mmPerUnit;
  return { mmPerUnit, faceWidthMm, scaleFactor: clamp(canonical / faceWidthMm, lo, hi) };
}
