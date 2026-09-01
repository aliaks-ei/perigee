import { computed, readonly, ref, shallowRef } from 'vue'
import { skyObjects, skyObjectsById } from '~/data/objects'
import { viewpoints } from '~/data/viewpoints'
import {
  discoveriesById,
  encounters,
  encountersById,
  encountersBySlug,
} from '~/data/editorial'
import { resolveDiscovery } from '~/utils/discoveryCalculations'
import { analytics } from '~/utils/analytics'
import type { EncounterDefinition } from '~/types/editorial'
import type {
  PerigeeController,
  PerigeeSelection,
  SkyObjectDefinition,
  SkyObjectId,
  ViewpointId,
} from '~/types/perigee'
import { angularDiameterDegrees } from '../../src/perigee/math/angularSize'
import {
  EncounterDirector,
  type EncounterSnapshot,
  type EncounterStatus,
} from '../../src/perigee/EncounterDirector'

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
/**
 * True once the viewer has composed something of their own. The capture
 * action waits for it, so the resting first frame keeps its two actions.
 */
const hasInteracted = ref(false)
const hazardReady = ref(false)
const controller = shallowRef<PerigeeController | null>(null)
const encounterDirector = new EncounterDirector()
const currentEncounter = ref<EncounterDefinition | null>(null)
const encounterStatus = ref<EncounterStatus>('idle')
const encounterBeatIndex = ref(0)
const encounterTransitioning = ref(false)
const encounterBeatRevealed = ref(false)
let hazardTimer: ReturnType<typeof setTimeout> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null
/** Identifies the newest shot, so a superseded one cannot clear the lock. */
let shotToken = 0
let encounterToken = 0

const currentObject = computed(() => skyObjectsById[currentObjectId.value])
const currentPreset = computed(() =>
  currentObject.value.presets.find((preset) => preset.id === currentPresetId.value)
    ?? currentObject.value.presets[0]!,
)
const angularDiameter = computed(() =>
  angularDiameterDegrees(currentObject.value.diameterKm, currentPreset.value.distanceKm),
)
const hazardCopy = computed(() => hazardReady.value ? currentPreset.value.hazardCopy : undefined)
const currentEncounterBeat = computed(() => currentEncounter.value?.beats[encounterBeatIndex.value] ?? null)
const currentDiscovery = computed(() => {
  const discoveryId = currentEncounterBeat.value?.discoveryId
  const discovery = discoveryId ? discoveriesById[discoveryId] : undefined
  return discovery ? resolveDiscovery(discovery) : null
})
const availableEncounter = computed(() => {
  const matching = encounters.filter((encounter) =>
    encounter.beats[0]?.selection.objectId === currentObjectId.value,
  )
  return matching.find((encounter) =>
    encounter.beats[0]?.selection.viewpointId === currentViewpointId.value,
  ) ?? matching.find((encounter) =>
    encounter.beats[0]?.selection.viewpointId === 'rooftop',
  ) ?? matching[0] ?? null
})

function recordInteraction(kind: 'object' | 'distance' | 'viewpoint' | 'encounter'): void {
  hasInteracted.value = true
  analytics.interaction(kind)
}

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
  if (currentEncounter.value && encounterStatus.value !== 'idle') {
    params.set('encounter', currentEncounter.value.slug)
  } else {
    params.delete('encounter')
  }
  window.history.replaceState(null, '', `?${params.toString()}`)
}

