<script setup lang="ts">
import { creator } from '~/data/creator'

defineProps<{
  placement: 'more' | 'footer' | 'fallback' | 'error'
}>()
</script>

<template>
  <section
    class="creator-links"
    :class="[`creator-links--${placement}`, { 'more-section': placement === 'more' }]"
    aria-label="Contact Aliaksei Mazheika"
  >
    <p class="creator-name">Created by {{ creator.name }}</p>
    <nav class="creator-link-list flex flex-wrap items-center" aria-label="Aliaksei Mazheika contact links">
      <a class="creator-link inline-flex items-center" :href="`mailto:${creator.email}`" target="_blank" rel="noopener noreferrer" aria-label="Email Aliaksei Mazheika, opens in a new tab">Email</a>
      <a class="creator-link inline-flex items-center" :href="creator.linkedinUrl" target="_blank" rel="noopener noreferrer" aria-label="Aliaksei Mazheika on LinkedIn, opens in a new tab">LinkedIn</a>
      <a class="creator-link inline-flex items-center" :href="creator.githubUrl" target="_blank" rel="noopener noreferrer" aria-label="Aliaksei Mazheika on GitHub, opens in a new tab">GitHub</a>
    </nav>
  </section>
</template>
