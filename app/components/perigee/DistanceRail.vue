<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCaretUp, PhCircleNotch, PhX } from '@phosphor-icons/vue'
import { formatDegrees } from '~/utils/formatters'

const {
  currentObject,
  currentPreset,
  currentPresetId,
  angularDiameter,
  objectBrowserOpen,
  transitioning,
  selectDistance,
  toggleObjectBrowser,
} = usePerigee()

const optionsEl = ref<HTMLDivElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
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
  observer = new ResizeObserver(measure)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

watch([currentPresetId, currentObject], async () => {
  await nextTick()
  measure()
})

watch(objectBrowserOpen, async (open) => {
  if (!open) return
  await nextTick()
  if (optionsEl.value) observer?.observe(optionsEl.value)
  measure()
})

function focusTrigger(): void {
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus())
}

function closeControls(restoreFocus = true): void {
  toggleObjectBrowser(false)
  if (restoreFocus) focusTrigger()
}

function onDistanceKeydown(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const presets = currentObject.value.presets
  const next = presets[(index + direction + presets.length) % presets.length]
  if (next) selectDistance(next.id)
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!objectBrowserOpen.value) return
  const target = event.target
  if (target instanceof Node && !railEl.value?.contains(target)) closeControls(false)
}

async function selectDistanceAndClose(presetId: string): Promise<void> {
  closeControls()
  await selectDistance(presetId)
}
</script>

<template>
  <section ref="railEl" class="control-rail" aria-label="Sky controls">
    <Transition name="dock">
      <div
        v-if="objectBrowserOpen"
        id="sky-menu"
        class="control-panel"
      >
        <div class="control-panel-heading">
          <p>Explore the sky</p>
          <button type="button" aria-label="Close sky controls" @click="closeControls()">
            <PhX :size="15" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <PerigeeObjectBrowser />

        <div class="distance-panel">
          <span class="control-label">Distance</span>
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
              @click="selectDistanceAndClose(preset.id)"
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
      </div>
    </Transition>

    <button
      type="button"
      class="object-trigger"
      data-object-trigger
      :aria-label="`${objectBrowserOpen ? 'Close' : 'Open'} sky controls for ${currentObject.label}, ${currentPreset.label}`"
      aria-controls="sky-menu"
      :aria-expanded="objectBrowserOpen"
      @click="toggleObjectBrowser()"
    >
      <span class="trigger-thumb" aria-hidden="true">
        <img :src="currentObject.thumbnail" alt="">
      </span>
      <span class="trigger-label">
        <span class="trigger-kicker">Sky controls</span>
        <span class="trigger-name">{{ currentObject.label }} <i aria-hidden="true">·</i> {{ currentPreset.label }}</span>
      </span>
      <PhCaretUp :size="12" weight="bold" aria-hidden="true" :class="{ rotated: objectBrowserOpen }" />
    </button>
  </section>
</template>
