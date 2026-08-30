/** `@types/node` is not installed, so the environment is read defensively. */
const compressedTextures = (globalThis as {
  process?: { env?: Record<string, string | undefined> }
}).process?.env?.VITE_KTX2_TEXTURES ?? '0'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: false },
  ssr: false,
  srcDir: 'app/',
  dir: {
    public: '../public',
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    // Latin subsets only. The unscoped entries declare every subset Manrope
    // ships, which is nine extra font faces the app never renders.
    '@fontsource/manrope/latin-400.css',
    '@fontsource/manrope/latin-500.css',
    '@fontsource/manrope/latin-600.css',
    '@fontsource/space-grotesk/latin-300.css',
    '@fontsource/space-grotesk/latin-400.css',
    '@fontsource/space-grotesk/latin-500.css',
    '~/../assets/css/perigee.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'theme-color', content: '#040810' },
        { name: 'color-scheme', content: 'dark' },
      ],
      // The first frame cannot be drawn until these two land, and they are
      // otherwise only discovered after the engine chunk has parsed.
      link: [
        {
          rel: 'preload',
          as: 'image',
          href: '/assets/environments/rooftop-cinematic-4k.webp',
        },
        {
          rel: 'preload',
          as: 'image',
          href: '/assets/objects/saturn-atmosphere-v2.webp',
        },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  experimental: {
    appManifest: false,
  },
  vite: {
    define: {
      // A literal, so the KTX2 loader and its 500 kB transcoder are tree-shaken
      // out of the bundle whenever compressed textures are off. See
      // `scripts/textures.sh` and `.env.example`.
      'import.meta.env.VITE_KTX2_TEXTURES': JSON.stringify(compressedTextures),
    },
    server: {
      allowedHosts: ['terminal.local'],
    },
  },
})
