import type { Vec2, Vec3 } from './tracking.types';

/** Every product category TryOnIt can render. */
export type AssetType =
  | 'makeup.lips'
  | 'makeup.blush'
  | 'makeup.eyeshadow'
  | 'makeup.eyeliner'
  | 'makeup.brows'
  | 'makeup.foundation'
  | 'makeup.look'
  | 'hair.color'
  | 'glasses'
  | 'hat'
  | 'earrings'
  | 'face.overlay2d'
  | 'watch'
  | 'ring'
  | 'clothing.top';

export type MakeupLayerType =
  | 'makeup.lips'
  | 'makeup.blush'
  | 'makeup.eyeshadow'
  | 'makeup.eyeliner'
  | 'makeup.brows'
  | 'makeup.foundation';

export type LipFinish = 'matte' | 'gloss' | 'satin' | 'shimmer';
export type EyeshadowFinish = 'matte' | 'satin' | 'shimmer';
export type EarringSide = 'both' | 'left' | 'right';
export type RingFinger = 'index' | 'middle' | 'ring' | 'pinky';
export type OcclusionMode = 'head' | 'none';
export type FaceOverlayAnchor =
  'forehead' | 'eyes' | 'noseBridge' | 'noseTip' | 'mouth' | 'chin' | 'leftCheek' | 'rightCheek';

/** Offset applied in anchor space. Position in millimeters, rotation in degrees. */
export interface Transform {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
}

/** A product variant (shade, color, frame style) that overrides some asset fields. */
export interface Variant<TProps = Record<string, unknown>> {
  id: string;
  name?: string;
  /** CSS color shown in swatches. */
  swatch?: string;
  thumbnail?: string;
  overrides?: Partial<TProps>;
}

/** Fields shared by every asset manifest. */
export interface AssetBase<TType extends AssetType, TProps> {
  version: 1;
  id: string;
  type: TType;
  name?: string;
  thumbnail?: string;
  variants?: Variant<TProps>[];
  defaultVariantId?: string;
  /** Merchant data passthrough (sku, price). Never interpreted by TryOnIt. */
  meta?: Record<string, unknown>;
}

// Makeup props -------------------------------------------------------------

export interface LipsProps {
  color: string;
  /** 0..1, default 0.6 */
  opacity?: number;
  /** default `matte` */
  finish?: LipFinish;
}

export interface BlushProps {
  color: string;
  /** 0..1, default 0.35 */
  opacity?: number;
  /** Relative blush radius 0..1, default 0.5 */
  size?: number;
}

export interface EyeshadowProps {
  color: string;
  /** 0..1, default 0.5 */
  opacity?: number;
  /** default `matte` */
  finish?: EyeshadowFinish;
}

export interface EyelinerProps {
  color: string;
  /** 0..1, default 0.9 */
  opacity?: number;
  /** Relative line thickness 0..1, default 0.35 */
  thickness?: number;
  /** Draws a winged tip, default false */
  wing?: boolean;
}

export interface BrowsProps {
  color: string;
  /** 0..1, default 0.4 */
  opacity?: number;
}

export interface FoundationProps {
  color: string;
  /** 0..1, default 0.35 */
  opacity?: number;
  /** 0..1 how much skin texture is evened out, default 0.4 */
  coverage?: number;
}

export type MakeupLayer =
  | ({ type: 'makeup.lips' } & LipsProps)
  | ({ type: 'makeup.blush' } & BlushProps)
  | ({ type: 'makeup.eyeshadow' } & EyeshadowProps)
  | ({ type: 'makeup.eyeliner' } & EyelinerProps)
  | ({ type: 'makeup.brows' } & BrowsProps)
  | ({ type: 'makeup.foundation' } & FoundationProps);

export interface MakeupLookProps {
  layers: MakeupLayer[];
}

// Hair --------------------------------------------------------------------

export interface HairColorProps {
  color: string;
  /** 0..1, default 0.55 */
  opacity?: number;
}

// 3D accessories ------------------------------------------------------------

export interface Model3DProps {
  /** URL of a .glb or .gltf file, authored in millimeters. */
  model: string;
  transform?: Transform;
}

export interface GlassesProps extends Model3DProps {
  /** default `head` */
  occlusion?: OcclusionMode;
}

