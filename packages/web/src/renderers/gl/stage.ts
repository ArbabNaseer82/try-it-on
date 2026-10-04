import { createGL } from './context';
import { createProgram, type Program } from './program';
import { COPY_FRAG, FULLSCREEN_VERT } from './shaders/common.glsl';
import { createTexture, uploadImage } from './texture';

/** Attribute locations shared by every program. */
export const ATTR = { a_pos: 0, a_local: 1 } as const;

/**
 * Shared WebGL2 canvas for makeup, hair and 2D overlays. Owns the camera frame texture and a
 * fullscreen quad. Renderers draw onto `canvas`, which sits on top of the video layer.
 */
export class GLStage {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly frameTexture: WebGLTexture;
  private readonly quad: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly copy: Program;
  private lastVersion = -1;
  width = 0;
  height = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = createGL(this.canvas);
    const gl = this.gl;
    this.frameTexture = createTexture(gl);
    this.copy = createProgram(gl, FULLSCREEN_VERT, COPY_FRAG, ATTR);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Could not create quad');
    this.quad = vao;
    this.quadBuffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(ATTR.a_pos);
    gl.vertexAttribPointer(ATTR.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /** Resizes the canvas and uploads the current frame when it changed. */
  beginFrame(source: TexImageSource, width: number, height: number, version: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.width = width;
    this.height = height;
    if (version !== this.lastVersion) {
      this.lastVersion = version;
      uploadImage(this.gl, this.frameTexture, source);
    }
  }

  /** Forces the next `beginFrame` to upload (new source). */
  invalidate(): void {
    this.lastVersion = -1;
  }

  /** Binds the screen (default framebuffer). */
  bindScreen(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
  }

  /** Draws the fullscreen quad with the currently bound program. */
  drawQuad(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  /** Copies a texture to the screen (image space to screen space flip). */
  blitToScreen(texture: WebGLTexture): void {
    const gl = this.gl;
    this.bindScreen();
    gl.disable(gl.BLEND);
    this.copy.use();
    gl.uniform1f(this.copy.uniform('u_flipY'), 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.copy.uniform('u_tex'), 0);
    this.drawQuad();
  }

  dispose(): void {
    const gl = this.gl;
    this.copy.dispose();
    gl.deleteTexture(this.frameTexture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.quad);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.canvas.remove();
  }
}
