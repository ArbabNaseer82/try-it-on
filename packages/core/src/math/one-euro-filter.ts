/**
 * One Euro filter (Casiez et al. 2012): low lag smoothing for noisy tracking signals.
 * Lower `minCutoff` removes more jitter at rest, higher `beta` reduces lag on fast motion.
 */
export interface OneEuroOptions {
  /** Minimum cutoff frequency in Hz. Default 1. */
  minCutoff?: number;
  /** Speed coefficient. Default 0.007. */
  beta?: number;
  /** Cutoff for the derivative in Hz. Default 1. */
  dCutoff?: number;
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  minCutoff: number;
  beta: number;
  dCutoff: number;
  private x: number | null = null;
  private dx = 0;
  private lastTime: number | null = null;

  constructor(options: OneEuroOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1;
    this.beta = options.beta ?? 0.007;
    this.dCutoff = options.dCutoff ?? 1;
  }

  /** Filters a value. `timestampMs` must be monotonic. */
  filter(value: number, timestampMs: number): number {
    if (this.x === null || this.lastTime === null) {
      this.x = value;
      this.lastTime = timestampMs;
      return value;
    }
    const dt = Math.max((timestampMs - this.lastTime) / 1000, 1e-3);
    this.lastTime = timestampMs;
    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }

  reset(): void {
    this.x = null;
    this.dx = 0;
    this.lastTime = null;
  }
}

/** Applies independent One Euro filters to every component of a numeric vector. */
export class VectorFilter {
  private filters: OneEuroFilter[] = [];

  constructor(private readonly options: OneEuroOptions = {}) {}

  filter<T extends number[]>(values: T, timestampMs: number): T {
    while (this.filters.length < values.length) this.filters.push(new OneEuroFilter(this.options));
    return values.map((v, i) => (this.filters[i] as OneEuroFilter).filter(v, timestampMs)) as T;
  }

  reset(): void {
    for (const f of this.filters) f.reset();
  }
}
