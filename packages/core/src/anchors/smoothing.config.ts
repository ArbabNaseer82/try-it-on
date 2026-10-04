import type { OneEuroOptions } from '../math/one-euro-filter';

/**
 * One Euro filter defaults per asset category. Tune here, or override per engine through
 * `createTryOnEngine({ smoothing })`. Lower `minCutoff` means steadier at rest, higher `beta`
 * means less lag on fast moves.
 */
export const SMOOTHING_DEFAULTS = {
  /** Makeup follows lips and eyes closely, so lag is very visible. */
  makeup: { minCutoff: 2.5, beta: 0.05, dCutoff: 1 },
  /** Glasses, hats and earrings: steadiness matters more than raw speed. */
  face3d: { minCutoff: 1.2, beta: 0.02, dCutoff: 1 },
  /** Wrist rotation is noisy, so rings and watches get stronger smoothing. */
  hand: { minCutoff: 0.8, beta: 0.015, dCutoff: 1 },
  /** Garments are large, small jitter is acceptable. */
  body: { minCutoff: 1, beta: 0.01, dCutoff: 1 },
} as const satisfies Record<string, Required<OneEuroOptions>>;

export type SmoothingCategory = keyof typeof SMOOTHING_DEFAULTS;

/** How long the last pose is kept (with fade out) after tracking is lost. */
export const TRACKING_LOST_GRACE_MS = 300;
