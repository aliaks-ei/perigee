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
  retry,
  toggleObjectBrowser,
  initialize,
  pause,
  resume,
  resize,
  stepDistance,
  dismissHint,
  dismissNotice,
  dispose,
} = usePerigee()
let observer: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

useSeoMeta({
  title: 'Perigee — Impossible skies, honest scale',
  description: 'See planets and famous stars brought close to Earth with scientifically correct apparent sizes.',
  ogTitle: 'Perigee',
  ogDescription: 'A cinematic, scientifically grounded view of impossible skies.',
})

const loadingPercent = computed(() => Math.round(loadingProgress.value * 100))

function handleKeydown(event: KeyboardEvent): void {
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
    :class="['perigee-shell', { 'browser-open': objectBrowserOpen, 'scene-ready': !loading }]"
    :style="{ '--accent-object': currentObject.shot.accent }"
  >
    <canvas
      ref="sceneCanvas"
      class="perigee-canvas"
      aria-label="Interactive view of the selected celestial object above the current landscape"
      tabindex="-1"
      @pointerdown="dismissHint"
    />
    <div class="scene-scrim" aria-hidden="true" />
    <PerigeeHeader />
    <PerigeeObjectIdentity />

    <Transition name="hint">
      <p v-if="hintVisible && !loading && !capabilityError && !objectBrowserOpen" class="drag-hint">
        <span>Drag to look around</span>
      </p>
    </Transition>

    <div class="selection-alternative sr-only" aria-live="polite">
      {{ currentObject.label }}, {{ currentPreset.label }}, {{ angularDiameter.toFixed(2) }} degrees across the sky.
    </div>

    <div v-if="loading" class="loading-state" aria-live="polite">
      <span class="loading-dot" />
      <p>Bringing the sky into focus</p>
      <span
        class="loading-track"
        role="progressbar"
        aria-label="Loading the sky"
        :aria-valuenow="loadingPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <i :style="{ transform: `scaleX(${Math.max(loadingProgress, 0.04)})` }" />
      </span>
    </div>

    <Transition name="hint">
      <p v-if="notice" class="scene-notice" role="status">
        <span>{{ notice }}</span>
        <button type="button" aria-label="Dismiss message" @click="dismissNotice">×</button>
      </p>
    </Transition>

    <PerigeeCapabilityFallback
      v-if="capabilityError"
      :kind="capabilityError"
      @retry="handleRetry"
    />

    <PerigeeDistanceRail />
  </main>
</template>
