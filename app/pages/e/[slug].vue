<script setup lang="ts">
import { encountersBySlug } from '~/data/editorial'
import { skyObjectsById } from '~/data/objects'
import {
  absoluteUrl,
  citationsForSourceIds,
  SITE_NAME,
  sourceIdsForEncounter,
} from '~/utils/seo'

/**
 * A curated encounter route. It is prerendered (see `routeRules` in
 * `nuxt.config.ts`), so a shared link carries a real title, description and
 * social card in its HTML rather than in a client render no crawler will wait
 * for.
 */
const route = useRoute()
const slug = String(route.params.slug)
const encounter = encountersBySlug[slug]

if (!encounter) {
  throw createError({ statusCode: 404, statusMessage: 'Encounter not found', fatal: true })
}

const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')
const canonical = absoluteUrl(siteUrl, `/e/${encounter.slug}`)
const card = absoluteUrl(siteUrl, `/assets/encounters/${encounter.slug}.jpg`)

/** The objects this encounter actually moves, for the `about` entities. */
const subjects = [...new Set(encounter.beats.map((beat) => beat.selection.objectId))]
  .map((objectId) => skyObjectsById[objectId].label)

/** Only the sources this encounter's own discoveries rest on. */
const citations = citationsForSourceIds(sourceIdsForEncounter(encounter))

useSeoMeta({
  title: encounter.title,
  description: encounter.invitation,
  ogTitle: encounter.title,
  ogDescription: encounter.invitation,
  ogType: 'article',
  ogUrl: canonical,
  ogImage: card,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: encounter.title,
  twitterCard: 'summary_large_image',
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
            '@type': 'Article',
            '@id': `${canonical}#article`,
            url: canonical,
            headline: encounter.title,
            description: encounter.invitation,
            image: card,
            inLanguage: 'en',
            isAccessibleForFree: true,
            author: { '@type': 'Person', name: 'Aliaksei Mazheika' },
            publisher: { '@type': 'Organization', name: SITE_NAME },
            about: subjects.map((name) => ({ '@type': 'Thing', name })),
            citation: citations,
            timeRequired: `PT${encounter.estimatedMinutes}M`,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: SITE_NAME,
                item: absoluteUrl(siteUrl, '/'),
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: encounter.title,
                item: canonical,
              },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <ClientOnly>
    <PerigeeShell :encounter-slug="encounter.slug" />
    <!-- The prerendered HTML. It never reaches a browser with JavaScript, but
         it gives a crawler something to read beside the meta tags. -->
    <template #fallback>
      <main class="prerender-shell prerender-fallback">
        <h1>{{ encounter.title }}</h1>
        <p>{{ encounter.invitation }}</p>
        <p>A guided Perigee encounter, about {{ encounter.estimatedMinutes }} minutes.</p>
        <ol class="prerender-list mt-6 list-none p-0">
          <li
            v-for="beat in encounter.beats"
            :key="beat.id"
            class="py-1"
          >
            {{ beat.observation }}
          </li>
        </ol>
        <p class="mt-6">
          <NuxtLink to="/">Explore the full Perigee sky</NuxtLink>
        </p>
      </main>
    </template>
  </ClientOnly>
</template>
