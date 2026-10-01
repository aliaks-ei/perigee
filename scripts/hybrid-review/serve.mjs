import { createServer } from 'vite'
const server = await createServer({ configFile: false, root: process.cwd(), publicDir: 'public', cacheDir: 'node_modules/.vite-hybrid-review',
  esbuild: { tsconfigRaw: '{}' },
  resolve: { alias: { '#perigee-texture-compression': new URL('../../src/perigee/TextureCompression.ts', import.meta.url).pathname } },
  server: { hmr: false, watch: { ignored: ['**/.nuxt/**', '**/.output/**', '**/tmp/**'] }, host: '127.0.0.1', port: 4318, strictPort: true },
})
await server.listen()
server.printUrls()
