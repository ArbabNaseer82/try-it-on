import {
  DEFAULT_FOV_Y,
  FACE_ANCHOR_DEFAULTS,
  clamp,
  type AnchorPose,
  type AssetManifest,
  type Model3DAsset,
  type Transform,
} from '@tryonit/core';
import type { Material } from 'three';
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { FrameState, Renderer } from '../renderer.interface';
import { loadModel, type ModelLoaderOptions } from './gltf-loader';
import { createHeadOccluder, createLimbOccluder } from './occluders';

/** Models are authored in millimeters, the scene uses centimeters (MediaPipe face space). */
const MM_TO_CM = 0.1;
const DEG = Math.PI / 180;

/** Category defaults applied before the merchant transform, in millimeters. */
const DEFAULT_OFFSET_MM: Partial<Record<Model3DAsset['type'], [number, number, number]>> = {
  watch: [0, -22, 0],
};

export interface ThreeRendererOptions extends ModelLoaderOptions {
  /** Multiplies the metric scale correction. Default 1. */
  scale?: number;
}

function applyTransform(
  target: Object3D,
  transform: Transform | undefined,
  base?: [number, number, number],
): void {
  const [bx, by, bz] = base ?? [0, 0, 0];
  const [px, py, pz] = transform?.position ?? [0, 0, 0];
  target.position.set(bx + px, by + py, bz + pz);
  const [rx, ry, rz] = transform?.rotation ?? [0, 0, 0];
  target.rotation.set(rx * DEG, ry * DEG, rz * DEG);
  const s = transform?.scale ?? 1;
  if (typeof s === 'number') target.scale.setScalar(s);
  else target.scale.set(s[0], s[1], s[2]);
}

function setPose(target: Object3D, pose: AnchorPose, scale: number): void {
  target.position.set(pose.position[0], pose.position[1], pose.position[2]);
  target.quaternion.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  target.scale.setScalar(scale);
}

/** Applies a global opacity for the tracking lost fade out. */
function setOpacity(root: Object3D, opacity: number): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of materials) {
      if (!m.colorWrite) continue;
      const data = m.userData as { toiOpacity?: number; toiTransparent?: boolean };
      if (data.toiOpacity === undefined) {
        data.toiOpacity = m.opacity;
        data.toiTransparent = m.transparent;
      }
      const fading = opacity < 0.999;
      m.transparent = fading || !!data.toiTransparent;
      m.opacity = data.toiOpacity * opacity;
    }
  });
}

/**
 * three.js renderer for glasses, hats, earrings, watches and rings. Loaded only through a
 * dynamic import, so makeup only pages never download three.js.
 */
export class ThreeRenderer implements Renderer {
  readonly kind = 'three' as const;
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(DEFAULT_FOV_Y, 4 / 3, 1, 10000);
  private readonly anchors: [Group, Group] = [new Group(), new Group()];
  private readonly offsets: [Group, Group] = [new Group(), new Group()];
  private readonly headOccluder = createHeadOccluder();
  private readonly limbOccluder = createLimbOccluder('toi-limb-occluder');
  private asset: Model3DAsset | null = null;
  private loadToken = 0;

  constructor(private readonly options: ThreeRendererOptions = {}) {
    this.canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const hemi = new HemisphereLight(0xffffff, 0x404040, 1.1);
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(0, 30, 40);
    key.target.position.set(0, 0, -50);
    this.scene.add(hemi, key, key.target);
    this.anchors.forEach((anchor, i) => {
      anchor.add(this.offsets[i] as Group);
      anchor.visible = false;
      this.scene.add(anchor);
    });
    this.headOccluder.visible = false;
    this.limbOccluder.visible = false;
    this.scene.add(this.headOccluder, this.limbOccluder);
  }

  async setAsset(asset: AssetManifest): Promise<void> {
    if (!['glasses', 'hat', 'earrings', 'watch', 'ring'].includes(asset.type)) return;
    const model3d = asset as Model3DAsset;
    const token = ++this.loadToken;
    const pair = asset.type === 'earrings' ? 2 : 1;
    const models = await Promise.all(
      Array.from({ length: pair }, () => loadModel(model3d.model, this.renderer, this.options)),
    );
    if (token !== this.loadToken) return;
    this.offsets.forEach((offset, i) => {
      offset.clear();
      const model = models[i];
      if (model) offset.add(model);
      applyTransform(offset, model3d.transform, DEFAULT_OFFSET_MM[model3d.type]);
    });
    // The right earring is mirrored so asymmetric designs face outward on both ears.
    if (asset.type === 'earrings') this.offsets[1].scale.x *= -1;
    this.asset = model3d;
  }

