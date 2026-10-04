import type { AnchorPose, Quat } from '../domain/tracking.types';
import { OneEuroFilter, VectorFilter, type OneEuroOptions } from './one-euro-filter';
import { quatAngle, quatSlerp } from './quat';

function smoothingFactor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/**
 * One Euro filter for rotations. The angular speed drives the cutoff and the result is
 * interpolated with quaternion slerp, so it never produces invalid or flipped rotations.
 */
export class QuaternionFilter {
  private q: Quat | null = null;
  private speed = 0;
  private lastTime: number | null = null;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  constructor(options: OneEuroOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1;
    this.beta = options.beta ?? 0.007;
    this.dCutoff = options.dCutoff ?? 1;
  }

  filter(value: Quat, timestampMs: number): Quat {
    if (this.q === null || this.lastTime === null) {
      this.q = value;
      this.lastTime = timestampMs;
      return value;
    }
    const dt = Math.max((timestampMs - this.lastTime) / 1000, 1e-3);
    this.lastTime = timestampMs;
    const rawSpeed = quatAngle(this.q, value) / dt;
    this.speed += smoothingFactor(this.dCutoff, dt) * (rawSpeed - this.speed);
    const cutoff = this.minCutoff + this.beta * this.speed * 100;
    this.q = quatSlerp(this.q, value, smoothingFactor(cutoff, dt));
    return this.q;
  }

  reset(): void {
    this.q = null;
    this.speed = 0;
    this.lastTime = null;
  }
}

/** Smooths a full anchor pose (position, rotation and scale). */
export class PoseFilter {
  private readonly position: VectorFilter;
  private readonly rotation: QuaternionFilter;
  private readonly scale: OneEuroFilter;

  constructor(options: OneEuroOptions = {}) {
    this.position = new VectorFilter(options);
    this.rotation = new QuaternionFilter(options);
    this.scale = new OneEuroFilter({ ...options, minCutoff: (options.minCutoff ?? 1) * 0.5 });
  }

  filter(pose: AnchorPose, timestampMs: number): AnchorPose {
    return {
      position: this.position.filter([...pose.position], timestampMs),
      rotation: this.rotation.filter(pose.rotation, timestampMs),
      scale: this.scale.filter(pose.scale, timestampMs),
    };
  }

  reset(): void {
    this.position.reset();
    this.rotation.reset();
    this.scale.reset();
  }
}
