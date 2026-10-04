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
  external: [/^react/, /^@tryonit\//],
  // Every export is a client component or hook (Next.js App Router, React Server Components).
  banner: { js: "'use client';" },
});
