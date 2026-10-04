import { GLSL_HELPERS } from './common.glsl';

/** Recolors hair while keeping the original luminance pattern (strands and shine). */
export const HAIR_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_frame;
uniform sampler2D u_mask;
uniform vec3 u_color;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o;
${GLSL_HELPERS}
void main() {
  vec3 src = texture(u_frame, v_uv).rgb;
  float m = smoothstep(0.3, 0.85, texture(u_mask, v_uv).r) * u_opacity;
  float l = luma(src);
  float lifted = pow(l, 0.75);
  vec3 target = u_color * (lifted / max(luma(u_color), 0.08)) * 0.9;
  target = mix(target, src * 0.35 + target * 0.65, smoothstep(0.75, 1.0, l));
  o = vec4(mix(src, clamp(target, 0.0, 1.0), m), 1.0);
}`;
