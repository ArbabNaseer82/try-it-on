export interface TextureOptions {
  filter?: number;
  internalFormat?: number;
  format?: number;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  options: TextureOptions = {},
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const filter = options.filter ?? gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

/** Uploads a DOM image source. Row 0 (image top) lands at texture coordinate t = 0. */
export function uploadImage(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  source: TexImageSource,
  premultiply = false,
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

/** Uploads a single channel 8 bit mask. */
export function uploadMask(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  width: number,
  height: number,
  data: Uint8Array,
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);
}

export interface RenderTarget {
  readonly framebuffer: WebGLFramebuffer;
  readonly texture: WebGLTexture;
  width: number;
  height: number;
  resize(width: number, height: number): void;
  bind(): void;
  dispose(): void;
}

/** Offscreen color target. `r8` targets are used for makeup masks. */
export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  kind: 'rgba8' | 'r8' = 'rgba8',
): RenderTarget {
  const texture = createTexture(gl);
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Could not create framebuffer');
  const internal = kind === 'r8' ? gl.R8 : gl.RGBA8;
  const format = kind === 'r8' ? gl.RED : gl.RGBA;
  const target: RenderTarget = {
    framebuffer,
    texture,
    width: 0,
    height: 0,
    resize(w, h) {
      if (w === target.width && h === target.height) return;
      target.width = Math.max(1, w);
      target.height = Math.max(1, h);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internal,
        target.width,
        target.height,
        0,
        format,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    },
    bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, target.width, target.height);
    },
    dispose() {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    },
  };
  target.resize(width, height);
  return target;
}
