<script setup lang="ts">
import { PhMusicNotesSimple } from '@phosphor-icons/vue'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '~/utils/seo'
import { formatDegrees } from '~/utils/formatters'

/**
 * The whole experience. It lives in a component rather than in `app.vue` so the
 * curated `/e/<slug>` routes, which are prerendered with server rendering on so
 * their social cards are real HTML, can mount it client-side only.
 *
 * The interface arrives in stages (see `utils/disclosureStages.ts`): the
 * shell carries the current stage as a class, tells the state layer when the
 * viewer looks around or is idle, and mounts each layer in its own place so
 * nothing that appears later moves what is already there.
 */
const props = defineProps<{
  /** Set by a curated encounter route; opens that encounter at its first beat. */
  encounterSlug?: string
}>()

const sceneCanvas = ref<HTMLCanvasElement | null>(null)
const {
  currentObject,
  currentPreset,
  currentViewpointId,
  angularDiameter,
  loading,
  loadingProgress,
  sceneReady,
  enter,
  busy,
  capabilityError,
  objectBrowserOpen,
  moreOpen,
  hintVisible,
  notice,
  stage,
  chromeIdle,
  revealed,
  currentEncounter,
  encounterStatus,
  encounterTransitioning,
  retry,
  toggleObjectBrowser,
  toggleMore,
  initialize,
  pause,
  resume,
  resize,
  stepDistance,
  noteActivity,
  noteLook,
  dismissNotice,
  nextEncounter,
  previousEncounter,
  exitEncounter,
  dispose,
} = usePerigee()
const { capture, captureOpen, capturing } = useCapture()
const { toggle: toggleSound, decline: declineSound } = useAmbientSound(currentViewpointId)
const enterButton = ref<HTMLButtonElement | null>(null)
let observer: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

// A curated route sets its own head at build time, so the reactive title only
// applies where the encounter is chosen inside the running app.
if (!props.encounterSlug) {
  // No entry here carries "— Perigee": `titleTemplate` in `app.vue` appends the
  // site name, and adding it here too doubles it.
  useSeoMeta({
    title: () => currentEncounter.value?.title ?? SITE_TAGLINE,
    description: () => currentEncounter.value?.invitation ?? SITE_DESCRIPTION,
    ogTitle: () => currentEncounter.value?.title ?? `${SITE_NAME} — ${SITE_TAGLINE}`,
    ogDescription: () => currentEncounter.value?.invitation ?? SITE_DESCRIPTION,
  })
}

const loadingPercent = computed(() => Math.round(loadingProgress.value * 100))
/**
 * The loading screen ends in a choice, not a fade. Once everything is ready
 * it says so and waits: the viewer enters with music or in silence, and the
 * sky, its hints and its arrival approach start on that tap. The tap is also
 * the gesture the browser needs before it will play anything, so the music
 * can start at once. No browser starts audio on its own, and an offer that
 * arrived later covered the sky. Nothing about music appears over the sky
 * after this; the toggle beside "more" is the control from then on.
 */
const ready = computed(() => loading.value && sceneReady.value && !capabilityError.value)

watch(ready, async (isReady) => {
  if (!isReady) return
  await nextTick()
  enterButton.value?.focus({ preventScroll: true })
})

function enterWithMusic(): void {
  void toggleSound()
  enter()
}

function enterInSilence(): void {
  declineSound()
  enter()
}
/** The one-time nudge toward the ladder, between the drag hint and the first change. */
const railHintVisible = computed(() =>
  revealed('orient') && !revealed('explore') && !hintVisible.value
  && !objectBrowserOpen.value && !loading.value && !capabilityError.value
  && encounterStatus.value === 'idle',
)

function handleKeydown(event: KeyboardEvent): void {
  noteActivity()
  const target = event.target
  const editing = target instanceof HTMLElement
    && (target.matches('input, select, textarea') || target.isContentEditable)
  if (
    !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat
    && event.key.toLowerCase() === 'c' && !editing
  ) {
    if (!captureOpen.value && !capturing.value && !loading.value && !capabilityError.value) {
      if (objectBrowserOpen.value) toggleObjectBrowser(false)
      if (moreOpen.value) toggleMore(false)
      void capture()
    }
    event.preventDefault()
    return
  }
  if (encounterStatus.value !== 'idle') {
    if (event.key === 'Escape') {
      exitEncounter()
      nextTick(() => document.querySelector<HTMLButtonElement>('[data-more-trigger]')?.focus())
      event.preventDefault()
      return
    }
    if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea')) return
    if (encounterTransitioning.value) return
    if (event.key === 'ArrowRight') void nextEncounter()
    else if (event.key === 'ArrowLeft') void previousEncounter()
    else return
    event.preventDefault()
    return
  }
  if (event.key === 'Escape' && objectBrowserOpen.value) {
    toggleObjectBrowser(false)
    nextTick(() => document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus())
    return
  }
  if (event.key === 'Escape' && moreOpen.value) {
    toggleMore(false)
    nextTick(() => document.querySelector<HTMLButtonElement>('[data-more-trigger]')?.focus())
    return
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return
  // Only when the viewer is not inside a control, so the rail's own arrow-key
  // handling keeps working.
  if (target instanceof HTMLElement && target.closest('button, input, select, textarea')) return

  if (event.key === ']' || event.key === 'ArrowRight') stepDistance(1)
  else if (event.key === '[' || event.key === 'ArrowLeft') stepDistance(-1)
  else return
  noteLook()
  event.preventDefault()
}

function handleRetry(): void {
  if (sceneCanvas.value) retry(sceneCanvas.value, props.encounterSlug)
}

function handleVisibility(): void {
  if (document.hidden) pause()
  else resume()
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('pointermove', noteActivity, { passive: true })
  window.addEventListener('pointerdown', noteActivity, { passive: true })
  document.addEventListener('visibilitychange', handleVisibility)
  const canvas = sceneCanvas.value
  if (!canvas) return
  await initialize(canvas, props.encounterSlug)
  if (!canvas.isConnected) return
  // Debounced: every callback reallocates the composer's render targets, and a
  // window drag fires one per frame.
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    const { width, height } = entry.contentRect
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => resize(width, height, window.devicePixelRatio), 100)
  })
  observer.observe(canvas)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointermove', noteActivity)
  window.removeEventListener('pointerdown', noteActivity)
  document.removeEventListener('visibilitychange', handleVisibility)
  dispose()
})
</script>

