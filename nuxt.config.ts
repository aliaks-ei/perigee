import { encounters } from './app/data/editorial'

/** `@types/node` is not installed, so the environment is read defensively. */
const environment = (globalThis as {
  process?: { env?: Record<string, string | undefined> }
}).process?.env ?? {}
const compressedTextures = environment.VITE_KTX2_TEXTURES ?? '0'

/**
 * The curated encounter routes. Nothing in the app links to them, so the
 * prerender crawler cannot find them on its own; they are derived from the
 * catalogue instead, and `tests/scene-capture.test.ts` checks each one has its
 * social card on disk.
 */
const encounterRoutes = encounters.map((encounter) => `/e/${encounter.slug}`)

export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: false },
  ssr: false,
  runtimeConfig: {
    public: {
      // Absolute URLs are what social crawlers resolve reliably. Left empty the
      // cards fall back to root-relative paths; set `NUXT_PUBLIC_SITE_URL`
      // before a public build.
      siteUrl: environment.NUXT_PUBLIC_SITE_URL ?? '',
    },
  },
  // The app is a client-rendered SPA everywhere except the curated encounter
  // routes. Those are rendered once at build time so their title, description
  // and social card are real HTML; `pages/e/[slug].vue` still mounts the live
  // scene client-side only.
  routeRules: {
    '/e/**': { ssr: true, prerender: true },
  },
  nitro: {
    prerender: {
      routes: encounterRoutes,
      crawlLinks: false,
    },
  },
  srcDir: 'app/',
  dir: {
    public: '../public',
  },
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    // The directives are split across two files so utilities can be loaded
    // last (see `css` below). The module only injects one, so it injects none.
    cssPath: false,
  },
  css: [
    // Latin subsets only. The unscoped entries declare every subset Manrope
    // ships, which is nine extra font faces the app never renders.
    '@fontsource/manrope/latin-400.css',
    '@fontsource/manrope/latin-500.css',
    '@fontsource/manrope/latin-600.css',
    '@fontsource/space-grotesk/latin-300.css',
    '@fontsource/space-grotesk/latin-400.css',
    '@fontsource/space-grotesk/latin-500.css',
    // Order matters: preflight first, the component sheet in the middle, and
    // Tailwind's utilities last so a class in a template always wins over the
    // component class beside it.
    //
    // `animations.css` sits after `perigee.css` on purpose. A transition class
    // like `.dock-enter-from` ties on specificity with the component class it
    // lands on (`.control-panel`), so the later sheet wins. Load it first and
    // every transition on a positioned element silently stops moving.
    '~/../assets/css/tailwind-base.css',
    '~/../assets/css/tokens.css',
    '~/../assets/css/base.css',
    '~/../assets/css/perigee.css',
    '~/../assets/css/animations.css',
    '~/../assets/css/tailwind-utilities.css',
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