  clear(): void {
    this.loadToken++;
    this.asset = null;
    this.offsets.forEach((o) => o.clear());
    this.anchors.forEach((a) => (a.visible = false));
  }

  private hideAll(): void {
    this.anchors.forEach((a) => (a.visible = false));
    this.headOccluder.visible = false;
    this.limbOccluder.visible = false;
  }

  render(frame: FrameState): void {
    const { renderer, camera } = this;
    if (this.canvas.width !== frame.width || this.canvas.height !== frame.height) {
      renderer.setSize(frame.width, frame.height, false);
    }
    if (camera.aspect !== frame.aspect) {
      camera.aspect = frame.aspect;
      camera.updateProjectionMatrix();
    }
    this.hideAll();
    const fade = this.place(frame);
    if (fade > 0) for (const anchor of this.anchors) setOpacity(anchor, fade);
    renderer.render(this.scene, camera);
  }

  /** Positions anchors for the current asset. Returns the fade value (0 hides). */
  private place(frame: FrameState): number {
    const asset = this.asset;
    if (!asset) return 0;
    const extra = this.options.scale ?? 1;
    const [primary, secondary] = this.anchors;
    switch (asset.type) {
      case 'glasses':
      case 'hat': {
        const face = frame.face;
        if (!face || face.fade <= 0) return 0;
        const pose = asset.type === 'glasses' ? face.anchors.noseBridge : face.anchors.forehead;
        setPose(primary, pose, MM_TO_CM * pose.scale * extra);
        primary.visible = true;
        if ((asset.occlusion ?? 'head') === 'head') {
          const occ = face.anchors.occluder;
          this.headOccluder.position.set(...occ.position);
          this.headOccluder.quaternion.set(...occ.rotation);
          // Radii come from FACE_ANCHOR_DEFAULTS.occluderRadii (cm), scaled with the face.
          const [rx, ry, rz] = FACE_ANCHOR_DEFAULTS.occluderRadii;
          this.headOccluder.scale.set(rx * occ.scale, ry * occ.scale, rz * occ.scale);
          this.headOccluder.visible = true;
        }
        return face.fade;
      }
      case 'earrings': {
        const face = frame.face;
        if (!face || face.fade <= 0) return 0;
        const side = asset.side ?? 'both';
        const a = face.anchors;
        if (side !== 'right' && a.leftEarVisible) {
          setPose(primary, a.leftEar, MM_TO_CM * a.leftEar.scale * extra);
          primary.visible = true;
        }
        if (side !== 'left' && a.rightEarVisible) {
          setPose(secondary, a.rightEar, MM_TO_CM * a.rightEar.scale * extra);
          secondary.visible = true;
        }
        return face.fade;
      }
      case 'watch': {
        const hand = frame.hand;
        if (!hand || hand.fade <= 0) return 0;
        const wristMm = hand.anchors.palmWidthCm * 10 * 0.85;
        const fit = clamp(wristMm / (asset.wristWidthMm ?? 60), 0.8, 1.3);
        setPose(primary, hand.anchors.wrist, MM_TO_CM * fit * extra);
        primary.visible = true;
        // Wrist occluder: flattened cylinder along the forearm, behind the watch face.
        const occ = this.limbOccluder;
        occ.position.set(...hand.anchors.wrist.position);
        occ.quaternion.set(...hand.anchors.wrist.rotation);
        occ.translateY(-3);
        occ.translateZ(-0.4);
        const r = (wristMm * MM_TO_CM) / 2;
        occ.scale.set(r * 0.92, 9, r * 0.62);
        occ.visible = true;
        return hand.fade;
      }
      case 'ring': {
        const hand = frame.hand;
        if (!hand || hand.fade <= 0) return 0;
        const pose = hand.anchors.rings[asset.finger ?? 'ring'];
        setPose(primary, pose, MM_TO_CM * extra);
        primary.visible = true;
        const occ = this.limbOccluder;
        occ.position.set(...pose.position);
        occ.quaternion.set(...pose.rotation);
        const r = ((asset.sizeMm ?? 18) * MM_TO_CM) / 2;
        occ.scale.set(r * 0.98, 3.2, r * 0.98);
        occ.visible = true;
        return hand.fade;
      }
    }
  }

  dispose(): void {
    this.clear();
    this.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        const materials: Material[] = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
