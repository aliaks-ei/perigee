<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCaretLeft, PhCaretRight, PhCaretUp, PhCircleNotch, PhX } from '@phosphor-icons/vue'
import { formatDegrees } from '~/utils/formatters'

/**
 * The one control that rests on screen: a pill with the object, distance, and
 * landscape. Desktop keeps the five-dot ladder; phones get three 44px distance
 * controls and task-specific sheets so the same actions fit without clipping.
 */
const {
  currentObject,
  currentPreset,
  currentPresetId,
  currentViewpointId,
  viewpoints,
  angularDiameter,
  objectBrowserOpen,
  busy,
  revealed,
  selectDistance,
  toggleObjectBrowser,
} = usePerigee()

const optionsEl = ref<HTMLDivElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, ready: false })
const mobilePanelMode = ref<'objects' | 'distance' | 'viewpoints'>('objects')
const panelTrigger = ref<'object' | 'distance' | 'viewpoint'>('object')
let observer: ResizeObserver | null = null

const currentViewpoint = computed(() =>
  viewpoints.find((viewpoint) => viewpoint.id === currentViewpointId.value) ?? viewpoints[0]!,
)
const currentPresetIndex = computed(() =>
  currentObject.value.presets.findIndex((preset) => preset.id === currentPresetId.value),
)
const mobilePanelTitle = computed(() => ({
  objects: 'Choose an object',
  distance: 'Choose a distance',
  viewpoints: 'Choose a landscape',
})[mobilePanelMode.value])
const mobileStepLabel = computed(() =>
  `${currentPresetIndex.value + 1} of ${currentObject.value.presets.length}: ${currentPreset.value.label}`,
)

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
  const selector = {
    object: '[data-object-trigger]',
    distance: '[data-distance-trigger]',
    viewpoint: '[data-viewpoint-trigger]',
  }[panelTrigger.value]
  nextTick(() => document.querySelector<HTMLButtonElement>(selector)?.focus())
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

/** The dots on the pill step without wrapping, like the arrow keys do. */
function onLadderKeydown(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const presets = currentObject.value.presets
  const nextIndex = Math.min(Math.max(index + (event.key === 'ArrowRight' ? 1 : -1), 0), presets.length - 1)
  const next = presets[nextIndex]
  if (!next) return
  document.querySelector<HTMLButtonElement>(`[data-ladder-step="${next.id}"]`)?.focus({ preventScroll: true })
  void selectDistance(next.id)
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

function isCompactLayout(): boolean {
  return window.matchMedia('(max-width: 640px)').matches
}

async function openCompactPanel(mode: 'objects' | 'distance' | 'viewpoints'): Promise<void> {
  const trigger = mode === 'objects' ? 'object' : mode === 'distance' ? 'distance' : 'viewpoint'
  if (!isCompactLayout()) {
    panelTrigger.value = trigger
    if (mode === 'objects') toggleObjectBrowser()
    else await openViewpoints()
    return
  }
  if (objectBrowserOpen.value && mobilePanelMode.value === mode) {
    closeControls()
    return
  }
  mobilePanelMode.value = mode
  panelTrigger.value = trigger
  toggleObjectBrowser(true)
  await nextTick()
  const selector = mode === 'objects'
    ? '.object-option[aria-selected="true"]'
    : mode === 'distance'
      ? '.distance-options [aria-checked="true"]'
      : '[data-viewpoint-option][aria-checked="true"]'
  document.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true })
}

async function stepMobileDistance(direction: -1 | 1): Promise<void> {
  const next = currentObject.value.presets[currentPresetIndex.value + direction]
  if (next) await selectDistance(next.id)
}

