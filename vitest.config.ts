import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#perigee-texture-compression': new URL('./src/perigee/TextureCompression.ts', import.meta.url).pathname,
      // Nuxt's `srcDir` alias. Type-only `~/` imports erase, but a composable
      // pulled into a test brings its real ones with it.
      '~': new URL('./app', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/perigee/math/**/*.ts', 'app/utils/**/*.ts'],
    },
  },
})
