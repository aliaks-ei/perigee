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
    '@fontsource/manrope/400.css',
    '@fontsource/manrope/500.css',
    '@fontsource/manrope/600.css',
    '~/../assets/css/perigee.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'theme-color', content: '#040810' },
        { name: 'color-scheme', content: 'dark' },
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
    server: {
      allowedHosts: ['terminal.local'],
    },
  },
})
