import { parseColor, type AssetManifest } from '@tryonit/core';
import { createProgram, type Program } from './gl/program';
import { FULLSCREEN_VERT } from './gl/shaders/common.glsl';
import { HAIR_FRAG } from './gl/shaders/hair.glsl';
import { ATTR, type GLStage } from './gl/stage';
import { createTexture, uploadMask } from './gl/texture';
import type { FrameState, Renderer } from './renderer.interface';

/** Hair recoloring driven by the hair segmentation mask. */
export class HairRenderer implements Renderer {
  readonly kind = 'hair' as const;
  private readonly program: Program;
  private readonly maskTexture: WebGLTexture;
  private maskVersion = -1;
  private color: [number, number, number] = [0, 0, 0];
  private opacity = 0;

  constructor(private readonly stage: GLStage) {
    this.program = createProgram(stage.gl, FULLSCREEN_VERT, HAIR_FRAG, ATTR);
    this.maskTexture = createTexture(stage.gl);
    uploadMask(stage.gl, this.maskTexture, 1, 1, new Uint8Array([0]));
  }

  get canvas(): HTMLCanvasElement {
    return this.stage.canvas;
  }

  async setAsset(asset: AssetManifest): Promise<void> {
    if (asset.type !== 'hair.color') return;
    const [r, g, b] = parseColor(asset.color);
    this.color = [r, g, b];
    this.opacity = asset.opacity ?? 0.55;
  }

  clear(): void {
    this.opacity = 0;
  }

  render(frame: FrameState): void {
    const { stage, program } = this;
    const gl = stage.gl;
    stage.beginFrame(frame.source, frame.width, frame.height, frame.sourceVersion);
    const hair = frame.hair;
    if (hair && hair.version !== this.maskVersion) {
      this.maskVersion = hair.version;
      uploadMask(gl, this.maskTexture, hair.mask.width, hair.mask.height, hair.mask.data);
    }
    stage.bindScreen();
    program.use();
    gl.uniform1f(program.uniform('u_flipY'), 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stage.frameTexture);
    gl.uniform1i(program.uniform('u_frame'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.uniform1i(program.uniform('u_mask'), 1);
    gl.uniform3f(program.uniform('u_color'), ...this.color);
    gl.uniform1f(program.uniform('u_opacity'), this.opacity * frame.intensity * (hair?.fade ?? 0));
    stage.drawQuad();
    gl.activeTexture(gl.TEXTURE0);
  }

  dispose(): void {
    this.program.dispose();
    this.stage.gl.deleteTexture(this.maskTexture);
  }
}
