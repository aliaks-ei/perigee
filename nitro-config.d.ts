/**
 * `@nuxt/schema` removes `nitro` from `NuxtConfig` and expects the Nitro
 * builder to declare it again. The installed `@nuxt/nitro-server` build does
 * not, so `nuxt typecheck` rejects the two keys the curated encounter routes
 * need. Both are read correctly at build time; only the type is missing.
 *
 * Narrowed to what `nuxt.config.ts` actually sets, so this shim cannot hide a
 * typo in some unrelated Nitro option.
 */
declare module '@nuxt/schema' {
  interface NuxtConfig {
    routeRules?: Record<string, { ssr?: boolean, prerender?: boolean }>
    nitro?: {
      prerender?: {
        routes?: string[]
        crawlLinks?: boolean
      }
    }
  }
}

export {}
