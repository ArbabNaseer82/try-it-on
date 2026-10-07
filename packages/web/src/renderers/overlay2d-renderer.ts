import type { AssetManifest, ClothingTopAsset, FaceOverlay2DAsset } from '@tryonit/core';
import { ErrorCode, TryOnError, isFittedGarment } from '@tryonit/core';
import { createProgram, type Program } from './gl/program';
import { CLOTH_FRAG, OVERLAY_FRAG, OVERLAY_VERT } from './gl/shaders/overlay.glsl';
import { ATTR, type GLStage } from './gl/stage';
import { createTexture, uploadImage } from './gl/texture';
import {
  fittedGarmentMesh,
  garmentMesh,
  stickerQuad,
  type OverlayMesh,
} from './overlay2d-geometry';
import { loadImage, type FrameState, type Renderer } from './renderer.interface';

/** Flat PNG overlays: face stickers and garments (four point warp or fitted to the body). */
export class Overlay2DRenderer implements Renderer {
  readonly kind = 'overlay2d' as const;
  private readonly program: Program;
  private readonly cloth: Program;
  private readonly texture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private readonly posBuffer: WebGLBuffer;
  private readonly uvBuffer: WebGLBuffer;
  private asset: FaceOverlay2DAsset | ClothingTopAsset | null = null;
  private imageSize: [number, number] = [1, 1];
  private loadToken = 0;

  constructor(private readonly stage: GLStage) {
    const gl = stage.gl;
    this.program = createProgram(gl, OVERLAY_VERT, OVERLAY_FRAG, ATTR);
    this.cloth = createProgram(gl, OVERLAY_VERT, CLOTH_FRAG, ATTR);
    this.texture = createTexture(gl);
    const vao = gl.createVertexArray();
    const pos = gl.createBuffer();
    const uv = gl.createBuffer();
    if (!vao || !pos || !uv) throw new Error('Could not create buffers');
    this.vao = vao;
    this.posBuffer = pos;
    this.uvBuffer = uv;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.enableVertexAttribArray(ATTR.a_pos);
    gl.vertexAttribPointer(ATTR.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.enableVertexAttribArray(ATTR.a_local);
    gl.vertexAttribPointer(ATTR.a_local, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  get canvas(): HTMLCanvasElement {
    return this.stage.canvas;
  }

  async setAsset(asset: AssetManifest): Promise<void> {
    if (asset.type !== 'face.overlay2d' && asset.type !== 'clothing.top') return;
    const token = ++this.loadToken;
    let image: HTMLImageElement;
    try {
      image = await loadImage(asset.image);
    } catch (error) {
      throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, `Failed to load image "${asset.image}".`, {
        cause: error,
      });
    }
    if (token !== this.loadToken) return;
    uploadImage(this.stage.gl, this.texture, image, true);
    this.imageSize = [image.naturalWidth, image.naturalHeight];
    this.asset = asset;
  }

  clear(): void {
    this.asset = null;
    this.loadToken++;
  }

  private mesh(frame: FrameState): { mesh: OverlayMesh; fade: number } | null {
    const asset = this.asset;
    if (!asset) return null;
    if (asset.type === 'face.overlay2d') {
      if (!frame.face) return null;
      const anchor = frame.face.anchors.overlay[asset.anchor ?? 'noseBridge'];
      return {
        mesh: stickerQuad(anchor, {
          scale: asset.scale ?? 1,
          offset: asset.offset ?? [0, 0],
          imageAspect: this.imageSize[0] / this.imageSize[1],
          mirrored: frame.mirrored,
          frameWidth: frame.width,
          frameHeight: frame.height,
        }),
        fade: frame.face.fade,
      };
    }
    if (!frame.body || !frame.body.anchors.visible) return null;
    if (isFittedGarment(asset.anchors)) {
      return {
        mesh: fittedGarmentMesh(
          asset.anchors,
          frame.body.anchors.rig,
          this.imageSize[0],
          this.imageSize[1],
          frame.width,
          frame.height,
          asset.fit ?? 1.06,
        ),
        fade: frame.body.fade,
      };
    }
    const mesh = garmentMesh(
      asset.anchors,
      frame.body.anchors.torso,
      this.imageSize[0],
      this.imageSize[1],
    );
    return mesh ? { mesh, fade: frame.body.fade } : null;
  }

  render(frame: FrameState): void {
    const { stage, program } = this;
    const gl = stage.gl;
    stage.beginFrame(frame.source, frame.width, frame.height, frame.sourceVersion);
    stage.blitToScreen(stage.frameTexture);
    const result = this.mesh(frame);
    if (!result || !this.asset) return;
    const { mesh, fade } = result;
    const asset = this.asset;
    const fitted = asset.type === 'clothing.top' && isFittedGarment(asset.anchors);
    const active = fitted ? this.cloth : program;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    active.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(active.uniform('u_tex'), 0);
    gl.uniform1f(active.uniform('u_opacity'), (asset.opacity ?? 1) * frame.intensity * fade);
    if (fitted) {
      // The frame under the garment provides its light and folds.
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, stage.frameTexture);
      gl.uniform1i(active.uniform('u_frame'), 1);
      gl.uniform1f(active.uniform('u_shading'), asset.shading ?? 0.6);
      gl.uniform1f(active.uniform('u_aspect'), frame.width / frame.height);
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.positions.length / 2);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  dispose(): void {
    const gl = this.stage.gl;
    this.program.dispose();
    this.cloth.dispose();
    gl.deleteTexture(this.texture);
    gl.deleteBuffer(this.posBuffer);
    gl.deleteBuffer(this.uvBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
