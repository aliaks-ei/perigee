<script setup lang="ts">
import { encounters } from '~/data/editorial'
import { skyObjects } from '~/data/objects'
import { viewpoints } from '~/data/viewpoints'

/**
 * The prerendered body of the home route. It is rendered into the `ClientOnly`
 * fallback, so a browser with JavaScript replaces it with the live scene on
 * hydration and only a crawler or a visitor without JavaScript reads it.
 *
 * It is also the whole internal link graph. `crawlLinks` is off and the running
 * app links nowhere, so every route that should be discoverable has to be
 * reachable from an anchor on this page.
 */
const objectList = skyObjects
const encounterList = encounters

const viewpointSentence = viewpoints
  .map((viewpoint) => `${viewpoint.label} — ${viewpoint.description.toLowerCase()}`)
  .reduce((sentence, entry, index, all) => {
    if (index === 0) return entry
    return index === all.length - 1 ? `${sentence} and ${entry}` : `${sentence}, ${entry}`
  }, '')
</script>

<template>
  <main class="prerender-shell prerender-landing prerender-fallback">
    <h1>Perigee — impossible skies, at honest scale</h1>

    <p class="prerender-lede">
      Perigee is an interactive night sky that lets you move a planet, a star or a
      galaxy as close to Earth as you like, and shows you exactly how much of the
      sky it would fill. Apparent size is never art-directed: it is calculated from
      the object's real diameter and the distance you choose, so Saturn at the
      Moon's distance comes out the size the geometry says it should.
    </p>

    <p>
      Nine objects, five distances each, and four places to stand. Pick a sky and
      watch it arrive.
    </p>

    <h2>Objects you can bring closer</h2>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li v-for="object in objectList" :key="object.id" class="flex items-baseline gap-2.5 py-1">
        <NuxtLink :to="`/o/${object.id}`">{{ object.label }}</NuxtLink>
        <span class="prerender-meta">{{ object.kind }}</span>
      </li>
    </ul>

    <h2>Guided encounters</h2>
    <p>
      Each encounter is a short, narrated sequence that moves one object inward a
      step at a time, with an optional guess before the sky answers.
    </p>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li v-for="encounter in encounterList" :key="encounter.slug" class="flex items-baseline gap-2.5 py-1">
        <NuxtLink :to="`/e/${encounter.slug}`">{{ encounter.title }}</NuxtLink>
        <span class="prerender-meta">{{ encounter.estimatedMinutes }} min</span>
      </li>
    </ul>

    <h2>Where you stand</h2>
    <p>
      The same sky reads differently from different ground. Perigee offers
      {{ viewpointSentence }}.
    </p>

    <h2>How the sizes are calculated</h2>
    <p>
      Every apparent size in Perigee comes from the same formula applied to
      published diameters and distances, and every figure on the site is derived
      rather than typed in. Perigee is deliberately not a planetarium catalogue or
      a physics simulator: it states plainly what is calculated, what is a rendered
      visualization, and what is described but not simulated.
      <NuxtLink to="/method">Read how Perigee calculates apparent size</NuxtLink>.
    </p>

    <p class="prerender-meta">
      Perigee needs WebGL2 and a browser with JavaScript enabled to render the live
      sky.
    </p>
  </main>
</template>
