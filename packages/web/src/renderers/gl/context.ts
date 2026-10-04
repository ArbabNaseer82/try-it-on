import { ErrorCode, TryOnError } from '@tryonit/core';

/** Creates a WebGL2 context or throws `WEBGL_UNSUPPORTED`. */
export function createGL(
  canvas: HTMLCanvasElement,
  attributes: WebGLContextAttributes = {},
): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    ...attributes,
  });
  if (!gl) throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, 'WebGL2 is not available.');
  return gl;
}
