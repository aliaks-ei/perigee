<script setup lang="ts">
import { absoluteUrl, DEFAULT_SOCIAL_CARD, SITE_DESCRIPTION, SITE_NAME } from '~/utils/seo'

/**
 * Site-wide metadata defaults. A page that sets its own title, description or
 * card overrides these; everything it leaves alone falls back to here, so no
 * route can ship without a title or a social card again.
 *
 * These are only rendered into HTML on the prerendered routes (see
 * `routeRules` in `nuxt.config.ts`). On the client-rendered routes they are
 * injected after hydration, which serves Googlebot but not the AI crawlers —
 * that is the reason the content routes are prerendered at all.
 */
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')

useSeoMeta({
  titleTemplate: (title) => (title ? `${title} — ${SITE_NAME}` : SITE_NAME),
  description: SITE_DESCRIPTION,
  ogSiteName: SITE_NAME,
  ogType: 'website',
  ogTitle: SITE_NAME,
  ogDescription: SITE_DESCRIPTION,
  ogImage: absoluteUrl(siteUrl, DEFAULT_SOCIAL_CARD),
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogLocale: 'en',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtPage />
</template>