export interface HatProps extends Model3DProps {
  /** default `head` */
  occlusion?: OcclusionMode;
}

export interface EarringsProps extends Model3DProps {
  /** default `both` */
  side?: EarringSide;
}

export interface WatchProps extends Model3DProps {
  /** Wrist width the model was authored for, default 60 */
  wristWidthMm?: number;
}

export interface RingProps extends Model3DProps {
  /** default `ring` */
  finger?: RingFinger;
  /** Inner diameter in millimeters, default 18 */
  sizeMm?: number;
}

// 2D overlays ---------------------------------------------------------------

export interface FaceOverlay2DProps {
  /** URL of a PNG with transparency. */
  image: string;
  /** default `noseBridge` */
  anchor?: FaceOverlayAnchor;
  /** Width relative to face width, default 1 */
  scale?: number;
  /** Offset relative to face width, default [0, 0] */
  offset?: Vec2;
  /** 0..1, default 1 */
  opacity?: number;
}

/** Garment anchor points in image pixels. */
export interface ClothingAnchors {
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
}

/** @experimental Basic 2D garment overlay. Front facing only, no arm occlusion. */
export interface ClothingTopProps {
  /** URL of a front facing garment PNG with a transparent background. */
  image: string;
  anchors: ClothingAnchors;
  /** Multiplier applied to the detected shoulder width, default 1.15 */
  padding?: number;
  /** 0..1, default 1 */
  opacity?: number;
}

// Manifests -----------------------------------------------------------------

export type LipsAsset = AssetBase<'makeup.lips', LipsProps> & LipsProps;
export type BlushAsset = AssetBase<'makeup.blush', BlushProps> & BlushProps;
export type EyeshadowAsset = AssetBase<'makeup.eyeshadow', EyeshadowProps> & EyeshadowProps;
export type EyelinerAsset = AssetBase<'makeup.eyeliner', EyelinerProps> & EyelinerProps;
export type BrowsAsset = AssetBase<'makeup.brows', BrowsProps> & BrowsProps;
export type FoundationAsset = AssetBase<'makeup.foundation', FoundationProps> & FoundationProps;
export type MakeupLookAsset = AssetBase<'makeup.look', MakeupLookProps> & MakeupLookProps;
export type HairColorAsset = AssetBase<'hair.color', HairColorProps> & HairColorProps;
export type GlassesAsset = AssetBase<'glasses', GlassesProps> & GlassesProps;
export type HatAsset = AssetBase<'hat', HatProps> & HatProps;
export type EarringsAsset = AssetBase<'earrings', EarringsProps> & EarringsProps;
export type FaceOverlay2DAsset = AssetBase<'face.overlay2d', FaceOverlay2DProps> &
  FaceOverlay2DProps;
export type WatchAsset = AssetBase<'watch', WatchProps> & WatchProps;
export type RingAsset = AssetBase<'ring', RingProps> & RingProps;
/** @experimental */
export type ClothingTopAsset = AssetBase<'clothing.top', ClothingTopProps> & ClothingTopProps;

/** Any valid asset manifest, discriminated on `type`. */
export type AssetManifest =
  | LipsAsset
  | BlushAsset
  | EyeshadowAsset
  | EyelinerAsset
  | BrowsAsset
  | FoundationAsset
  | MakeupLookAsset
  | HairColorAsset
  | GlassesAsset
  | HatAsset
  | EarringsAsset
  | FaceOverlay2DAsset
  | WatchAsset
  | RingAsset
  | ClothingTopAsset;

/** Assets that render a 3D model through the lazily loaded three.js renderer. */
export type Model3DAsset = GlassesAsset | HatAsset | EarringsAsset | WatchAsset | RingAsset;

/** Where an asset can come from: an inline object, a URL to a JSON manifest, or an async loader. */
export type AssetSource =
  AssetManifest | string | ((signal?: AbortSignalLike) => Promise<unknown> | unknown);

/** Minimal AbortSignal shape so core stays free of DOM types. */
export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener?(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener?(type: 'abort', listener: () => void): void;
}

export type TrackerKind = 'face' | 'hand' | 'pose' | 'segmenter';
export type RendererKind = 'makeup' | 'hair' | 'overlay2d' | 'three';
