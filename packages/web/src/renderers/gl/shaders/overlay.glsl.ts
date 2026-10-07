/** Textured mesh in image space (positions 0..1, y down), drawn straight to the screen. */
export const OVERLAY_VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_local;
out vec2 v_uv;
out vec2 v_pos;
void main() {
  v_uv = a_local;
  v_pos = a_pos;
  gl_Position = vec4(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0, 0.0, 1.0);
}`;

export const OVERLAY_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o;
void main() { o = texture(u_tex, v_uv) * u_opacity; }`;

/**
 * Garments: the texture is lit by the frame underneath. Each pixel's brightness relative to its
 * neighborhood carries the folds and shadows of what the wearer has on, so the new garment looks
 * worn rather than pasted. u_shading 0 disables it.
 */
export const CLOTH_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform sampler2D u_frame;
uniform float u_opacity;
uniform float u_shading;
uniform float u_aspect;
in vec2 v_uv;
in vec2 v_pos;
out vec4 o;
float luma(vec2 p) { return dot(texture(u_frame, p).rgb, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec4 g = texture(u_tex, v_uv);
  float l = luma(v_pos);
  float avg = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 d = vec2(cos(a), sin(a) * u_aspect);
    avg += luma(v_pos + d * 0.018) + luma(v_pos + d * 0.04);
  }
  avg /= 16.0;
  float shade = clamp(l / max(avg, 0.03), 0.62, 1.28);
  o = vec4(g.rgb * mix(1.0, shade, u_shading), g.a) * u_opacity;
}`;
