import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '#perigee-texture-compression': new URL('./src/perigee/TextureCompression.ts', import.meta.url).pathname } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/perigee/math/**/*.ts', 'app/utils/**/*.ts'],
    },
  },
})