<template>
  <main
    class="perigee-shell relative isolate h-full w-full overflow-hidden bg-surface-void text-ink-primary"
    :class="[`encounter-${encounterStatus}`, `stage-${stage}`, {
      'browser-open': objectBrowserOpen,
      'scene-ready': !loading,
      'chrome-idle': chromeIdle,
    }]"
    :style="{ '--accent-object': currentObject.shot.accent }"
  >
    <canvas
      ref="sceneCanvas"
      class="absolute inset-0 z-canvas block h-full w-full cursor-grab touch-pinch-zoom active:cursor-grabbing"
      aria-label="Interactive view of the selected celestial object above the current landscape"
      tabindex="-1"
      @pointerdown="noteLook"
    />
    <div class="scene-scrim pointer-events-none absolute inset-0 z-scrim" aria-hidden="true" />
    <Transition name="chrome">
      <PerigeeHeader v-if="encounterStatus === 'idle'" />
    </Transition>
    <Transition name="chrome">
      <PerigeeObjectIdentity v-if="encounterStatus === 'idle'" />
    </Transition>
    <PerigeeEncounterOverlay />
    <PerigeeCelestialLocator
      v-if="encounterStatus === 'idle' && !loading && !capabilityError"
      :active="!busy"
      :label="`${currentObject.label} · ${currentPreset.label}`"
      :max-diameter-pixels="6"
    />
    <PerigeeDiscoveryNote />
    <PerigeeCaptureCard />
    <PerigeeMoreSheet v-if="!loading && !capabilityError" />

    <Transition name="hint">
      <p
        v-if="hintVisible && !loading && !capabilityError && !objectBrowserOpen && encounterStatus === 'idle'"
        class="drag-hint text-shadow pointer-events-none absolute z-identity items-center font-semibold uppercase"
      >
        <span>Drag to look around</span>
      </p>
    </Transition>

    <Transition name="hint">
      <p
        v-if="railHintVisible"
        class="drag-hint rail-hint text-shadow pointer-events-none absolute z-identity items-center font-semibold uppercase lt-sm:hidden"
      >
        <span>Step the distance</span>
        <kbd aria-hidden="true">←</kbd>
        <kbd aria-hidden="true">→</kbd>
      </p>
    </Transition>

    <div class="selection-alternative sr-only" aria-live="polite">
      {{ currentObject.label }}, {{ currentPreset.label }}, {{ formatDegrees(angularDiameter) }} across the sky.
    </div>

    <Transition name="fade">
      <div
        v-if="loading"
        class="loading-state absolute inset-0 z-loading flex flex-col items-center justify-center font-semibold uppercase"
        aria-live="polite"
      >
        <span class="loading-dot" :class="{ 'animate-approach': !ready }" />
        <p>{{ ready ? 'Everything is ready' : 'Bringing the sky into focus' }}</p>
        <span
          class="loading-track block overflow-hidden"
          role="progressbar"
          aria-label="Loading the sky"
          :aria-valuenow="loadingPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <i :style="{ transform: `scaleX(${Math.max(loadingProgress, 0.04)})` }" />
        </span>
        <Transition name="hint">
          <div v-if="ready" class="arrival-sound flex items-center">
            <button
              ref="enterButton"
              type="button"
              class="arrival-sound-accept inline-flex items-center rounded-full"
              @click="enterWithMusic"
            >
              <PhMusicNotesSimple :size="14" weight="regular" aria-hidden="true" />
              <span>Enter with music</span>
            </button>
            <button type="button" class="arrival-sound-decline" @click="enterInSilence">Enter in silence</button>
          </div>
        </Transition>
      </div>
    </Transition>

    <Transition name="hint">
      <p v-if="notice" class="scene-notice absolute z-notice flex items-center gap-3 rounded-sm" role="status">
        <span>{{ notice }}</span>
        <button type="button" aria-label="Dismiss message" @click="dismissNotice">×</button>
      </p>
    </Transition>

    <Transition name="fade">
      <PerigeeCapabilityFallback
        v-if="capabilityError"
        :kind="capabilityError"
        @retry="handleRetry"
      />
    </Transition>

    <Transition name="chrome">
      <PerigeeDistanceRail v-if="encounterStatus === 'idle' && revealed('orient')" />
    </Transition>
  </main>
</template>
