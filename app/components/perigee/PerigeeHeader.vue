<script setup lang="ts">
/**
 * The header holds the brand and nothing else. Landscapes are chosen in the
 * sky controls beside the object and the distance, and the monthly feature
 * arrives once as a card rather than living beside the wordmark.
 */
const { resetExperience } = usePerigee()
</script>

<template>
  <header class="perigee-header pointer-events-none absolute z-header flex items-center">
    <button
      class="brand pointer-events-auto inline-flex min-h-11 items-center"
      type="button"
      aria-label="Reset Perigee"
      @click="resetExperience"
    >
      <span class="brand-mark" aria-hidden="true" />
      <span class="brand-word text-shadow font-semibold uppercase">Perigee</span>
    </button>
  </header>
</template>
