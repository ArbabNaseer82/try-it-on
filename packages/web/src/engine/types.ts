import type {
  AssetManifest,
  AssetSource,
  CameraFacing,
  FrameResults,
  OneEuroOptions,
  SessionState,
  SessionStatus,
  SmoothingCategory,
  Store,
  TrackerKind,
  TryOnError,
  Fetcher,
} from '@tryonit/core';
import type { ImageInput } from '../camera/image-source';

export type PerformanceMode = 'auto' | 'quality' | 'balanced' | 'battery';

export interface TryOnEngineOptions {
  /** Element that receives the camera stage. Can also be set later with `attach()`. */
  container?: HTMLElement | null;
  /** Folder with self hosted `.task` / `.tflite` models. Defaults to Google hosted models. */
  modelBaseUrl?: string;
  /** Per tracker model URL overrides. Wins over `modelBaseUrl`. */
  models?: Partial<Record<TrackerKind, string>>;
  /** Folder with the MediaPipe wasm files. Defaults to jsDelivr pinned to the tested version. */
  wasmBaseUrl?: string;
  camera?: {
    facing?: CameraFacing;
    width?: number;
    height?: number;
    deviceId?: string;
  };
  /** Detection rate strategy. Default `auto` (30 fps, drops to 15 under load). */
  performance?: PerformanceMode;
  /** Mirror the view. Default: mirrored for the front camera, not for photos or rear camera. */
  mirror?: boolean;
  /** How the stage fills the container. Default `cover`. */
  fit?: 'cover' | 'contain';
  /** Landmark overlay and FPS HUD. */
  debug?: boolean;
  /** MediaPipe delegate. Default `auto` (GPU with CPU fallback). */
  delegate?: 'auto' | 'GPU' | 'CPU';
  /** One Euro filter overrides per category. */
  smoothing?: Partial<Record<SmoothingCategory, OneEuroOptions>>;
  /** Average iris diameter used for real world scale. Default 11.7 mm. */
  irisDiameterMm?: number;
  /** Custom fetch for asset manifests (auth headers, caching). */
  fetch?: Fetcher;
  /** three.js options for 3D assets. */
  three?: {
    dracoDecoderPath?: string;
    ktx2TranscoderPath?: string;
    /** Global scale multiplier for 3D models. Default 1. */
    scale?: number;
  };
  /** Fast path callback with raw tracking results for every detection. Never stored. */
  onFrame?: (frame: FrameResults) => void;
}

export interface CaptureOptions {
  /** Default `image/png`. */
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** 0..1 for lossy formats. Default 0.92. */
  quality?: number;
  /** Apply the view mirroring to the photo. Default true (what the shopper sees). */
  mirror?: boolean;
}

export type TryOnEvents = {
  error: TryOnError;
  statusChange: { status: SessionStatus; prev: SessionStatus };
  faceFound: void;
  faceLost: void;
  handFound: void;
  handLost: void;
  bodyFound: void;
  bodyLost: void;
  assetLoaded: AssetManifest;
  capture: Blob;
  frame: FrameResults;
};

export type TryOnEventName = keyof TryOnEvents;

/** Public engine API returned by `createTryOnEngine()`. */
export interface TryOnEngine {
  /** Session store with UI state (status, asset, tracking flags, fps). */
  readonly store: Store<SessionState>;
  /** Root element of the camera stage. */
  readonly element: HTMLElement;
  /** Mounts the stage in a container. Pass null to detach. */
  attach(container: HTMLElement | null): void;
  /** Opens the camera and loads only the trackers the current asset needs. */
  start(): Promise<void>;
  /** Runs the same pipeline on a photo (fallback when the camera is denied). */
  startFromImage(input: ImageInput): Promise<void>;
  /** Stops the camera and returns to `idle`. Loaded models stay warm. */
  stop(): void;
  /** Swaps the product. Accepts a manifest, a URL or an async loader. Pass null to clear. */
  setAsset(source: AssetSource | null): Promise<AssetManifest | null>;
  setVariant(variantId: string): Promise<void>;
  /** Global effect strength 0..1 (makeup opacity, hair color strength). */
  setIntensity(value: number): void;
  switchCamera(): Promise<void>;
  capture(options?: CaptureOptions): Promise<Blob>;
  pause(): void;
  resume(): void;
  setDebug(enabled: boolean): void;
  /**
   * Before and after view: the effect is shown only right of `position` (0..1, display
   * coordinates, mirroring handled). Pass null to show the effect everywhere.
   */
  setCompare(position: number | null): void;
  /** Stops everything, closes MediaPipe tasks, frees WebGL resources and listeners. */
  destroy(): void;
  on<K extends TryOnEventName>(event: K, handler: (payload: TryOnEvents[K]) => void): () => void;
  off<K extends TryOnEventName>(event: K, handler: (payload: TryOnEvents[K]) => void): void;
  /** Latest raw tracking results (fast path, not reactive). */
  getLatestResults(): FrameResults;
}
