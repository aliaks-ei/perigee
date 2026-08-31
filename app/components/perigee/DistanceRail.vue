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
  busy,
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
  <section ref="railEl" class="control-rail absolute z-rail" aria-label="Sky controls">
    <Transition name="dock">
      <div
        v-if="objectBrowserOpen"
        id="sky-menu"
        class="control-panel absolute overflow-hidden rounded-lg lt-sm:overflow-y-auto"
      >
        <div class="control-panel-heading flex items-center justify-between">
          <p class="font-semibold uppercase">Explore the sky</p>
          <button
            class="inline-grid h-9 w-9 place-items-center rounded-full"
            type="button"
            aria-label="Close sky controls"
            @click="closeControls()"
          >
            <PhX :size="15" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <PerigeeObjectBrowser />

        <div class="distance-panel grid items-center gap-5 lt-sm:gap-1.5">
          <span class="control-label font-semibold uppercase lt-sm:hidden">Distance</span>
          <div
            ref="optionsEl"
            class="distance-options relative flex items-center gap-1 justify-self-center rounded-pill lt-lg:justify-self-end lt-md:overflow-x-auto lt-md:overscroll-x-contain lt-sm:w-full lt-sm:min-w-0 lt-sm:justify-self-stretch"
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
              class="whitespace-nowrap"
              :class="{ selected: currentPresetId === preset.id }"
              @click="selectDistanceAndClose(preset.id)"
              @keydown="onDistanceKeydown($event, index)"
            >
              {{ preset.label }}
            </button>
          </div>

          <p
            class="apparent-size flex items-baseline gap-2.5 justify-self-end lt-lg:hidden"
            :class="{ transitioning: busy }"
          >
            <PhCircleNotch
              v-if="busy"
              :size="13"
              weight="bold"
              class="animate-spin self-center text-accent"
              aria-hidden="true"
            />
            <span class="size-value">{{ formatDegrees(angularDiameter) }}</span>
            <span class="size-kicker font-semibold uppercase">Apparent size</span>
          </p>
        </div>
      </div>
    </Transition>

    <button
      type="button"
      class="object-trigger inline-flex items-center rounded-pill"
      data-object-trigger
      :aria-label="`${objectBrowserOpen ? 'Close' : 'Open'} sky controls for ${currentObject.label}, ${currentPreset.label}`"
      aria-controls="sky-menu"
      :aria-expanded="objectBrowserOpen"
      @click="toggleObjectBrowser()"
    >
      <span class="trigger-thumb block shrink-0 overflow-hidden rounded-full" aria-hidden="true">
        <img
          class="block h-full w-full object-cover"
          :src="currentObject.thumbnail"
          alt=""
          width="160"
          height="160"
          decoding="async"
        >
      </span>
      <span class="trigger-label flex flex-col gap-0.5 text-left">
        <span class="trigger-kicker font-semibold uppercase">Sky controls</span>
        <span class="trigger-name">{{ currentObject.label }} <i aria-hidden="true">·</i> {{ currentPreset.label }}</span>
      </span>
      <PhCaretUp :size="12" weight="bold" aria-hidden="true" :class="{ rotated: objectBrowserOpen }" />
    </button>
  </section>
</template>
