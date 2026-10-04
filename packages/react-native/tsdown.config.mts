import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  external: [/^react/, /^@tryonit\//],
});
