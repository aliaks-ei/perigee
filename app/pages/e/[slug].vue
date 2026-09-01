<script setup lang="ts">
import { encountersBySlug } from '~/data/editorial'

/**
 * A curated encounter route. It is the only part of Perigee rendered on the
 * server (see `routeRules` in `nuxt.config.ts`), so a shared link carries a
 * real title, description and social card in its HTML rather than in a client
 * render no crawler will wait for.
 */
const route = useRoute()
const slug = String(route.params.slug)
const encounter = encountersBySlug[slug]

if (!encounter) {
  throw createError({ statusCode: 404, statusMessage: 'Encounter not found', fatal: true })
}

const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '').replace(/\/+$/, '')
const path = `/assets/encounters/${encounter.slug}.jpg`

useSeoMeta({
  title: `${encounter.title} — Perigee`,
  description: encounter.invitation,
  ogTitle: encounter.title,
  ogDescription: encounter.invitation,
  ogType: 'website',
  ogUrl: siteUrl ? `${siteUrl}/e/${encounter.slug}` : undefined,
  ogImage: siteUrl ? `${siteUrl}${path}` : path,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: encounter.title,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <ClientOnly>
    <PerigeeShell :encounter-slug="encounter.slug" />
    <!-- The prerendered HTML. It never reaches a browser with JavaScript, but
         it gives a crawler something to read beside the meta tags. -->
    <template #fallback>
      <div class="prerender-shell">
        <h1>{{ encounter.title }}</h1>
        <p>{{ encounter.invitation }}</p>
        <p>A guided Perigee encounter, about {{ encounter.estimatedMinutes }} minutes.</p>
      </div>
    </template>
  </ClientOnly>
</template>
