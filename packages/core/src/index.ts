// Domain ----------------------------------------------------------------------
export type {
  AbortSignalLike,
  AssetBase,
  AssetManifest,
  AssetSource,
  AssetType,
  BlushAsset,
  BlushProps,
  BrowsAsset,
  BrowsProps,
  ClothingAnchors,
  ClothingTopAsset,
  ClothingTopProps,
  EarringSide,
  EarringsAsset,
  EarringsProps,
  EyelinerAsset,
  EyelinerProps,
  EyeshadowAsset,
  EyeshadowFinish,
  EyeshadowProps,
  FaceOverlay2DAsset,
  FaceOverlay2DProps,
  FaceOverlayAnchor,
  FoundationAsset,
  FoundationProps,
  GlassesAsset,
  GlassesProps,
  HairColorAsset,
  HairColorProps,
  HatAsset,
  HatProps,
  LipFinish,
  LipsAsset,
  LipsProps,
  MakeupLayer,
  MakeupLayerType,
  MakeupLookAsset,
  MakeupLookProps,
  Model3DAsset,
  Model3DProps,
  OcclusionMode,
  RendererKind,
  RingAsset,
  RingFinger,
  RingProps,
  TrackerKind,
  Transform,
  Variant,
  WatchAsset,
  WatchProps,
} from './domain/asset.types';
export type {
  Anchor2D,
  AnchorPose,
  CameraModel,
  FaceResult,
  FrameResults,
  HandResult,
  Landmark,
  MaskResult,
  Matrix4,
  PoseResult,
  Quat,
  Vec2,
  Vec3,
} from './domain/tracking.types';
export type {
  CameraFacing,
  FrameSourceKind,
  PerfState,
  SessionState,
  SessionStatus,
  TrackingState,
} from './domain/session.types';
export { FACE, FACE_REGIONS, FINGER_SEGMENTS, HAND, POSE } from './domain/landmarks';
export {
  ErrorCode,
  TryOnError,
  isTryOnError,
  toTryOnError,
  type TryOnErrorOptions,
  type ValidationIssue,
} from './domain/errors';

// Validation ------------------------------------------------------------------
export {
  s,
  type DefaultSchema,
  type Infer,
  type ObjectSchema,
  type OptionalSchema,
  type ParseOptions,
  type SafeParseResult,
  type Schema,
} from './validation/schema';
export { formatIssues, formatPath } from './validation/issues';
export {
  ASSET_TYPES,
  MANIFEST_DEFAULTS,
  assetSchemas,
  manifestSchema,
  safeValidateManifest,
  validateManifest,
} from './validation/manifest.schema';

// State -----------------------------------------------------------------------
export { createStore, type Listener, type Store } from './state/create-store';
export { shallowEqual, subscribeSelector } from './state/selectors';
export {
  SESSION_TRANSITIONS,
  canTransition,
  createInitialSessionState,
  createSessionStore,
  type SessionActions,
  type SessionStore,
  type SessionStoreOptions,
} from './state/session.store';

// Events ----------------------------------------------------------------------
export { createEmitter, type Emitter, type EventMap, type Handler } from './events/emitter';

// Math ------------------------------------------------------------------------
export {
  add3,
  clamp,
  cross3,
  distance2,
  dot3,
  length3,
  lerp,
  lerp2,
  lerp3,
  normalize3,
  scale3,
  sub3,
} from './math/vec';
export {
  IDENTITY_QUAT,
  quatAngle,
  quatFromBasis,
  quatFromEuler,
  quatMultiply,
  quatNormalize,
  quatRotateVec3,
  quatSlerp,
} from './math/quat';
export {
  mat4Compose,
  mat4Decompose,
  mat4Identity,
  mat4Multiply,
  mat4TransformPoint,
} from './math/mat4';
export { OneEuroFilter, VectorFilter, type OneEuroOptions } from './math/one-euro-filter';
export { applyHomography, computeHomography, warpGrid, type Homography } from './math/homography';
export { createMlsDeformer, deformGrid } from './math/mls';
export { polygonArea, triangulate } from './math/polygon';

// Anchors ---------------------------------------------------------------------
export {
  DEFAULT_FOV_Y,
  imageDistance,
  imageWidthAtDepth,
  project,
  unproject,
  unprojectLandmark,
} from './anchors/camera';
export {
  FACE_ANCHOR_DEFAULTS,
  computeFaceAnchors,
  type FaceAnchorConfig,
  type FaceAnchorOptions,
  type FaceAnchors,
} from './anchors/face-anchors';
export {
  HAND_ANCHOR_DEFAULTS,
  computeHandAnchors,
  type HandAnchorConfig,
  type HandAnchorOptions,
  type HandAnchors,
} from './anchors/hand-anchors';
export {
  BODY_RIG_LEVELS,
  computeBodyAnchors,
  computeBodyRig,
  type BodyAnchorOptions,
  type BodyAnchors,
  type BodyRig,
  type TorsoQuad,
} from './anchors/body-anchors';
export {
  computeGarmentControls,
  isFittedGarment,
  type GarmentControls,
} from './anchors/garment-fit';
export {
  CANONICAL_FACE_WIDTH_MM,
  DEFAULT_IRIS_DIAMETER_MM,
  estimateMetricScale,
  type MetricScale,
  type MetricScaleOptions,
} from './anchors/metric-scale';
export {
  SMOOTHING_DEFAULTS,
  TRACKING_LOST_GRACE_MS,
  type SmoothingCategory,
} from './anchors/smoothing.config';

// Assets ----------------------------------------------------------------------
export {
  createAbortError,
  defaultAssetCache,
  getCachedAsset,
  isAbortError,
  rebaseAssetUrls,
  resolveAsset,
  type FetchResponseLike,
  type Fetcher,
  type ResolveAssetOptions,
} from './assets/resolve-asset';
export { AssetCache } from './assets/asset-cache';
export {
  getAssetRequirements,
  mergeRequirements,
  type AssetRequirements,
} from './assets/requirements';
export { applyVariant, findVariant } from './assets/variants';
export { resolveUrl } from './assets/url';
export { PoseFilter, QuaternionFilter } from './math/pose-filter';
export { parseColor, type RGBA } from './math/color';
