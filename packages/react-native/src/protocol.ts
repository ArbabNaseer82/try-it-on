import type { AssetManifest, ErrorCode, SessionState } from '@tryonit/core';

/** Camera and tracking options, a JSON safe subset of the web engine options. */
export interface EngineOptions {
  /** Folder with self hosted `.task` / `.tflite` models. Defaults to Google hosted models. */
  modelBaseUrl?: string;
  /** Per tracker model URL overrides. */
  models?: Partial<Record<'face' | 'hand' | 'pose' | 'segmenter', string>>;
  /** Folder with the MediaPipe wasm files. Defaults to jsDelivr pinned to the bundled version. */
  wasmBaseUrl?: string;
  camera?: { facing?: 'user' | 'environment'; width?: number; height?: number };
  /** Detection rate strategy. Default `auto`. */
  performance?: 'auto' | 'quality' | 'balanced' | 'battery';
  /** Mirror the view. Default: mirrored for the front camera. */
  mirror?: boolean;
  /** How the camera fills the view. Default `cover`. */
  fit?: 'cover' | 'contain';
  /** Landmark overlay and FPS HUD inside the view. */
  debug?: boolean;
  delegate?: 'auto' | 'GPU' | 'CPU';
  smoothing?: Partial<
    Record<
      'makeup' | 'face3d' | 'hand' | 'body',
      { minCutoff?: number; beta?: number; dCutoff?: number }
    >
  >;
  irisDiameterMm?: number;
  three?: { dracoDecoderPath?: string; ktx2TranscoderPath?: string; scale?: number };
}

export interface CaptureOptions {
  /** Default `image/jpeg` (smaller to pass over the bridge). */
  type?: 'image/jpeg' | 'image/png';
  /** 0..1 for JPEG. Default 0.9. */
  quality?: number;
  /** Apply the preview mirroring. Default true. */
  mirror?: boolean;
}

/** Built in UI inside the view (`web`) or camera only (`none`, build your own controls). */
export type ControlsMode = 'web' | 'none';

/** Serializable error. `code` is stable, use it for logic and analytics. */
export interface TryOnErrorInfo {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  canUsePhotoFallback: boolean;
}

/** Session state mirrored from the camera view (same shape as the web store). */
export type TryOnState = Omit<SessionState, 'error'> & { error: TryOnErrorInfo | null };

/** A captured photo. `dataUrl` works directly as an `<Image source={{ uri }} />`. */
export interface TryOnPhoto {
  dataUrl: string;
  /** Base64 without the `data:` prefix, ready for expo-file-system or uploads. */
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

/** Configuration injected into the page when it loads. */
export interface BridgeConfig {
  engine: EngineOptions;
  controls: ControlsMode;
  autoStart: boolean;
  /** CSS variables without the `--toi-` prefix. */
  theme: Record<string, string>;
  labels: Record<string, string>;
  capture: CaptureOptions;
}

/** Messages from React Native to the page. */
export type BridgeCommand =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'setAsset'; asset: AssetManifest | null }
  | { type: 'setVariant'; variantId: string }
  | { type: 'setIntensity'; value: number }
  | { type: 'switchCamera' }
  | { type: 'setCompare'; position: number | null }
  | { type: 'setDebug'; enabled: boolean }
  | { type: 'capture'; id: number; options?: CaptureOptions };

/** Messages from the page to React Native. */
export type BridgeEvent =
  | { type: 'ready' }
  | { type: 'state'; state: TryOnState }
  | { type: 'error'; error: TryOnErrorInfo }
  | { type: 'assetLoaded'; asset: AssetManifest }
  | {
      type: 'capture';
      /** Request id, or null when the shopper used the built in shutter button. */
      id: number | null;
      dataUrl: string;
      mimeType: string;
      width: number;
      height: number;
    }
  | { type: 'commandError'; id: number | null; command: string; error: TryOnErrorInfo }
  | { type: 'log'; level: 'debug' | 'warn' | 'error'; message: string };

const EVENT_TYPES = new Set([
  'ready',
  'state',
  'error',
  'assetLoaded',
  'capture',
  'commandError',
  'log',
]);

/** Parses a `WebView` message. Returns null for anything that is not a TryOnIt event. */
export function parseBridgeEvent(data: unknown): BridgeEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as { type?: unknown };
    return value &&
      typeof value === 'object' &&
      typeof value.type === 'string' &&
      EVENT_TYPES.has(value.type)
      ? (value as BridgeEvent)
      : null;
  } catch {
    return null;
  }
}

/** JavaScript that delivers a command to the page through `injectJavaScript`. */
export function commandScript(command: BridgeCommand): string {
  return `window.__tryonit&&window.__tryonit.receive(${JSON.stringify(command)});true;`;
}
