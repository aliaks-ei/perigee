<script setup lang="ts">
const sceneCanvas = ref<HTMLCanvasElement | null>(null)
const {
  currentObject,
  currentPreset,
  angularDiameter,
  loading,
  loadingProgress,
  capabilityError,
  objectBrowserOpen,
  hintVisible,
  notice,
  currentEncounter,
  encounterStatus,
  encounterTransitioning,
  retry,
  toggleObjectBrowser,
  initialize,
  pause,
  resume,
  resize,
  stepDistance,
  dismissHint,
  dismissNotice,
  nextEncounter,
  previousEncounter,
  toggleEncounterPause,
  exitEncounter,
  dispose,
} = usePerigee()
let observer: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

useSeoMeta({
  title: () => currentEncounter.value
    ? `${currentEncounter.value.title} — Perigee`
    : 'Perigee — Impossible skies, honest scale',
  description: () => currentEncounter.value?.invitation
    ?? 'See planets and famous stars brought close to Earth with scientifically correct apparent sizes.',
  ogTitle: () => currentEncounter.value?.title ?? 'Perigee',
  ogDescription: () => currentEncounter.value?.invitation
    ?? 'A cinematic, scientifically grounded view of impossible skies.',
})

const loadingPercent = computed(() => Math.round(loadingProgress.value * 100))

function handleKeydown(event: KeyboardEvent): void {
  if (encounterStatus.value !== 'idle') {
    if (event.key === 'Escape') {
      exitEncounter()
      nextTick(() => document.querySelector<HTMLButtonElement>('[data-encounter-invite]')?.focus())
      event.preventDefault()
      return
    }
    const target = event.target
    if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea')) return
    if (encounterTransitioning.value) return
    if (event.key === 'ArrowRight') void nextEncounter()
    else if (event.key === 'ArrowLeft') void previousEncounter()
    else if (event.key === ' ') toggleEncounterPause()
    else return
    event.preventDefault()
    return
  }
  if (event.key === 'Escape' && objectBrowserOpen.value) {
    toggleObjectBrowser(false)
    nextTick(() => document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus())
    return
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return
  // Only when the viewer is not inside a control, so the rail's own arrow-key
  // handling keeps working.
  const target = event.target
  if (target instanceof HTMLElement && target.closest('button, input, select, textarea')) return

  if (event.key === ']' || event.key === 'ArrowRight') stepDistance(1)
  else if (event.key === '[' || event.key === 'ArrowLeft') stepDistance(-1)
  else return
  event.preventDefault()
}

function handleRetry(): void {
  if (sceneCanvas.value) retry(sceneCanvas.value)
}

function handleVisibility(): void {
  if (document.hidden) pause()
  else resume()
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibility)
  const canvas = sceneCanvas.value
  if (!canvas) return
  await initialize(canvas)
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
  document.removeEventListener('visibilitychange', handleVisibility)
  dispose()
})
</script>

<template>
  <main
    class="perigee-shell relative isolate h-full w-full overflow-hidden bg-surface-void text-ink-primary"
    :class="[`encounter-${encounterStatus}`, { 'browser-open': objectBrowserOpen, 'scene-ready': !loading }]"
    :style="{ '--accent-object': currentObject.shot.accent }"
  >
    <canvas
      ref="sceneCanvas"
      class="absolute inset-0 z-canvas block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      aria-label="Interactive view of the selected celestial object above the current landscape"
      tabindex="-1"
      @pointerdown="dismissHint"
    />
    <div class="scene-scrim pointer-events-none absolute inset-0 z-scrim" aria-hidden="true" />
    <Transition name="chrome">
      <PerigeeHeader v-if="encounterStatus === 'idle'" />
    </Transition>
    <Transition name="chrome">
      <PerigeeObjectIdentity v-if="encounterStatus === 'idle'" />
    </Transition>
    <PerigeeEncounterOverlay />

    <Transition name="hint">
      <p
        v-if="hintVisible && !loading && !capabilityError && !objectBrowserOpen"
        class="drag-hint text-shadow pointer-events-none absolute z-identity items-center font-semibold uppercase"
      >
        <span>Drag to look around</span>
      </p>
    </Transition>

    <div class="selection-alternative sr-only" aria-live="polite">
      {{ currentObject.label }}, {{ currentPreset.label }}, {{ angularDiameter.toFixed(2) }} degrees across the sky.
    </div>

    <Transition name="fade">
      <div
        v-if="loading"
        class="loading-state absolute inset-0 z-loading flex flex-col items-center justify-center font-semibold uppercase"
        aria-live="polite"
      >
        <span class="loading-dot animate-approach" />
        <p>Bringing the sky into focus</p>
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
      <PerigeeDistanceRail v-if="encounterStatus === 'idle'" />
    </Transition>
  </main>
</template>
