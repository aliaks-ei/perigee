import { computed, readonly, ref, shallowRef } from 'vue'
import { skyObjects, skyObjectsById } from '~/data/objects'
import { viewpoints } from '~/data/viewpoints'
import type {
  PerigeeController,
  PerigeeSelection,
  SkyObjectDefinition,
  SkyObjectId,
  ViewpointId,
} from '~/types/perigee'
import { angularDiameterDegrees } from '../../src/perigee/math/angularSize'

const currentObjectId = ref<SkyObjectId>('saturn')
const currentPresetId = ref('moon-swap')
const currentViewpointId = ref<ViewpointId>('rooftop')
const objectBrowserOpen = ref(false)
const loading = ref(true)
const loadingProgress = ref(0)
/** A shot is running. Controls stay live; only the object being swapped waits. */
const busy = ref(false)
const pendingObjectId = ref<SkyObjectId | null>(null)
const capabilityError = ref<'webgl2' | 'asset' | null>(null)
const notice = ref<string | null>(null)
const hintVisible = ref(true)
const hazardReady = ref(false)
const controller = shallowRef<PerigeeController | null>(null)
let hazardTimer: ReturnType<typeof setTimeout> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null
/** Identifies the newest shot, so a superseded one cannot clear the lock. */
let shotToken = 0

const currentObject = computed(() => skyObjectsById[currentObjectId.value])
const currentPreset = computed(() =>
  currentObject.value.presets.find((preset) => preset.id === currentPresetId.value)
    ?? currentObject.value.presets[0]!,
)
const angularDiameter = computed(() =>
  angularDiameterDegrees(currentObject.value.diameterKm, currentPreset.value.distanceKm),
)
const hazardCopy = computed(() => hazardReady.value ? currentPreset.value.hazardCopy : undefined)

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function defaultPresetId(object: SkyObjectDefinition): string {
  const preferred = object.kind === 'star' ? 'impossible' : 'moon-swap'
  return object.presets.find((preset) => preset.id === preferred)?.id ?? object.presets[0]!.id
}

/**
 * Keeps the viewer's place on the distance ladder across an object change. The
 * two ladders share the `real` step, and jumping someone back to the default
 * every time they compare two objects loses the comparison they were making.
 */
function carriedPresetId(object: SkyObjectDefinition): string {
  return object.presets.some((preset) => preset.id === currentPresetId.value)
    ? currentPresetId.value
    : defaultPresetId(object)
}

function readSelectionFromUrl(): Partial<PerigeeSelection> {
  const params = new URLSearchParams(window.location.search)
  const objectId = params.get('object') as SkyObjectId | null
  const object = objectId && objectId in skyObjectsById ? skyObjectsById[objectId] : null
  const presetId = params.get('distance')
  const viewpointId = params.get('view') as ViewpointId | null

  return {
    ...(object ? { objectId: object.id } : {}),
    ...(object && presetId && object.presets.some((preset) => preset.id === presetId)
      ? { presetId }
      : {}),
    ...(viewpointId && viewpoints.some((viewpoint) => viewpoint.id === viewpointId)
      ? { viewpointId }
      : {}),
  }
}

/** `replaceState`, so sharing a view never fills the viewer's back button. */
function syncUrl(): void {
  const params = new URLSearchParams(window.location.search)
  params.set('object', currentObjectId.value)
  params.set('distance', currentPresetId.value)
  params.set('view', currentViewpointId.value)
  window.history.replaceState(null, '', `?${params.toString()}`)
}

function notify(message: string): void {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, 6_000)
}

function dismissNotice(): void {
  if (noticeTimer) clearTimeout(noticeTimer)
  notice.value = null
}

function queueHazard(): void {
  hazardReady.value = false
  if (hazardTimer) clearTimeout(hazardTimer)
  if (!currentPreset.value.hazardCopy) return
  hazardTimer = setTimeout(() => {
    hazardReady.value = true
  }, prefersReducedMotion() ? 180 : 620)
}

function dismissHint(): void {
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = null
  hintVisible.value = false
}

async function initialize(canvas: HTMLCanvasElement): Promise<void> {
  loading.value = true
  loadingProgress.value = 0
  capabilityError.value = null

  const selection = readSelectionFromUrl()
  if (selection.objectId) currentObjectId.value = selection.objectId
  currentPresetId.value = selection.presetId ?? defaultPresetId(currentObject.value)
  if (selection.viewpointId) currentViewpointId.value = selection.viewpointId

  try {
    const { PerigeeScene } = await import('../../src/perigee/PerigeeScene')
    const scene = new PerigeeScene()
    controller.value = scene
    await scene.initialize(canvas, {
      selection: {
        objectId: currentObjectId.value,
        presetId: currentPresetId.value,
        viewpointId: currentViewpointId.value,
      },
      onProgress: (ratio) => { loadingProgress.value = ratio },
    })
    loading.value = false
    syncUrl()
    queueHazard()
    // The hint is the only thing on screen a touch viewer may never dismiss.
    hintTimer = setTimeout(dismissHint, 8_000)
  } catch (error) {
    loading.value = false
    capabilityError.value = error instanceof Error && error.message === 'WEBGL2_UNAVAILABLE'
      ? 'webgl2'
      : 'asset'
  }
}

