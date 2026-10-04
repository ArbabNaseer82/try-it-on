import { parseColor, type AssetManifest, type MakeupLayer } from '@tryonit/core';
import type { FrameState, Renderer } from './renderer.interface';
import { buildLayerGeometry, LAYER_ORDER } from './makeup-geometry';
import { createProgram, type Program } from './gl/program';
import { BLUR_FRAG, COMPOSITE_FRAG, MASK_FRAG, MASK_VERT } from './gl/shaders/makeup.glsl';
import { FULLSCREEN_VERT } from './gl/shaders/common.glsl';
import { ATTR, type GLStage } from './gl/stage';
import { createRenderTarget, type RenderTarget } from './gl/texture';

const FINISH = { matte: 0, gloss: 1, satin: 2, shimmer: 3 } as const;

/** Extracts makeup layers from any makeup asset (single layer or full look). */
export function toMakeupLayers(asset: AssetManifest): MakeupLayer[] {
  if (asset.type === 'makeup.look') {
    return [...asset.layers].sort((a, b) => LAYER_ORDER[a.type] - LAYER_ORDER[b.type]);
  }
  switch (asset.type) {
    case 'makeup.lips':
    case 'makeup.blush':
    case 'makeup.eyeshadow':
    case 'makeup.eyeliner':
    case 'makeup.brows':
    case 'makeup.foundation': {
      const {
        version: _v,
        id: _i,
        name: _n,
        thumbnail: _t,
        variants: _va,
        defaultVariantId: _d,
        meta: _m,
        ...layer
      } = asset;
      return [layer as MakeupLayer];
    }
    default:
      return [];
  }
}

/**
 * Custom WebGL2 makeup renderer (no three.js). For each layer: rasterize region masks at half
 * resolution, feather them with a separable blur, then composite over the frame with a
 * luminance aware blend per finish.
 */
export class MakeupRenderer implements Renderer {
  readonly kind = 'makeup' as const;
  private layers: MakeupLayer[] = [];
  private readonly mask: Program;
  private readonly blur: Program;
  private readonly composite: Program;
  private readonly maskA: RenderTarget;
  private readonly maskB: RenderTarget;
  private readonly accum: [RenderTarget, RenderTarget];
  private readonly vao: WebGLVertexArrayObject;
  private readonly posBuffer: WebGLBuffer;
  private readonly localBuffer: WebGLBuffer;

