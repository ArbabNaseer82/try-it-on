import type { PerformanceMode } from './types';

/** Detection fps targets per performance mode: [max, min]. */
const RATES: Record<PerformanceMode, [number, number]> = {
  quality: [30, 30],
  auto: [30, 15],
  balanced: [24, 15],
  battery: [15, 15],
};

/**
 * Adaptive detection rate: targets 30 fps, drops to 15 when detection plus render time
 * exceeds the frame budget, and recovers after a stable period.
 */
export class AdaptiveRate {
  rate: number;
  private readonly max: number;
  private readonly min: number;
  private samples = 0;
  private total = 0;
  private windowStart = 0;
  private stableWindows = 0;

  constructor(mode: PerformanceMode) {
    [this.max, this.min] = RATES[mode];
    this.rate = this.max;
  }

  get interval(): number {
    return 1000 / this.rate;
  }

  /** Records the cost of one frame. Returns true when the rate changed. */
  record(costMs: number, now: number): boolean {
    this.samples++;
    this.total += costMs;
    if (now - this.windowStart < 1000) return false;
    const avg = this.total / Math.max(1, this.samples);
    this.samples = 0;
    this.total = 0;
    this.windowStart = now;
    const budget = 1000 / this.max;
    if (this.rate > this.min && avg > budget * 0.75) {
      this.rate = this.min;
      this.stableWindows = 0;
      return true;
    }
    if (this.rate < this.max && avg < budget * 0.4) {
      this.stableWindows++;
      if (this.stableWindows >= 3) {
        this.rate = this.max;
        this.stableWindows = 0;
        return true;
      }
    } else {
      this.stableWindows = 0;
    }
    return false;
  }
}

function hasVideoFrameCallback(video: HTMLVideoElement): boolean {
  return 'requestVideoFrameCallback' in video;
}

export interface FrameLoopCallbacks {
  /** Called when a new video frame is available and detection is due. */
  detect(now: number): void;
  /** Called on every animation frame. */
  render(now: number): void;
  /** Called when the source shows a new frame. */
  newFrame(): void;
}

/**
 * Render on requestAnimationFrame, detect on requestVideoFrameCallback (when supported) so
 * detection runs exactly once per new camera frame.
 */
export class FrameLoop {
  private raf = 0;
  private vfc = 0;
  private running = false;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private lastDetect = -Infinity;

  constructor(
    private readonly callbacks: FrameLoopCallbacks,
    private readonly rate: AdaptiveRate,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  start(video: HTMLVideoElement | null): void {
    this.stop();
    this.running = true;
    this.video = video;
    this.lastVideoTime = -1;
    const tick = (now: number) => {
      if (!this.running) return;
      if (this.video && !hasVideoFrameCallback(this.video)) this.pollVideo(now);
      this.callbacks.render(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    if (video && hasVideoFrameCallback(video)) {
      const onVideoFrame = (now: number) => {
        if (!this.running) return;
        this.onNewFrame(now);
        this.vfc = video.requestVideoFrameCallback(onVideoFrame);
      };
      this.vfc = video.requestVideoFrameCallback(onVideoFrame);
    }
  }

  private pollVideo(now: number): void {
    const video = this.video;
    if (!video || video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;
    this.onNewFrame(now);
  }

  private onNewFrame(now: number): void {
    this.callbacks.newFrame();
    if (now - this.lastDetect >= this.rate.interval - 2) {
      this.lastDetect = now;
      this.callbacks.detect(now);
    }
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.vfc && this.video && hasVideoFrameCallback(this.video)) {
      this.video.cancelVideoFrameCallback(this.vfc);
    }
    this.raf = 0;
    this.vfc = 0;
  }
}
