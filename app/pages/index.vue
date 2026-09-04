<script setup lang="ts">
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '~/utils/seo'

/**
 * The home route. It is prerendered (see `routeRules` in `nuxt.config.ts`) so
 * the root URL carries a real title, description, card and body. It previously
 * shipped an empty SPA shell, which meant the site's main URL was invisible to
 * every crawler that does not run JavaScript.
 *
 * The live scene still mounts client-side only, exactly as the encounter routes
 * do. `PerigeeLanding` is what lands in the prerendered HTML.
 */
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')
const canonical = absoluteUrl(siteUrl, '/')

useSeoMeta({
  title: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  ogTitle: `${SITE_NAME} — ${SITE_TAGLINE}`,
  ogDescription: SITE_DESCRIPTION,
  ogUrl: canonical,
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${canonical}#website`,
            url: canonical,
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            inLanguage: 'en',
          },
          {
            '@type': 'WebApplication',
            '@id': `${canonical}#app`,
            url: canonical,
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            applicationCategory: 'EducationalApplication',
            browserRequirements: 'Requires WebGL2 and JavaScript',
            operatingSystem: 'Any',
            isPartOf: { '@id': `${canonical}#website` },
            creator: {
              '@type': 'Person',
              name: 'Aliaksei Mazheika',
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <ClientOnly>
    <PerigeeShell />
    <template #fallback>
      <PrerenderLanding />
    </template>
  </ClientOnly>
</template>