  constructor(private readonly stage: GLStage) {
    const gl = stage.gl;
    this.mask = createProgram(gl, MASK_VERT, MASK_FRAG, ATTR);
    this.blur = createProgram(gl, FULLSCREEN_VERT, BLUR_FRAG, ATTR);
    this.composite = createProgram(gl, FULLSCREEN_VERT, COMPOSITE_FRAG, ATTR);
    this.maskA = createRenderTarget(gl, 1, 1, 'r8');
    this.maskB = createRenderTarget(gl, 1, 1, 'r8');
    this.accum = [createRenderTarget(gl, 1, 1), createRenderTarget(gl, 1, 1)];
    const vao = gl.createVertexArray();
    const pos = gl.createBuffer();
    const local = gl.createBuffer();
    if (!vao || !pos || !local) throw new Error('Could not create buffers');
    this.vao = vao;
    this.posBuffer = pos;
    this.localBuffer = local;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.enableVertexAttribArray(ATTR.a_pos);
    gl.vertexAttribPointer(ATTR.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, local);
    gl.enableVertexAttribArray(ATTR.a_local);
    gl.vertexAttribPointer(ATTR.a_local, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  get canvas(): HTMLCanvasElement {
    return this.stage.canvas;
  }

  async setAsset(asset: AssetManifest): Promise<void> {
    this.layers = toMakeupLayers(asset);
  }

  clear(): void {
    this.layers = [];
  }

  render(frame: FrameState): void {
    const { stage } = this;
    const gl = stage.gl;
    stage.beginFrame(frame.source, frame.width, frame.height, frame.sourceVersion);
    const face = frame.face;
    const strength = frame.intensity * (face?.fade ?? 0);
    if (!face || strength <= 0.001 || this.layers.length === 0) {
      stage.blitToScreen(stage.frameTexture);
      return;
    }
    const mw = Math.max(1, Math.round(frame.width / 2));
    const mh = Math.max(1, Math.round(frame.height / 2));
    this.maskA.resize(mw, mh);
    this.maskB.resize(mw, mh);
    this.accum[0].resize(frame.width, frame.height);
    this.accum[1].resize(frame.width, frame.height);

    let input = stage.frameTexture;
    this.layers.forEach((layer, index) => {
      const geometry = buildLayerGeometry(layer, face.landmarks, frame.width, frame.height);
      this.drawMask(geometry.shapes);
      this.feather(geometry.featherPx / 2);
      const last = index === this.layers.length - 1;
      const target = this.accum[index % 2] as RenderTarget;
      if (last) stage.bindScreen();
      else target.bind();
      this.drawComposite(layer, input, strength, frame, last);
      input = target.texture;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private drawMask(shapes: ReturnType<typeof buildLayerGeometry>['shapes']): void {
    const gl = this.stage.gl;
    this.maskA.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.mask.use();
    gl.bindVertexArray(this.vao);
    for (const shape of shapes) {
      if (shape.positions.length === 0) continue;
      const count = shape.positions.length / 2;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.positions), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.localBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        shape.disc ? new Float32Array(shape.local) : new Float32Array(count * 2),
        gl.DYNAMIC_DRAW,
      );
      gl.uniform1f(this.mask.uniform('u_value'), shape.value);
      gl.uniform1f(this.mask.uniform('u_disc'), shape.disc ? 1 : 0);
      if (shape.disc) {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.MAX);
      } else {
        gl.disable(gl.BLEND);
      }
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }
    gl.disable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindVertexArray(null);
  }

  /** Two pass blur: maskA -> maskB (horizontal) -> maskA (vertical). */
  private feather(radiusPx: number): void {
    const gl = this.stage.gl;
    const step = Math.max(0.5, radiusPx / 4);
    this.blur.use();
    gl.uniform1f(this.blur.uniform('u_flipY'), 0);
    gl.uniform1i(this.blur.uniform('u_tex'), 0);
    gl.activeTexture(gl.TEXTURE0);
    this.maskB.bind();
    gl.bindTexture(gl.TEXTURE_2D, this.maskA.texture);
    gl.uniform2f(this.blur.uniform('u_step'), step / this.maskA.width, 0);
    this.stage.drawQuad();
    this.maskA.bind();
    gl.bindTexture(gl.TEXTURE_2D, this.maskB.texture);
    gl.uniform2f(this.blur.uniform('u_step'), 0, step / this.maskA.height);
    this.stage.drawQuad();
  }

  private drawComposite(
    layer: MakeupLayer,
    input: WebGLTexture,
    strength: number,
    frame: FrameState,
    toScreen: boolean,
  ): void {
    const gl = this.stage.gl;
    const p = this.composite;
    p.use();
    const [r, g, b] = parseColor(layer.color);
    const finish = 'finish' in layer && layer.finish ? FINISH[layer.finish] : 0;
    gl.uniform1f(p.uniform('u_flipY'), toScreen ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, input);
    gl.uniform1i(p.uniform('u_frame'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskA.texture);
    gl.uniform1i(p.uniform('u_mask'), 1);
    gl.uniform3f(p.uniform('u_color'), r, g, b);
    gl.uniform1f(p.uniform('u_opacity'), (layer.opacity ?? 0.5) * strength);
    gl.uniform1i(p.uniform('u_mode'), layer.type === 'makeup.foundation' ? 1 : 0);
    gl.uniform1i(p.uniform('u_finish'), finish);
    gl.uniform1f(p.uniform('u_time'), frame.time / 1000);
    gl.uniform1f(
      p.uniform('u_coverage'),
      layer.type === 'makeup.foundation' ? (layer.coverage ?? 0.4) : 0,
    );
    gl.uniform2f(p.uniform('u_texel'), 1 / frame.width, 1 / frame.height);
    this.stage.drawQuad();
    gl.activeTexture(gl.TEXTURE0);
  }

  dispose(): void {
    const gl = this.stage.gl;
    this.mask.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.maskA.dispose();
    this.maskB.dispose();
    this.accum.forEach((t) => t.dispose());
    gl.deleteBuffer(this.posBuffer);
    gl.deleteBuffer(this.localBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
