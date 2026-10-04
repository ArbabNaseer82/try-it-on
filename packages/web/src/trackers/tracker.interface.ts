import type { FaceResult, HandResult, MaskResult, PoseResult, TrackerKind } from '@tryonit/core';

export type RunningMode = 'IMAGE' | 'VIDEO';

export interface TrackerResultMap {
  face: FaceResult;
  hand: HandResult;
  pose: PoseResult;
  segmenter: MaskResult;
}

/** A lazily created MediaPipe task wrapped behind a small, stable interface. */
export interface Tracker<K extends TrackerKind = TrackerKind> {
  readonly kind: K;
  /** Delegate actually in use after GPU to CPU fallback. */
  readonly delegate: 'GPU' | 'CPU';
  /** Runs detection. Returns null when nothing was found. */
  detect(input: TexImageSource, timestampMs: number): TrackerResultMap[K] | null;
  setMode(mode: RunningMode): Promise<void>;
  close(): void;
}

export interface TrackerFactoryOptions {
  wasmBaseUrl: string;
  modelUrl: string;
  delegate: 'GPU' | 'CPU' | 'auto';
  mode: RunningMode;
}

/**
 * TODO(worker): a future `WorkerTracker` will implement `Tracker` by posting ImageBitmaps to a
 * dedicated worker that owns the MediaPipe tasks. It is not the default because iOS Safari
 * lacks reliable OffscreenCanvas WebGL in workers and transferring frames adds latency.
 * The interface above is already transfer friendly: inputs are TexImageSource and results are
 * plain serializable objects.
 */
export interface WorkerTrackerPlan {
  readonly status: 'planned';
}
