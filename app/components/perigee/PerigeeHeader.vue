<script setup lang="ts">
const {
  viewpoints,
  currentViewpointId,
  selectViewpoint,
  resetExperience,
} = usePerigee()
</script>

<template>
  <header
    class="perigee-header pointer-events-none absolute z-header flex items-center justify-between gap-6 lt-sm:items-start lt-sm:gap-3"
  >
    <button
      class="brand pointer-events-auto inline-flex min-h-10 items-center"
      type="button"
      aria-label="Reset Perigee"
      @click="resetExperience"
    >
      <span class="brand-mark" aria-hidden="true" />
      <span class="brand-word text-shadow font-semibold uppercase">Perigee</span>
    </button>

    <div
      class="viewpoint-switcher pointer-events-auto flex items-center gap-1"
      role="radiogroup"
      aria-label="Viewpoint"
    >
      <button
        v-for="viewpoint in viewpoints"
        :key="viewpoint.id"
        type="button"
        role="radio"
        :aria-checked="currentViewpointId === viewpoint.id"
        :aria-label="`${viewpoint.label}: ${viewpoint.description}`"
        :class="{ selected: currentViewpointId === viewpoint.id }"
        @click="selectViewpoint(viewpoint.id)"
      >
        {{ viewpoint.label }}
      </button>
    </div>
  </header>
</template>
