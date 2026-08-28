<script setup lang="ts">
const sceneCanvas = ref<HTMLCanvasElement | null>(null)
const {
  currentObject,
  currentPreset,
  angularDiameter,
  loading,
  capabilityError,
  objectBrowserOpen,
  hintVisible,
  retry,
  toggleObjectBrowser,
  initialize,
  pause,
  resume,
  resize,
  dismissHint,
  dispose,
} = usePerigee()
let observer: ResizeObserver | null = null

useSeoMeta({
  title: 'Perigee — Impossible skies, honest scale',
  description: 'See planets and famous stars brought close to Earth with scientifically correct apparent sizes.',
  ogTitle: 'Perigee',
  ogDescription: 'A cinematic, scientifically grounded view of impossible skies.',
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') toggleObjectBrowser(false)
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
  if (!sceneCanvas.value) return
  await initialize(sceneCanvas.value)
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    resize(entry.contentRect.width, entry.contentRect.height, window.devicePixelRatio)
  })
  observer.observe(sceneCanvas.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
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
      <span />
      <p>Bringing the sky into focus</p>
    </div>

    <PerigeeCapabilityFallback
      v-if="capabilityError"
      :kind="capabilityError"
      @retry="handleRetry"
    />

    <PerigeeDistanceRail />
  </main>
</template>
