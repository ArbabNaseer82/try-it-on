import type { AssetManifest, AssetSource, SessionStatus } from '@tryonit/core';
import type { StyleProp, ViewStyle } from 'react-native';
import type { WebViewProps } from 'react-native-webview';
import type { CdnOptions } from './html';
import type {
  CaptureOptions,
  ControlsMode,
  EngineOptions,
  TryOnErrorInfo,
  TryOnPhoto,
  TryOnState,
} from './protocol';
import type { ThemeInput } from './theme';

/** Strings of the built in controls (`controls="web"`). Every key is optional. */
export interface TryOnLabels {
  start: string;
  capture: string;
  switchCamera: string;
  uploadPhoto: string;
  retry: string;
  loading: string;
  noFace: string;
  noHand: string;
  noBody: string;
  cameraDenied: string;
  cameraNotFound: string;
  cameraInUse: string;
  insecureContext: string;
  webglUnsupported: string;
  genericError: string;
}

export interface TryOnViewProps {
  /** Product: a manifest object, an absolute https URL, or an async loader. */
  asset?: AssetSource | null;
  /** `web` (default): built in shutter, camera switch, photo upload and messages. `none`: camera only. */
  controls?: ControlsMode;
  /** Open the camera as soon as the view is ready. Default true. */
  autoStart?: boolean;
  engineOptions?: EngineOptions;
  /** Same theme tokens as @tryonit/react. */
  theme?: ThemeInput;
  labels?: Partial<TryOnLabels>;
  /** Default capture format. JPEG by default to keep the bridge fast. */
  captureOptions?: CaptureOptions;
  /** Where MediaPipe and three.js load from (self hosting). */
  cdn?: CdnOptions;
  /** Pause tracking while the app is in the background. Default true. */
  pauseInBackground?: boolean;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onStateChange?: (state: TryOnState) => void;
  onStatusChange?: (status: SessionStatus) => void;
  onError?: (error: TryOnErrorInfo) => void;
  onAssetLoaded?: (asset: AssetManifest) => void;
  /** Photos taken with the built in shutter button. `ref.capture()` returns its photo instead. */
  onCapture?: (photo: TryOnPhoto) => void;
  onLog?: (level: 'debug' | 'warn' | 'error', message: string) => void;
  /** Extra props for the underlying WebView (advanced). */
  webViewProps?: Omit<WebViewProps, 'source' | 'onMessage' | 'ref'>;
}

/** Imperative API exposed through `ref` (or the `useTryOn` hook). */
export interface TryOnViewRef {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  /** Swap the product. Resolves with the validated manifest. */
  setAsset(source: AssetSource | null): Promise<AssetManifest | null>;
  setVariant(variantId: string): void;
  /** Effect strength 0..1 (makeup, hair color). */
  setIntensity(value: number): void;
  switchCamera(): void;
  /** Before and after split, 0..1 from the left. Null turns it off. */
  setCompare(position: number | null): void;
  setDebug(enabled: boolean): void;
  capture(options?: CaptureOptions): Promise<TryOnPhoto>;
  /** Latest state received from the camera view. */
  getState(): TryOnState | null;
}
