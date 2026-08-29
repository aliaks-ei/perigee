import { computed, readonly, ref, shallowRef } from 'vue'
import { skyObjects, skyObjectsById } from '~/data/objects'
import { viewpoints } from '~/data/viewpoints'
import type {
  PerigeeController,
  SkyObjectId,
  ViewpointId,
} from '~/types/perigee'
import { angularDiameterDegrees } from '../../src/perigee/math/angularSize'

const currentObjectId = ref<SkyObjectId>('saturn')
const currentPresetId = ref('moon-swap')
const currentViewpointId = ref<ViewpointId>('rooftop')
const objectBrowserOpen = ref(false)
const loading = ref(true)
const transitioning = ref(false)
const capabilityError = ref<'webgl2' | 'asset' | null>(null)
const hintVisible = ref(true)
const hazardReady = ref(false)
const controller = shallowRef<PerigeeController | null>(null)
let hazardTimer: ReturnType<typeof setTimeout> | null = null

const currentObject = computed(() => skyObjectsById[currentObjectId.value])
const currentPreset = computed(() =>
  currentObject.value.presets.find((preset) => preset.id === currentPresetId.value)
    ?? currentObject.value.presets[0]!,
)
const angularDiameter = computed(() =>
  angularDiameterDegrees(currentObject.value.diameterKm, currentPreset.value.distanceKm),
)
const hazardCopy = computed(() => hazardReady.value ? currentPreset.value.hazardCopy : undefined)

function queueHazard(): void {
  hazardReady.value = false
  if (hazardTimer) clearTimeout(hazardTimer)
  if (!currentPreset.value.hazardCopy) return
  hazardTimer = setTimeout(() => {
    hazardReady.value = true
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 620)
}

async function initialize(canvas: HTMLCanvasElement): Promise<void> {
  loading.value = true
  capabilityError.value = null
  try {
    const { PerigeeScene } = await import('../../src/perigee/PerigeeScene')
    const scene = new PerigeeScene()
    controller.value = scene
    await scene.initialize(canvas)
    loading.value = false
    queueHazard()
  } catch (error) {
    loading.value = false
    capabilityError.value = error instanceof Error && error.message === 'WEBGL2_UNAVAILABLE'
      ? 'webgl2'
      : 'asset'
  }
}

async function selectObject(objectId: SkyObjectId): Promise<void> {
  if (transitioning.value || objectId === currentObjectId.value) {
    objectBrowserOpen.value = false
    return
  }
  const object = skyObjectsById[objectId]
  const recommendation = object.presets.find((preset) =>
    object.kind === 'star' ? preset.id === 'impossible' : preset.id === 'moon-swap',
  ) ?? object.presets[0]!

  transitioning.value = true
  hazardReady.value = false
  try {
    await controller.value?.setObject(objectId, recommendation.id)
    currentObjectId.value = objectId
    currentPresetId.value = recommendation.id
    objectBrowserOpen.value = false
    queueHazard()
  } finally {
    transitioning.value = false
  }
}

async function selectDistance(presetId: string): Promise<void> {
  if (transitioning.value || presetId === currentPresetId.value) return
  transitioning.value = true
  hazardReady.value = false
  currentPresetId.value = presetId
  try {
    await controller.value?.setDistance(presetId)
    queueHazard()
  } finally {
    transitioning.value = false
  }
}

async function selectViewpoint(viewpointId: ViewpointId): Promise<void> {
  if (transitioning.value || viewpointId === currentViewpointId.value) return
  const previousViewpointId = currentViewpointId.value
  currentViewpointId.value = viewpointId
  transitioning.value = true
  try {
    await controller.value?.setViewpoint(viewpointId)
  } catch (error) {
    currentViewpointId.value = previousViewpointId
    throw error
  } finally {
    transitioning.value = false
  }
}

function toggleObjectBrowser(force?: boolean): void {
  objectBrowserOpen.value = force ?? !objectBrowserOpen.value
}

function dismissHint(): void {
  hintVisible.value = false
}

async function resetExperience(): Promise<void> {
  if (transitioning.value) return
  objectBrowserOpen.value = false
  controller.value?.resetView()
  if (currentViewpointId.value !== 'rooftop') await selectViewpoint('rooftop')
  if (currentObjectId.value !== 'saturn') await selectObject('saturn')
  if (currentPresetId.value !== 'moon-swap') await selectDistance('moon-swap')
}

function retry(canvas: HTMLCanvasElement): Promise<void> {
  controller.value?.dispose()
  controller.value = null
  return initialize(canvas)
}

function pause(): void {
  controller.value?.pause()
}

function resume(): void {
  controller.value?.resume()
}

function resize(width: number, height: number, dpr: number): void {
  controller.value?.resize(width, height, dpr)
}

function dispose(): void {
  if (hazardTimer) clearTimeout(hazardTimer)
  controller.value?.dispose()
  controller.value = null
}

export function usePerigee() {
  return {
    skyObjects,
    viewpoints,
    currentObjectId: readonly(currentObjectId),
    currentPresetId: readonly(currentPresetId),
    currentViewpointId: readonly(currentViewpointId),
    currentObject,
    currentPreset,
    angularDiameter,
    hazardCopy,
    objectBrowserOpen: readonly(objectBrowserOpen),
    loading: readonly(loading),
    transitioning: readonly(transitioning),
    capabilityError: readonly(capabilityError),
    hintVisible: readonly(hintVisible),
    initialize,
    retry,
    selectObject,
    selectDistance,
    selectViewpoint,
    toggleObjectBrowser,
    dismissHint,
    resetExperience,
    pause,
    resume,
    resize,
    dispose,
  }
}
