import type { AssetManifest } from './asset.types';
import type { TryOnError } from './errors';

export type CameraFacing = 'user' | 'environment';

/**
 * Session lifecycle. Allowed transitions live in `state/session.store.ts`.
 * idle -> checking -> requesting-camera -> loading-models -> ready -> running <-> paused,
 * any active state -> error, everything -> destroyed.
 */
export type SessionStatus =
  | 'idle'
  | 'checking'
  | 'requesting-camera'
  | 'loading-models'
  | 'ready'
  | 'running'
  | 'paused'
  | 'error'
  | 'destroyed';

export type FrameSourceKind = 'camera' | 'image';

export interface TrackingState {
  faceVisible: boolean;
  handVisible: boolean;
  bodyVisible: boolean;
}

export interface PerfState {
  /** Rendered frames per second, updated at most twice per second. */
  fps: number;
  /** Average detection time per frame in ms. */
  detectionMs: number;
  /** Average render time per frame in ms. */
  renderMs: number;
  /** Current detection rate target (30 or 15). */
  detectionRate: number;
}

/** UI relevant state. Per frame landmark data never goes here. */
export interface SessionState {
  status: SessionStatus;
  error: TryOnError | null;
  asset: AssetManifest | null;
  assetLoading: boolean;
  variantId: string | null;
  /** Global effect strength, 0..1. */
  intensity: number;
  camera: {
    facing: CameraFacing;
    source: FrameSourceKind | null;
    mirrored: boolean;
  };
  tracking: TrackingState;
  perf: PerfState;
  /** Names of lazily loaded modules (trackers and renderers), useful for debugging. */
  modules: string[];
}
