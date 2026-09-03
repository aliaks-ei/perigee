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

/**
 * `/` is listed as well, and only to keep `index.html` in the output. Its rule
 * is `ssr: false`, so what lands there is the same empty SPA shell as
 * `200.html`; without the entry a static host has no file to serve at the root.
 */
const prerenderRoutes = ['/', ...encounterRoutes]

export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: false },
  // Server rendering is on at the config level only so the curated encounter
  // routes below can opt into it. A global `ssr: false` wins over every route
  // rule — Nuxt drops the prerendered HTML with "not prerendered because
  // ssr: false was set" — so the switch has to be inverted: on globally, off
  // for every route except `/e/**`.
  ssr: true,
  runtimeConfig: {
    public: {
      // Absolute URLs are what social crawlers resolve reliably. Left empty the
      // cards fall back to root-relative paths; set `NUXT_PUBLIC_SITE_URL`
      // before a public build.
      siteUrl: environment.NUXT_PUBLIC_SITE_URL ?? '',
      // Measurement is opt-in per environment. Empty means the Umami script
      // is never requested, so dev and preview builds stay silent.
      umamiWebsiteId: environment.NUXT_PUBLIC_UMAMI_WEBSITE_ID ?? '',
      umamiSrc: environment.NUXT_PUBLIC_UMAMI_SRC ?? '',
    },
  },
  // The app is a client-rendered SPA everywhere except the curated encounter
  // routes. Those are rendered once at build time so their title, description
  // and social card are real HTML; `pages/e/[slug].vue` still mounts the live
  // scene client-side only.
  routeRules: {
    '/**': { ssr: false },
    '/e/**': { ssr: true, prerender: true },
  },
  nitro: {
    // Pinned on purpose. Nitro auto-detects Cloudflare in CI and would switch
    // to `cloudflare-module`, which emits a server entry plus a redirected
    // wrangler config that overrides `wrangler.toml`; the deploy then fails on
    // an `index.mjs` that `nuxt generate` never builds. Staying static also
    // keeps every request on unmetered asset serving rather than a billed
    // Worker invocation.
    preset: 'static',
    prerender: {
      routes: prerenderRoutes,
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
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#040810' },
        { name: 'color-scheme', content: 'dark' },
      ],
      // The first frame cannot be drawn until these two land, and they are
      // otherwise only discovered after the engine chunk has parsed. The
      // texture cache pulls them with `fetch()`, so the hints are `as: 'fetch'`
      // with anonymous credentials: a hint whose mode differs from the real
      // request is discarded and the file is downloaded twice.
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' },
        {
          rel: 'preload',
          as: 'fetch',
          crossorigin: 'anonymous',
          href: '/assets/environments/rooftop-cinematic-4k.webp',
        },
        {
          rel: 'preload',
          as: 'fetch',
          crossorigin: 'anonymous',
          // The file the loader will actually ask for: the compressed map
          // while KTX2 is on, the WebP otherwise.
          href: compressedTextures === '1'
            ? '/assets/objects/saturn-atmosphere-v2.ktx2'
            : '/assets/objects/saturn-atmosphere-v2.webp',
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
  alias: {
    // Select the implementation at build time. A runtime guard around a
    // dynamic import still makes Rollup emit the KTX2 transcoder chunk, even
    // when the guard is a false literal.
    '#perigee-texture-compression': new URL(
      compressedTextures === '1'
        ? './src/perigee/TextureCompression.ktx2.ts'
        : './src/perigee/TextureCompression.ts',
      import.meta.url,
    ).pathname,
  },
  vite: {
    server: {
      allowedHosts: ['terminal.local'],
    },
  },
})
