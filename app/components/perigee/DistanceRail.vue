<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCaretUp, PhCircleNotch } from '@phosphor-icons/vue'
import { formatDegrees } from '~/utils/formatters'

const {
  currentObject,
  currentPresetId,
  angularDiameter,
  objectBrowserOpen,
  transitioning,
  selectDistance,
  toggleObjectBrowser,
} = usePerigee()

const optionsEl = ref<HTMLDivElement | null>(null)
const indicator = ref({ left: 0, width: 0, ready: false })
let observer: ResizeObserver | null = null

/**
 * Measures the selected option so the pill can slide between presets. Doing it
 * from the DOM keeps the pill correct at any label length or zoom level.
 */
function measure(): void {
  const container = optionsEl.value
  const selected = container?.querySelector<HTMLElement>('[aria-checked="true"]')
  if (!container || !selected) return
  indicator.value = {
    left: selected.offsetLeft,
    width: selected.offsetWidth,
    ready: true,
  }
}

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (optionsEl.value) observer.observe(optionsEl.value)
})

onBeforeUnmount(() => observer?.disconnect())

watch([currentPresetId, currentObject], async () => {
  await nextTick()
  measure()
})

function onDistanceKeydown(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const presets = currentObject.value.presets
  const next = presets[(index + direction + presets.length) % presets.length]
  if (next) selectDistance(next.id)
}
</script>

<template>
  <section class="control-rail" aria-label="Sky controls">
    <PerigeeObjectBrowser />

    <div class="rail-row">
      <button
        type="button"
        class="object-trigger"
        data-object-trigger
        aria-controls="object-browser"
        :aria-expanded="objectBrowserOpen"
        @click="toggleObjectBrowser()"
      >
        <span class="trigger-thumb" aria-hidden="true">
          <img :src="currentObject.thumbnail" alt="">
        </span>
        <span class="trigger-label">
          <span class="trigger-kicker">Object</span>
          <span class="trigger-name">{{ currentObject.label }}</span>
        </span>
        <PhCaretUp :size="12" weight="bold" aria-hidden="true" :class="{ rotated: objectBrowserOpen }" />
      </button>

      <div
        ref="optionsEl"
        class="distance-options"
        role="radiogroup"
        :aria-label="`Distance for ${currentObject.label}`"
        :style="{
          '--indicator-x': `${indicator.left}px`,
          '--indicator-w': `${indicator.width}px`,
        }"
      >
        <span v-if="indicator.ready" class="distance-indicator" aria-hidden="true" />
        <button
          v-for="(preset, index) in currentObject.presets"
          :key="preset.id"
          type="button"
          role="radio"
          :aria-checked="currentPresetId === preset.id"
          :disabled="transitioning"
          :class="{ selected: currentPresetId === preset.id }"
          @click="selectDistance(preset.id)"
          @keydown="onDistanceKeydown($event, index)"
        >
          {{ preset.label }}
        </button>
      </div>

      <p class="apparent-size" :class="{ transitioning }">
        <PhCircleNotch v-if="transitioning" :size="13" weight="bold" class="spin" aria-hidden="true" />
        <span class="size-value">{{ formatDegrees(angularDiameter) }}</span>
        <span class="size-kicker">Apparent size</span>
      </p>
    </div>
  </section>
</template>