/** Opens the sheet on the landscape row, with the current plate focused. */
async function openViewpoints(): Promise<void> {
  if (objectBrowserOpen.value) {
    closeControls()
    return
  }
  toggleObjectBrowser(true)
  await nextTick()
  const selected = document.querySelector<HTMLButtonElement>('[data-viewpoint-option][aria-checked="true"]')
  selected?.focus({ preventScroll: true })
  selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
</script>

<template>
  <section ref="railEl" class="control-rail absolute z-rail" aria-label="Sky controls">
    <Transition name="dock">
      <div
        v-if="objectBrowserOpen"
        id="sky-menu"
        class="control-panel absolute overflow-hidden rounded-lg lt-sm:overflow-y-auto"
        :data-mobile-panel="mobilePanelMode"
        @keydown.esc.stop.prevent="closeControls()"
      >
        <div class="control-panel-heading flex items-center justify-between">
          <p class="font-semibold uppercase">
            <span class="lt-sm:hidden">Explore the sky</span>
            <span class="hidden lt-sm:inline">{{ mobilePanelTitle }}</span>
          </p>
          <button
            class="inline-grid h-11 w-11 place-items-center rounded-full"
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
              class="inline-flex flex-col items-center justify-center whitespace-nowrap"
              :class="{ selected: currentPresetId === preset.id }"
              @click="selectDistanceAndClose(preset.id)"
              @keydown="onDistanceKeydown($event, index)"
            >
              <span>{{ preset.label }}</span>
              <span v-if="preset.metadataLabel" class="distance-option-meaning hidden lt-sm:block">
                {{ preset.metadataLabel }}
              </span>
            </button>
          </div>
          <p class="distance-meaning lt-lg:hidden">{{ currentPreset.metadataLabel ?? currentPreset.label }}</p>
        </div>

        <PerigeeViewpointChooser v-if="revealed('explore')" />
      </div>
    </Transition>

    <div class="object-trigger inline-flex items-stretch rounded-pill" :class="{ open: objectBrowserOpen }">
      <button
        type="button"
        class="trigger-object inline-flex items-center"
        data-object-trigger
        :aria-label="`${objectBrowserOpen ? 'Close' : 'Open'} sky controls for ${currentObject.label}, ${currentPreset.label}`"
        aria-controls="sky-menu"
        :aria-expanded="objectBrowserOpen"
        @click="openCompactPanel('objects')"
      >
        <span class="trigger-thumb block shrink-0 overflow-hidden rounded-full" aria-hidden="true">
          <img
            class="block h-full w-full object-cover"
            :class="{ star: currentObject.kind === 'star' }"
            :src="currentObject.thumbnail"
            alt=""
            width="160"
            height="160"
            decoding="async"
          >
        </span>
        <span class="trigger-label flex flex-col gap-0.5 text-left">
          <span class="trigger-kicker flex items-center gap-1.5 font-semibold uppercase" :class="{ transitioning: busy }">
            <span class="trigger-busy grid shrink-0 place-items-center" aria-hidden="true">
              <PhCircleNotch v-if="busy" :size="11" weight="bold" class="animate-spin text-accent" />
              <i v-else class="block h-1 w-1 rounded-full bg-accent" />
            </span>
            <span class="size-value">{{ formatDegrees(angularDiameter) }}</span>
            <span class="lt-sm:hidden">across · {{ currentPreset.label }}</span>
          </span>
          <span class="trigger-name">{{ currentObject.label }}</span>
        </span>
        <PhCaretUp :size="12" weight="bold" aria-hidden="true" :class="{ rotated: objectBrowserOpen }" />
      </button>

      <div
        class="trigger-ladder flex items-center lt-sm:hidden"
        role="radiogroup"
        :aria-label="`Distance step for ${currentObject.label}`"
      >
        <button
          v-for="(preset, index) in currentObject.presets"
          :key="preset.id"
          type="button"
          role="radio"
          :aria-checked="currentPresetId === preset.id"
          :aria-label="preset.metadataLabel ? `${preset.label}, ${preset.metadataLabel}` : preset.label"
          :data-label="preset.label"
          :data-ladder-step="preset.id"
          :style="{ '--step-size': `${7 - index * 0.55}px` }"
          :tabindex="currentPresetId === preset.id ? 0 : -1"
          class="ladder-step grid place-items-center"
          :class="{ selected: currentPresetId === preset.id, passed: index < currentPresetIndex }"
          @click="selectDistance(preset.id)"
          @keydown="onLadderKeydown($event, index)"
        >
          <i aria-hidden="true" />
        </button>
      </div>

      <div class="trigger-stepper hidden items-stretch lt-sm:flex" role="group" :aria-label="`Distance for ${currentObject.label}`">
        <button
          type="button"
          class="grid place-items-center"
          :disabled="currentPresetIndex === 0"
          aria-label="Move one distance step closer"
          @click="stepMobileDistance(-1)"
        >
          <PhCaretLeft :size="14" weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="stepper-position grid place-items-center font-semibold"
          data-distance-trigger
          aria-controls="sky-menu"
          :aria-expanded="objectBrowserOpen && mobilePanelMode === 'distance'"
          :aria-label="`Choose distance, ${mobileStepLabel}`"
          @click="openCompactPanel('distance')"
        >
          {{ currentPreset.shortLabel ?? currentPreset.label }}
        </button>
        <button
          type="button"
          class="grid place-items-center"
          :disabled="currentPresetIndex === currentObject.presets.length - 1"
          aria-label="Move one distance step farther away"
          @click="stepMobileDistance(1)"
        >
          <PhCaretRight :size="14" weight="bold" aria-hidden="true" />
        </button>
      </div>

      <Transition name="fade">
        <button
          v-if="revealed('explore')"
          type="button"
          class="trigger-viewpoint inline-flex items-center gap-2.5"
          data-viewpoint-trigger
          aria-controls="sky-menu"
          :aria-expanded="objectBrowserOpen"
          :aria-label="`Change landscape, now ${currentViewpoint.label}`"
          @click="openCompactPanel('viewpoints')"
        >
          <span class="viewpoint-thumb block shrink-0 overflow-hidden" aria-hidden="true">
            <img
              class="block h-full w-full object-cover"
              :src="currentViewpoint.thumbnail"
              alt=""
              width="320"
              height="180"
              decoding="async"
            >
          </span>
          <span class="trigger-name lt-sm:hidden">{{ currentViewpoint.label }}</span>
        </button>
      </Transition>
    </div>
  </section>
</template>