async function selectObject(objectId: SkyObjectId): Promise<void> {
  objectBrowserOpen.value = false
  if (objectId === currentObjectId.value) return

  const object = skyObjectsById[objectId]
  const presetId = carriedPresetId(object)
  const previous = { objectId: currentObjectId.value, presetId: currentPresetId.value }

  // Applied before the shot runs. Waiting until the end left the title, the
  // apparent size and the trigger label a full transition behind the sky.
  currentObjectId.value = objectId
  currentPresetId.value = presetId
  hazardReady.value = false
  syncUrl()

  const token = ++shotToken
  pendingObjectId.value = objectId
  busy.value = true
  try {
    await controller.value?.setObject(objectId, presetId)
    if (token === shotToken) queueHazard()
  } catch {
    if (token !== shotToken) return
    currentObjectId.value = previous.objectId
    currentPresetId.value = previous.presetId
    syncUrl()
    notify(`${object.label} could not be loaded. Check your connection and try again.`)
  } finally {
    if (token === shotToken) {
      pendingObjectId.value = null
      busy.value = false
    }
  }
}

async function selectDistance(presetId: string): Promise<void> {
  if (presetId === currentPresetId.value) return
  const previousPresetId = currentPresetId.value
  currentPresetId.value = presetId
  hazardReady.value = false
  syncUrl()

  const token = ++shotToken
  busy.value = true
  try {
    await controller.value?.setDistance(presetId)
    if (token === shotToken) queueHazard()
  } catch {
    if (token !== shotToken) return
    currentPresetId.value = previousPresetId
    syncUrl()
  } finally {
    if (token === shotToken) busy.value = false
  }
}

/** Steps the ladder without opening the panel. Clamped, never wrapped. */
function stepDistance(direction: 1 | -1): void {
  const presets = currentObject.value.presets
  const index = presets.findIndex((preset) => preset.id === currentPresetId.value)
  const next = presets[Math.min(Math.max(index + direction, 0), presets.length - 1)]
  if (next && next.id !== currentPresetId.value) void selectDistance(next.id)
}

async function selectViewpoint(viewpointId: ViewpointId): Promise<void> {
  if (viewpointId === currentViewpointId.value) return
  const previousViewpointId = currentViewpointId.value
  currentViewpointId.value = viewpointId
  syncUrl()

  const token = ++shotToken
  busy.value = true
  try {
    await controller.value?.setViewpoint(viewpointId)
  } catch {
    if (token !== shotToken) return
    currentViewpointId.value = previousViewpointId
    syncUrl()
    notify('That viewpoint could not be loaded.')
  } finally {
    if (token === shotToken) busy.value = false
  }
}

function toggleObjectBrowser(force?: boolean): void {
  objectBrowserOpen.value = force ?? !objectBrowserOpen.value
}

/**
 * One shot, not three. Running the object, distance and viewpoint changes in
 * series meant a single click could hold the interface for four seconds.
 */
async function resetExperience(): Promise<void> {
  objectBrowserOpen.value = false
  controller.value?.resetView()

  const shots: Array<Promise<void> | undefined> = []
  if (currentViewpointId.value !== 'rooftop') {
    currentViewpointId.value = 'rooftop'
    shots.push(controller.value?.setViewpoint('rooftop'))
  }
  if (currentObjectId.value !== 'saturn' || currentPresetId.value !== 'moon-swap') {
    currentObjectId.value = 'saturn'
    currentPresetId.value = 'moon-swap'
    shots.push(controller.value?.setObject('saturn', 'moon-swap'))
  }
  if (shots.length === 0) return

  hazardReady.value = false
  syncUrl()
  const token = ++shotToken
  pendingObjectId.value = 'saturn'
  busy.value = true
  try {
    await Promise.all(shots)
    if (token === shotToken) queueHazard()
  } finally {
    if (token === shotToken) {
      pendingObjectId.value = null
      busy.value = false
    }
  }
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
  if (hintTimer) clearTimeout(hintTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
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
    loadingProgress: readonly(loadingProgress),
    busy: readonly(busy),
    pendingObjectId: readonly(pendingObjectId),
    capabilityError: readonly(capabilityError),
    notice: readonly(notice),
    hintVisible: readonly(hintVisible),
    initialize,
    retry,
    selectObject,
    selectDistance,
    stepDistance,
    selectViewpoint,
    toggleObjectBrowser,
    dismissHint,
    dismissNotice,
    resetExperience,
    pause,
    resume,
    resize,
    dispose,
  }
}
