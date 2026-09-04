<script setup lang="ts">
import { creatorSchema } from '~/data/creator'
import { scienceSources } from '~/data/editorial'
import { absoluteUrl, citationsForSourceIds, SITE_NAME } from '~/utils/seo'

/**
 * How Perigee arrives at the numbers it shows.
 *
 * This is the page every other content page leans on. A figure is only worth
 * quoting if the method behind it is stated, so the formula, the constants and
 * the reviewed sources all live here in readable HTML rather than in code
 * comments.
 */
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')
const canonical = absoluteUrl(siteUrl, '/method')

const title = 'How Perigee calculates apparent size'
const description =
  'Perigee derives every apparent size from the object\'s real diameter and the chosen '
  + 'distance. The formula, the exact constants and the reviewed sources behind them.'

const sources = scienceSources

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
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
            '@type': 'TechArticle',
            '@id': `${canonical}#article`,
            url: canonical,
            headline: title,
            description,
            inLanguage: 'en',
            isAccessibleForFree: true,
            author: creatorSchema,
            publisher: { '@type': 'Organization', name: SITE_NAME },
            citation: citationsForSourceIds(sources.map((source) => source.id)),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl(siteUrl, '/') },
              { '@type': 'ListItem', position: 2, name: title, item: canonical },
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
    <h1>{{ title }}</h1>

    <p class="prerender-lede">
      Nothing in Perigee is scaled by eye. Every object in the scene is placed at a
      fixed render distance and drawn at whatever radius reproduces its calculated
      angular diameter, so the size you see is a consequence of the geometry rather
      than a decision anybody made.
    </p>

    <h2>How is apparent size calculated?</h2>
    <p>
      Apparent size is the angle an object subtends at the eye. For an object of
      diameter <em>d</em> at distance <em>r</em>, the angular diameter <em>θ</em> is:
    </p>
    <p class="prerender-formula">θ = 2 · arctan( d / 2r )</p>
    <p>
      That is the whole calculation. It is applied identically to the Moon, to
      Saturn and to the Andromeda Galaxy, and it is the only thing that decides how
      much sky an object fills. If the fixed render distance in the scene ever
      changes, the rendered radius follows automatically — no object is ever scaled
      by hand to compensate.
    </p>

    <h2>How does Perigee compare sizes to the full Moon?</h2>
    <p>
      A figure in degrees is hard to picture, so Perigee restates it in full Moons:
      the object's angular diameter divided by the Moon's angular diameter at its
      familiar distance of 384,400 km. Saying something spans thirty-three Moons is
      the same statement as giving its angle, in units an eye can hold.
    </p>

    <h2>How does Perigee calculate light travel time?</h2>
    <p>
      The selected distance divided by the exact speed of light in vacuum. It is a
      statement about the distance, not about the rendering: the scene is not
      delayed by that amount.
    </p>

    <h2>Which constants does Perigee use?</h2>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Speed of light</span>
        <span>299,792.458 km/s, exactly, by definition of the metre</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Astronomical unit</span>
        <span>149,597,870.7 km, exactly, per IAU 2012 Resolution B2</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Moon reference</span>
        <span>384,400 km, the familiar Earth–Moon distance</span>
      </li>
    </ul>

    <h2>What does Perigee simulate, and what does it only draw?</h2>
    <p>
      Perigee labels every claim it makes with one of three boundaries, and shows
      that label in plain language beside the claim.
    </p>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Calculated</span>
        <span>A deterministic value from the same object and distance data as the scene.</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Rendered</span>
        <span>An authored visual treatment produced by the scene, not a physical result.</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Described</span>
        <span>A sourced physical effect that Perigee states but does not model.</span>
      </li>
    </ul>

    <h2>What Perigee is not</h2>
    <p>
      Perigee is not a planetarium catalogue and not a physics simulator. It does
      not model heat, radiation, gravity or tides, it does not place objects on real
      orbits, and it does not claim that any of these skies could occur. Surface
      lighting, atmospheric treatment and the impossible-proximity effects are
      authored visualizations sitting on top of geometry that is exact.
    </p>

    <h2>Sources</h2>
    <p>
      Every figure on this site traces to one of these, each opened and dated at
      review.
    </p>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li v-for="source in sources" :key="source.id" class="flex items-baseline gap-2.5 py-1">
        <a :href="source.url" rel="noopener">{{ source.title }}</a>
        <span class="prerender-meta">{{ source.publisher }} · {{ source.reviewedOn }}</span>
      </li>
    </ul>

    <p>
      <NuxtLink to="/">Explore the full Perigee sky</NuxtLink>
    </p>

    <PerigeeCreatorLinks placement="footer" />
  </main>
</template>
