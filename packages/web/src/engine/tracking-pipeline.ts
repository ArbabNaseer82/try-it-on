import {
  DEFAULT_FOV_Y,
  OneEuroFilter,
  PoseFilter,
  SMOOTHING_DEFAULTS,
  TRACKING_LOST_GRACE_MS,
  VectorFilter,
  computeBodyAnchors,
  computeFaceAnchors,
  computeHandAnchors,
  estimateMetricScale,
  type AnchorPose,
  type BodyAnchors,
  type BodyRig,
  type FaceAnchors,
  type FaceResult,
  type HandAnchors,
  type HandResult,
  type Landmark,
  type MaskResult,
  type OneEuroOptions,
  type PoseResult,
  type SmoothingCategory,
  type TorsoQuad,
  type Vec2,
} from '@tryonit/core';
import type { FrameState } from '../renderers/renderer.interface';

type Visibility = 'face' | 'hand' | 'body';

export interface PipelineOptions {
  smoothing?: Partial<Record<SmoothingCategory, OneEuroOptions>>;
  irisDiameterMm?: number;
  onVisibilityChange?: (kind: Visibility, visible: boolean) => void;
}

/** Landmark smoother: one One Euro filter per coordinate. */
class LandmarkSmoother {
  private filters: OneEuroFilter[] = [];
  constructor(private readonly options: OneEuroOptions) {}
  filter(landmarks: readonly Landmark[], t: number): Landmark[] {
    const needed = landmarks.length * 3;
    while (this.filters.length < needed) this.filters.push(new OneEuroFilter(this.options));
    return landmarks.map((l, i) => {
      const f = this.filters;
      return {
        x: (f[i * 3] as OneEuroFilter).filter(l.x, t),
        y: (f[i * 3 + 1] as OneEuroFilter).filter(l.y, t),
        z: (f[i * 3 + 2] as OneEuroFilter).filter(l.z, t),
      };
    });
  }
  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}

type PoseKeys = 'head' | 'noseBridge' | 'forehead' | 'leftEar' | 'rightEar' | 'occluder';
type RingKeys = 'index' | 'middle' | 'ring' | 'pinky';

interface Track<T> {
  value: T | null;
  lastSeen: number;
  visible: boolean;
}

const newTrack = <T>(): Track<T> => ({ value: null, lastSeen: -Infinity, visible: false });

/**
 * Turns raw detections into smoothed anchors and computes the fade out after tracking is lost.
 * Lives on the fast path: nothing here touches the store except visibility flips.
 */
export class TrackingPipeline {
  private face = newTrack<{ landmarks: Landmark[]; anchors: FaceAnchors }>();
  private hand = newTrack<HandAnchors>();
  private body = newTrack<BodyAnchors>();
  private hair = newTrack<{ mask: MaskResult; version: number }>();
  private hairVersion = 0;
  private readonly faceSmoother: LandmarkSmoother;
  private readonly facePoses = new Map<PoseKeys, PoseFilter>();
  private readonly handPoses = new Map<'wrist' | RingKeys, PoseFilter>();
  private readonly bodyFilter: VectorFilter;
  private readonly rigFilter: VectorFilter;
  private readonly scaleFilter = new OneEuroFilter({ minCutoff: 0.3, beta: 0 });
  private readonly settings: Record<SmoothingCategory, OneEuroOptions>;
  /** When true (photo mode) results are not smoothed and never fade. */
  staticMode = false;

  constructor(private readonly options: PipelineOptions = {}) {
    this.settings = { ...SMOOTHING_DEFAULTS, ...options.smoothing };
    this.faceSmoother = new LandmarkSmoother(this.settings.makeup);
    this.bodyFilter = new VectorFilter(this.settings.body);
    this.rigFilter = new VectorFilter(this.settings.body);
  }

  reset(): void {
    this.faceSmoother.reset();
    this.facePoses.forEach((f) => f.reset());
    this.handPoses.forEach((f) => f.reset());
    this.bodyFilter.reset();
    this.rigFilter.reset();
    this.scaleFilter.reset();
    for (const kind of ['face', 'hand', 'body'] as const) this.setVisible(kind, false);
    this.face = newTrack();
    this.hand = newTrack();
    this.body = newTrack();
    this.hair = newTrack();
  }

  private smoothPose<K extends string>(
    map: Map<K, PoseFilter>,
    key: K,
    pose: AnchorPose,
    t: number,
    cat: SmoothingCategory,
  ): AnchorPose {
    if (this.staticMode) return pose;
    let filter = map.get(key);
    if (!filter) {
      filter = new PoseFilter(this.settings[cat]);
      map.set(key, filter);
    }
    return filter.filter(pose, t);
  }

  private setVisible(kind: Visibility, visible: boolean): void {
    const track = this[kind];
    if (track.visible === visible) return;
    track.visible = visible;
    this.options.onVisibilityChange?.(kind, visible);
  }

