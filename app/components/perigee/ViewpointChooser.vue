<script setup lang="ts">
import { nextTick } from 'vue'
import type { ViewpointId } from '~/types/perigee'

/**
 * A landscape is a picture, so it is chosen from pictures: one wide tile per
 * plate, inside the sky controls beside the object and the distance. A fifth
 * landscape is one more tile, not a header that no longer fits.
 */
const {
  viewpoints,
  currentViewpointId,
  selectViewpoint,
  toggleObjectBrowser,
} = usePerigee()

function onKeydown(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const next = viewpoints[(index + direction + viewpoints.length) % viewpoints.length]
  if (!next) return
  const target = document.querySelector<HTMLButtonElement>(`[data-viewpoint-option="${next.id}"]`)
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

async function choose(viewpointId: ViewpointId): Promise<void> {
  toggleObjectBrowser(false)
  await nextTick()
  document.querySelector<HTMLButtonElement>('[data-viewpoint-trigger]')?.focus()
  await selectViewpoint(viewpointId)
}
</script>

<template>
  <div class="viewpoint-chooser" role="radiogroup" aria-label="Landscape">
    <p class="control-label block font-semibold uppercase">Landscape</p>
    <div class="viewpoint-track flex items-start lt-md:overflow-x-auto lt-md:overscroll-x-contain">
      <button
        v-for="(viewpoint, index) in viewpoints"
        :key="viewpoint.id"
        type="button"
        role="radio"
        :aria-checked="currentViewpointId === viewpoint.id"
        :tabindex="currentViewpointId === viewpoint.id ? 0 : -1"
        :aria-label="`${viewpoint.label}: ${viewpoint.description}`"
        :data-viewpoint-option="viewpoint.id"
        class="viewpoint-option flex shrink-0 flex-col gap-2 text-left"
        :class="{ selected: currentViewpointId === viewpoint.id }"
        @click="choose(viewpoint.id)"
        @keydown="onKeydown($event, index)"
      >
        <span class="viewpoint-plate block overflow-hidden" aria-hidden="true">
          <img
            class="block h-full w-full object-cover"
            :src="viewpoint.thumbnail"
            alt=""
            width="320"
            height="180"
            decoding="async"
          >
        </span>
        <span class="viewpoint-name">{{ viewpoint.label }}</span>
        <span class="viewpoint-description">{{ viewpoint.description }}</span>
      </button>
    </div>
  </div>
</template>
