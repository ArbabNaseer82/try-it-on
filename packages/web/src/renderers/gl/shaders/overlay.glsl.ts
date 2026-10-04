/** Textured mesh in image space (positions 0..1, y down), drawn straight to the screen. */
export const OVERLAY_VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_local;
out vec2 v_uv;
void main() {
  v_uv = a_local;
  gl_Position = vec4(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0, 0.0, 1.0);
}`;

export const OVERLAY_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o;
void main() { o = texture(u_tex, v_uv) * u_opacity; }`;
