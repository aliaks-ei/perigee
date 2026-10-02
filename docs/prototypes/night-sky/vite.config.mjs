import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  publicDir: '../../../public',
  resolve: { alias: { '#perigee-texture-compression': fileURLToPath(new URL('../../../src/perigee/TextureCompression.ts', import.meta.url)) } },
  server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
  build: { outDir: '/private/tmp/perigee-night-sky-build', emptyOutDir: true },
})
