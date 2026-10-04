import { ErrorCode, TryOnError } from '@tryonit/core';

export interface Program {
  readonly program: WebGLProgram;
  use(): void;
  uniform(name: string): WebGLUniformLocation | null;
  dispose(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, 'Could not create shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '';
    gl.deleteShader(shader);
    throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, `Shader compile failed: ${log}`);
  }
  return shader;
}

/** Compiles and links a program. Attribute locations are bound explicitly for shared VAOs. */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
  attributes: Record<string, number>,
): Program {
  const program = gl.createProgram();
  if (!program) throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, 'Could not create program.');
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  for (const [name, location] of Object.entries(attributes))
    gl.bindAttribLocation(program, location, name);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '';
    gl.deleteProgram(program);
    throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, `Program link failed: ${log}`);
  }
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  return {
    program,
    use: () => gl.useProgram(program),
    uniform(name) {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
      return uniforms.get(name) ?? null;
    },
    dispose: () => gl.deleteProgram(program),
  };
}
