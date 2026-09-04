<script setup lang="ts">
import { creatorSchema } from '~/data/creator'
import { scienceSources } from '~/data/editorial'
import { objectEditorialById } from '~/data/objectEditorial'
import { skyObjectsById } from '~/data/objects'
import type { SkyObjectDefinition } from '~/types/perigee'
import { lightTravelTimeSeconds, moonWidthComparison } from '~/utils/discoveryCalculations'
import { formatDegrees, formatDistance } from '~/utils/formatters'
import {
  absoluteUrl,
  boundaryCopy,
  citationsForSourceIds,
  DEFAULT_SOCIAL_CARD,
  SITE_NAME,
} from '~/utils/seo'
import { angularDiameterDegrees } from '../../../src/perigee/math/angularSize'

/**
 * One object's own page, prerendered so the question it answers is readable
 * without JavaScript. The five `h2` headings are phrased as the question a
 * person actually types, because a heading that matches the query is what gets
 * quoted back by a search result or an AI answer.
 *
 * Every number below is computed here from `app/data/objects.ts`, never written
 * into the editorial copy. That is the same contract the live scene works
 * under: angular size is calculated, never tuned.
 */
const route = useRoute()
const objectId = String(route.params.object)
const catalogue: Record<string, SkyObjectDefinition | undefined> = skyObjectsById
const object = catalogue[objectId]
const editorial = objectEditorialById[objectId]

if (!object || !editorial || editorial.reviewState !== 'approved') {
  throw createError({ statusCode: 404, statusMessage: 'Object not found', fatal: true })
}

const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')
const canonical = absoluteUrl(siteUrl, `/o/${object.id}`)
/**
 * Object cards are added one at a time as each is captured from the live scene.
 * Resolved by Vite at build time, so an object without its own card falls back
 * to the site default rather than advertising an image that 404s.
 */
const objectCards = new Set(
  Object.keys(import.meta.glob('../../../public/assets/objects/social/*.jpg'))
    .map((path) => path.replace(/^.*\/(.+)\.jpg$/, '$1')),
)
const card = absoluteUrl(
  siteUrl,
  objectCards.has(object.id) ? `/assets/objects/social/${object.id}.jpg` : DEFAULT_SOCIAL_CARD,
)

const description = `How much sky would ${editorial.subject} fill at each of five distances? `
  + 'Every apparent size is calculated from real diameter and real distance.'

/** One entry per rung of the object's ladder, with its figures derived. */
const rungs = object.presets.map((preset) => {
  const degrees = angularDiameterDegrees(object.diameterKm, preset.distanceKm)
  return {
    id: preset.id,
    label: preset.label,
    question: editorial.questions[preset.id] ?? '',
    observation: editorial.whatYouSee[preset.id] ?? '',
    distance: formatDistance(preset.distanceKm),
    degrees: formatAngle(degrees),
    moonWidths: moonWidthComparison(object.diameterKm, preset.distanceKm),
    lightSeconds: lightTravelTimeSeconds(preset.distanceKm),
    hazardCopy: preset.hazardCopy,
    href: `/?object=${object.id}&distance=${preset.id}`,
  }
})

const sources = scienceSources.filter((source) => editorial.sourceIds.includes(source.id))

/**
 * The full-Moon comparison as a clause, not a bare number.
 *
 * Below a tenth of a Moon width the ratio rounds to something like "0.0 times
 * the width of the full Moon", which is both useless and reads as an error. At
 * a real stellar distance the ratio is smaller still, so those rungs get a
 * phrase instead of a figure.
 */
function moonComparison(value: number): string {
  if (value < 0.1) return 'a small fraction of the width of the full Moon'
  const decimals = value >= 10 ? 0 : value >= 1 ? 1 : 2
  const figure = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `about ${figure} times the width of the full Moon`
}

/** "1 year", not "1 years". */
function plural(figure: string, unit: string): string {
  return `${figure} ${figure === '1' ? unit : `${unit}s`}`
}

/** Light travel time in the largest unit that still reads as a plain number. */
function formatLightTime(seconds: number): string {
  if (seconds < 90) return plural(seconds.toFixed(1), 'second')
  if (seconds < 5_400) return plural((seconds / 60).toFixed(1), 'minute')
  if (seconds < 172_800) return plural((seconds / 3_600).toFixed(1), 'hour')
  if (seconds < 31_557_600) return plural((seconds / 86_400).toFixed(1), 'day')
  const years = (seconds / 31_557_600).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return plural(years, 'year')
}

/**
 * Angular size, dropping to arcminutes and arcseconds when degrees stop being
 * informative. A star at its true distance is a few hundredths of an arcsecond
 * across; printed in degrees that is "0.00°", which tells the reader nothing
 * and looks like a broken figure.
 */
function formatAngle(degrees: number): string {
  if (degrees >= 0.005) return formatDegrees(degrees)
  const arcminutes = degrees * 60
  if (arcminutes >= 1) return plural(arcminutes.toFixed(1), 'arcminute')
  return plural((degrees * 3_600).toFixed(2), 'arcsecond')
}

useSeoMeta({
  title: editorial.headline,
  description,
  ogTitle: editorial.headline,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonical,
  ogImage: card,
  ogImageAlt: editorial.headline,
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
            headline: editorial.headline,
            description,
            image: card,
            inLanguage: 'en',
            isAccessibleForFree: true,
            author: creatorSchema,
            publisher: { '@type': 'Organization', name: SITE_NAME },
            about: { '@type': 'Thing', name: object.label },
            citation: citationsForSourceIds(editorial.sourceIds),
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
              { '@type': 'ListItem', position: 2, name: object.label, item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <main class="prerender-shell prerender-landing">
    <h1>{{ editorial.headline }}</h1>

    <p class="prerender-lede">{{ editorial.summary }}</p>

    <ul class="prerender-list mb-3.5 list-none p-0">
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Diameter</span>
        <span>{{ object.diameterKm.toLocaleString('en-US') }} km</span>
      </li>
      <li v-if="object.rotationPeriodHours" class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Rotation period</span>
        <span>{{ object.rotationPeriodHours.toLocaleString('en-US') }} hours</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Kind</span>
        <span>{{ object.kind }}</span>
      </li>
    </ul>

    <section v-for="rung in rungs" :key="rung.id">
      <h2>{{ rung.question }}</h2>
      <p>
        At {{ rung.distance }}, {{ editorial.subject }} spans {{ rung.degrees }} across your sky —
        {{ moonComparison(rung.moonWidths) }}. Light crosses that gap in
        {{ formatLightTime(rung.lightSeconds) }}.
      </p>
      <p v-if="rung.observation">{{ rung.observation }}</p>
      <p v-if="rung.hazardCopy">{{ rung.hazardCopy }}</p>
      <p>
        <NuxtLink :to="rung.href">See this view in the live sky</NuxtLink>
      </p>
    </section>

    <h2>What Perigee calculates and what it renders</h2>
    <p>{{ boundaryCopy(editorial.boundary) }}</p>
    <p>
      <NuxtLink to="/method">How Perigee calculates apparent size</NuxtLink>
    </p>

    <h2>Sources</h2>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li v-for="source in sources" :key="source.id" class="flex items-baseline gap-2.5 py-1">
        <a :href="source.url" rel="noopener">{{ source.title }}</a>
        <span class="prerender-meta">{{ source.publisher }}</span>
      </li>
    </ul>

    <p>
      <NuxtLink to="/">Explore the full Perigee sky</NuxtLink>
    </p>

    <PerigeeCreatorLinks placement="footer" />
  </main>
</template>
