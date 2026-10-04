import type {
  AssetManifest,
  BodyAnchors,
  FaceAnchors,
  HandAnchors,
  Landmark,
  MaskResult,
  RendererKind,
} from '@tryonit/core';

/** Per frame data handed to renderers. Built by the engine on the fast path. */
export interface FrameState {
  /** Milliseconds, monotonic. */
  time: number;
  width: number;
  height: number;
  /** Width divided by height. */
  aspect: number;
  source: TexImageSource;
  /** Increments when the source shows a new frame, so textures are uploaded once. */
  sourceVersion: number;
  /** True when the stage is shown mirrored (front camera). */
  mirrored: boolean;
  /** Global intensity 0..1 from the store. */
  intensity: number;
  face: { landmarks: Landmark[]; anchors: FaceAnchors; fade: number } | null;
  hand: { anchors: HandAnchors; fade: number } | null;
  body: { anchors: BodyAnchors; fade: number } | null;
  hair: { mask: MaskResult; version: number; fade: number } | null;
}

/** A drawing backend for one family of assets. */
export interface Renderer {
  readonly kind: RendererKind;
  /** Canvas element that shows the result. GL renderers share one canvas. */
  readonly canvas: HTMLCanvasElement;
  /** Prepares the renderer for an asset (variant already applied). Loads textures or models. */
  setAsset(asset: AssetManifest): Promise<void>;
  /** Draws one frame. Must be cheap and must never throw for missing tracking data. */
  render(frame: FrameState): void;
  /** Clears the output, for example when the asset is removed. */
  clear(): void;
  dispose(): void;
}

/** Loads an image for use as a texture (CORS enabled). */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return img;
}