function applyEncounterSnapshot(snapshot: EncounterSnapshot): void {
  currentEncounter.value = snapshot.encounter
  encounterStatus.value = snapshot.status
  encounterBeatIndex.value = snapshot.beatIndex
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

/**
 * `encounterSlug` comes from the curated `/e/<slug>` route. The query string
 * carries the same thing on the SPA route, so both entry points restore an
 * encounter through one path.
 */
async function initialize(canvas: HTMLCanvasElement, encounterSlug?: string): Promise<void> {
  const loadStartedAt = performance.now()
  loading.value = true
  loadingProgress.value = 0
  capabilityError.value = null

  const selection = readSelectionFromUrl()
  const slug = encounterSlug ?? new URLSearchParams(window.location.search).get('encounter')
  const linkedEncounter = slug ? encountersBySlug[slug] : undefined
  if (linkedEncounter) {
    applyEncounterSnapshot(encounterDirector.invite(linkedEncounter))
    applyEncounterSnapshot(encounterDirector.start())
    const firstBeat = linkedEncounter.beats[0]
    if (firstBeat) Object.assign(selection, firstBeat.selection)
  }
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
    analytics.clock.start()
    analytics.track('scene_ready', { loadMs: Math.round(performance.now() - loadStartedAt) })
    encounterBeatRevealed.value = Boolean(linkedEncounter)
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
  if (encounterStatus.value !== 'idle') exitEncounter()
  objectBrowserOpen.value = false
  if (objectId === currentObjectId.value) return
  recordInteraction('object')
  analytics.track('object_change', { objectId })

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
  if (encounterStatus.value !== 'idle') exitEncounter()
  if (presetId === currentPresetId.value) return
  recordInteraction('distance')
  analytics.track('distance_change', { objectId: currentObjectId.value, presetId })
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
  if (encounterStatus.value !== 'idle') exitEncounter()
  if (viewpointId === currentViewpointId.value) return
  recordInteraction('viewpoint')
  analytics.track('viewpoint_change', { viewpointId })
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
  exitEncounter(false)
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

async function runEncounterBeat(): Promise<void> {
  const beat = currentEncounterBeat.value
  if (!beat) return
  const previousObjectId = currentObjectId.value
  const previousPresetId = currentPresetId.value
  const previousViewpointId = currentViewpointId.value
  const token = ++encounterToken
  encounterTransitioning.value = true
  encounterBeatRevealed.value = false
  busy.value = true
  objectBrowserOpen.value = false

  currentObjectId.value = beat.selection.objectId
  currentPresetId.value = beat.selection.presetId
  currentViewpointId.value = beat.selection.viewpointId
  syncUrl()

  try {
    const shots: Array<Promise<void> | undefined> = []
    if (previousObjectId !== beat.selection.objectId) {
      shots.push(controller.value?.setObject(beat.selection.objectId, beat.selection.presetId))
    } else if (previousPresetId !== beat.selection.presetId) {
      shots.push(controller.value?.setDistance(beat.selection.presetId))
    }
    if (previousViewpointId !== beat.selection.viewpointId) {
      shots.push(controller.value?.setViewpoint(beat.selection.viewpointId))
    }
    await Promise.all(shots)
    if (token !== encounterToken) return
    queueHazard()
    encounterBeatRevealed.value = true
    if (currentEncounter.value) {
      analytics.track('encounter_beat', {
        encounterId: currentEncounter.value.id,
        beatIndex: encounterBeatIndex.value,
      })
    }
  } catch {
    if (token !== encounterToken) return
    notify('This encounter beat could not be loaded.')
    exitEncounter()
  } finally {
    if (token === encounterToken) {
      encounterTransitioning.value = false
      busy.value = false
    }
  }
}

function inviteEncounter(encounterId?: string): void {
  const encounter = encounterId ? encountersById[encounterId] : availableEncounter.value
  if (!encounter) return
  objectBrowserOpen.value = false
  applyEncounterSnapshot(encounterDirector.invite(encounter))
  encounterBeatRevealed.value = false
  syncUrl()
}

async function startEncounter(): Promise<void> {
  recordInteraction('encounter')
  applyEncounterSnapshot(encounterDirector.start())
  if (currentEncounter.value) analytics.track('encounter_start', { encounterId: currentEncounter.value.id })
  await runEncounterBeat()
}

async function nextEncounter(): Promise<void> {
  applyEncounterSnapshot(encounterDirector.next())
  syncUrl()
  if (encounterStatus.value === 'active') await runEncounterBeat()
  else if (encounterStatus.value === 'complete' && currentEncounter.value) {
    analytics.track('encounter_complete', { encounterId: currentEncounter.value.id })
    encounterToken += 1
    applyEncounterSnapshot(encounterDirector.exit())
    encounterTransitioning.value = false
    encounterBeatRevealed.value = false
    syncUrl()
  }
}

async function previousEncounter(): Promise<void> {
  applyEncounterSnapshot(encounterDirector.previous())
  await runEncounterBeat()
}

function toggleEncounterPause(): void {
  const snapshot = encounterStatus.value === 'paused'
    ? encounterDirector.resume()
    : encounterDirector.pause()
  applyEncounterSnapshot(snapshot)
}

async function replayEncounter(): Promise<void> {
  applyEncounterSnapshot(encounterDirector.replay())
  await runEncounterBeat()
}

function exitEncounter(sync = true): void {
  const exiting = currentEncounter.value
  const exitingBeat = encounterBeatIndex.value
  encounterToken += 1
  applyEncounterSnapshot(encounterDirector.exit())
  encounterTransitioning.value = false
  encounterBeatRevealed.value = false
  if (sync) syncUrl()
  if (sync && exiting) analytics.track('encounter_exit', { encounterId: exiting.id, beatIndex: exitingBeat })
}

function retry(canvas: HTMLCanvasElement, encounterSlug?: string): Promise<void> {
  controller.value?.dispose()
  controller.value = null
  return initialize(canvas, encounterSlug)
}

function pause(): void {
  analytics.clock.suspend()
  controller.value?.pause()
}

function resume(): void {
  analytics.clock.activity()
  controller.value?.resume()
}

function resize(width: number, height: number, dpr: number): void {
  controller.value?.resize(width, height, dpr)
}

function getObjectScreenPosition(): { x: number, y: number, onScreen: boolean } | null {
  return controller.value?.getObjectScreenPosition() ?? null
}

function captureFrame(): HTMLCanvasElement | null {
  return controller.value?.captureFrame() ?? null
}

function dispose(): void {
  if (hazardTimer) clearTimeout(hazardTimer)
  if (hintTimer) clearTimeout(hintTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
  controller.value?.dispose()
  controller.value = null
  exitEncounter(false)
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
    encounters,
    availableEncounter,
    currentEncounter: readonly(currentEncounter),
    currentEncounterBeat,
    currentDiscovery,
    encounterStatus: readonly(encounterStatus),
    encounterBeatIndex: readonly(encounterBeatIndex),
    encounterTransitioning: readonly(encounterTransitioning),
    encounterBeatRevealed: readonly(encounterBeatRevealed),
    objectBrowserOpen: readonly(objectBrowserOpen),
    loading: readonly(loading),
    loadingProgress: readonly(loadingProgress),
    busy: readonly(busy),
    pendingObjectId: readonly(pendingObjectId),
    capabilityError: readonly(capabilityError),
    notice: readonly(notice),
    hintVisible: readonly(hintVisible),
    hasInteracted: readonly(hasInteracted),
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
    inviteEncounter,
    startEncounter,
    nextEncounter,
    previousEncounter,
    toggleEncounterPause,
    replayEncounter,
    exitEncounter,
    getObjectScreenPosition,
    captureFrame,
    pause,
    resume,
    resize,
    dispose,
  }
}