  updateFace(result: FaceResult | null, t: number, aspect: number): void {
    if (!result) return;
    const landmarks = this.staticMode
      ? result.landmarks
      : this.faceSmoother.filter(result.landmarks, t);
    const camera = { fovY: DEFAULT_FOV_Y, aspect };
    const metric = estimateMetricScale(landmarks, {
      aspect,
      ...(this.options.irisDiameterMm ? { irisDiameterMm: this.options.irisDiameterMm } : {}),
    });
    const rawScale = metric?.scaleFactor ?? 1;
    const scaleFactor = this.staticMode ? rawScale : this.scaleFilter.filter(rawScale, t);
    const anchors = computeFaceAnchors(
      { landmarks, matrix: result.matrix },
      { camera, scaleFactor },
    );
    if (!anchors) return;
    for (const key of [
      'head',
      'noseBridge',
      'forehead',
      'leftEar',
      'rightEar',
      'occluder',
    ] as const) {
      anchors[key] = this.smoothPose(this.facePoses, key, anchors[key], t, 'face3d');
    }
    this.face.value = { landmarks, anchors };
    this.face.lastSeen = t;
    this.setVisible('face', true);
  }

  updateHand(result: HandResult | null, t: number, aspect: number): void {
    if (!result) return;
    const anchors = computeHandAnchors(result, { camera: { fovY: DEFAULT_FOV_Y, aspect } });
    if (!anchors) return;
    anchors.wrist = this.smoothPose(this.handPoses, 'wrist', anchors.wrist, t, 'hand');
    for (const finger of ['index', 'middle', 'ring', 'pinky'] as const) {
      anchors.rings[finger] = this.smoothPose(
        this.handPoses,
        finger,
        anchors.rings[finger],
        t,
        'hand',
      );
    }
    this.hand.value = anchors;
    this.hand.lastSeen = t;
    this.setVisible('hand', true);
  }

  updateBody(result: PoseResult | null, t: number, aspect: number, padding = 1.15): void {
    if (!result) return;
    const anchors = computeBodyAnchors(result, { aspect, padding });
    if (!anchors || !anchors.visible) return;
    if (!this.staticMode) {
      const q = anchors.torso;
      const f = this.bodyFilter.filter(
        [...q.leftShoulder, ...q.rightShoulder, ...q.leftHip, ...q.rightHip],
        t,
      );
      const v = (i: number): Vec2 => [f[i] as number, f[i + 1] as number];
      const torso: TorsoQuad = {
        leftShoulder: v(0),
        rightShoulder: v(2),
        leftHip: v(4),
        rightHip: v(6),
      };
      anchors.torso = torso;
      anchors.rig = unflattenRig(this.rigFilter.filter(flattenRig(anchors.rig), t), anchors.rig);
    }
    this.body.value = anchors;
    this.body.lastSeen = t;
    this.setVisible('body', true);
  }

  /** Stores the hair mask. Visibility maps to `faceVisible` (a head is in view). */
  updateHair(mask: MaskResult | null, t: number): boolean {
    if (!mask) return false;
    let covered = 0;
    for (let i = 0; i < mask.data.length; i += 4) if ((mask.data[i] ?? 0) > 128) covered++;
    const visible = covered / (mask.data.length / 4) > 0.005;
    if (!visible) return false;
    this.hair.value = { mask, version: ++this.hairVersion };
    this.hair.lastSeen = t;
    this.setVisible('face', true);
    return true;
  }

  private fade(track: Track<unknown>, now: number, kind: Visibility | null): number {
    if (!track.value) return 0;
    if (this.staticMode) return 1;
    const age = now - track.lastSeen;
    if (age <= 1000 / 12) return 1;
    const fade = 1 - (age - 1000 / 12) / TRACKING_LOST_GRACE_MS;
    if (fade <= 0) {
      if (kind) this.setVisible(kind, false);
      return 0;
    }
    return fade;
  }

  /** Builds the tracking part of the frame state for renderers. */
  snapshot(now: number): Pick<FrameState, 'face' | 'hand' | 'body' | 'hair'> {
    const faceFade = this.fade(this.face, now, this.hair.value ? null : 'face');
    const hairFade = this.fade(this.hair, now, this.face.value ? null : 'face');
    const handFade = this.fade(this.hand, now, 'hand');
    const bodyFade = this.fade(this.body, now, 'body');
    return {
      face: this.face.value && faceFade > 0 ? { ...this.face.value, fade: faceFade } : null,
      hand: this.hand.value && handFade > 0 ? { anchors: this.hand.value, fade: handFade } : null,
      body: this.body.value && bodyFade > 0 ? { anchors: this.body.value, fade: bodyFade } : null,
      hair: this.hair.value && hairFade > 0 ? { ...this.hair.value, fade: hairFade } : null,
    };
  }

  /** Smoothed face landmarks for the debug overlay. */
  get faceLandmarks(): Landmark[] | null {
    return this.face.value?.landmarks ?? null;
  }
}

/** Rig points as one flat number list, in a fixed order, for smoothing. */
function flattenRig(rig: BodyRig): number[] {
  const points = [
    rig.neck,
    rig.leftShoulder,
    rig.rightShoulder,
    rig.leftElbow,
    rig.rightElbow,
    rig.leftHip,
    rig.rightHip,
    ...rig.leftSide,
    ...rig.rightSide,
  ];
  return points.flat();
}

function unflattenRig(values: number[], like: BodyRig): BodyRig {
  let i = 0;
  const next = (): Vec2 => [values[i++] as number, values[i++] as number];
  return {
    neck: next(),
    leftShoulder: next(),
    rightShoulder: next(),
    leftElbow: next(),
    rightElbow: next(),
    leftHip: next(),
    rightHip: next(),
    levels: like.levels,
    leftSide: like.leftSide.map(next),
    rightSide: like.rightSide.map(next),
    measured: like.measured,
  };
}
