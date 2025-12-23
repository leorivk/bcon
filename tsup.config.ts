import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  shims: true,
  target: 'node18',
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
