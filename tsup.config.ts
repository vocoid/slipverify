import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/providers/index.ts'],
  dts: true,
  sourcemap: true,
  target: 'node18',
  format: ['cjs', 'esm'],
})
