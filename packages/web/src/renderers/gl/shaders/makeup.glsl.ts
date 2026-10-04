import { GLSL_HELPERS } from './common.glsl';

/** Region masks: polygons write a constant value, discs write a soft radial falloff. */
export const MASK_VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_local;
out vec2 v_local;
void main() {
  v_local = a_local;
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
}`;

export const MASK_FRAG = `#version 300 es
precision mediump float;
uniform float u_value;
uniform float u_disc;
in vec2 v_local;
out vec4 o;
void main() {
  float v = u_value;
  if (u_disc > 0.5) v *= 1.0 - smoothstep(0.2, 1.0, length(v_local));
  o = vec4(v, v, v, 1.0);
}`;

/** Separable 9 tap Gaussian blur used to feather mask edges. */
export const BLUR_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_step;
in vec2 v_uv;
out vec4 o;
void main() {
  float w0 = 0.227027, w1 = 0.1945946, w2 = 0.1216216, w3 = 0.054054, w4 = 0.016216;
  float s = texture(u_tex, v_uv).r * w0;
  s += (texture(u_tex, v_uv + u_step).r + texture(u_tex, v_uv - u_step).r) * w1;
  s += (texture(u_tex, v_uv + u_step * 2.0).r + texture(u_tex, v_uv - u_step * 2.0).r) * w2;
  s += (texture(u_tex, v_uv + u_step * 3.0).r + texture(u_tex, v_uv - u_step * 3.0).r) * w3;
  s += (texture(u_tex, v_uv + u_step * 4.0).r + texture(u_tex, v_uv - u_step * 4.0).r) * w4;
  o = vec4(s, s, s, 1.0);
}`;

/**
 * Luminance aware composite. The product color is modulated by the relative brightness of
 * the underlying pixels so skin and lip texture stay visible (never flat paint).
 * u_mode: 0 color layer, 1 foundation. u_finish: 0 matte, 1 gloss, 2 satin, 3 shimmer.
 */
export const COMPOSITE_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_frame;
uniform sampler2D u_mask;
uniform vec3 u_color;
uniform float u_opacity;
uniform int u_mode;
uniform int u_finish;
uniform float u_time;
uniform float u_coverage;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 o;
${GLSL_HELPERS}
void main() {
  vec3 src = texture(u_frame, v_uv).rgb;
  float m = clamp(texture(u_mask, v_uv).r * u_opacity, 0.0, 1.0);
  if (m <= 0.002) { o = vec4(src, 1.0); return; }
  float l = luma(src);
  vec3 target;
  if (u_mode == 1) {
    vec3 blurred = (
      texture(u_frame, v_uv + vec2(u_texel.x * 3.0, 0.0)).rgb +
      texture(u_frame, v_uv - vec2(u_texel.x * 3.0, 0.0)).rgb +
      texture(u_frame, v_uv + vec2(0.0, u_texel.y * 3.0)).rgb +
      texture(u_frame, v_uv - vec2(0.0, u_texel.y * 3.0)).rgb) * 0.25;
    vec3 smoothed = mix(src, blurred, u_coverage * 0.85);
    float sl = luma(smoothed);
    vec3 tint = u_color * (sl / max(luma(u_color), 0.05));
    target = mix(smoothed, tint, 0.55);
  } else {
    float shade = clamp(l / 0.42, 0.0, 1.7);
    target = u_color * mix(1.0, shade, 0.78);
    if (u_finish == 0) {
      target = mix(target, vec3(luma(target)), 0.06) * 0.97;
    } else if (u_finish == 1) {
      target += smoothstep(0.5, 0.88, l) * 0.55;
    } else if (u_finish == 2) {
      target += smoothstep(0.58, 0.95, l) * 0.22;
    } else {
      vec2 cell = floor(v_uv / (u_texel * 2.0));
      float sparkle = step(0.965, hash(cell + floor(u_time * 6.0)));
      target += sparkle * 0.55 * shade + smoothstep(0.6, 0.95, l) * 0.18;
    }
  }
  o = vec4(mix(src, clamp(target, 0.0, 1.0), m), 1.0);
}`;
