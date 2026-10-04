/** Fullscreen pass. `a_pos` is 0..1 in image space (y down). Flip only when drawing to screen. */
export const FULLSCREEN_VERT = `#version 300 es
in vec2 a_pos;
uniform float u_flipY;
out vec2 v_uv;
void main() {
  v_uv = a_pos;
  vec2 p = a_pos * 2.0 - 1.0;
  if (u_flipY > 0.5) p.y = -p.y;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const COPY_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() { o = vec4(texture(u_tex, v_uv).rgb, 1.0); }`;

/** Shared helpers injected into fragment shaders. */
export const GLSL_HELPERS = `
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;
