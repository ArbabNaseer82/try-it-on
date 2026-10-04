import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Trackers, GL renderers and the three.js renderer are split into lazy chunks through
  // dynamic import(). MediaPipe and three.js stay external (dependency and optional peer).
  external: [/^@mediapipe\//, /^three/, /^@tryonit\//],
});
