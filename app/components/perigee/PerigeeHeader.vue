<script setup lang="ts">
const {
  viewpoints,
  currentViewpointId,
  transitioning,
  selectViewpoint,
  resetExperience,
} = usePerigee()
</script>

<template>
  <header class="perigee-header">
    <button class="brand" type="button" aria-label="Reset Perigee" @click="resetExperience">
      <span class="brand-mark" aria-hidden="true" />
      <span class="brand-word">Perigee</span>
    </button>

    <div class="viewpoint-switcher" role="radiogroup" aria-label="Viewpoint">
      <button
        v-for="viewpoint in viewpoints"
        :key="viewpoint.id"
        type="button"
        role="radio"
        :aria-checked="currentViewpointId === viewpoint.id"
        :aria-label="`${viewpoint.label}: ${viewpoint.description}`"
        :disabled="transitioning"
        :class="{ selected: currentViewpointId === viewpoint.id }"
        @click="selectViewpoint(viewpoint.id)"
      >
        {{ viewpoint.label }}
      </button>
    </div>
  </header>
</template>
